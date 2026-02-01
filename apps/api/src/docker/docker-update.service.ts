import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import type { ContainerCreateOptions } from 'dockerode';
import { DOCKER_CLIENT } from './docker.constants';
import { DockerDigestService } from './docker-digest.service';

@Injectable()
export class DockerUpdateService {
  private readonly logger = new Logger(DockerUpdateService.name);

  constructor(
    @Inject(DOCKER_CLIENT) private readonly docker: Docker,
    private readonly digests: DockerDigestService,
  ) {}

  /**
   * Regra prática v0:
   * - se o container usa bind de porta (HostPort), não dá pra subir outro em paralelo
   * - então paramos o antigo antes (downtime curto)
   */
  private hasHostPorts(portBindings: Record<string, any> | undefined): boolean {
    if (!portBindings) return false;
    return Object.values(portBindings).some(
      (arr: any) => Array.isArray(arr) && arr.some((b) => b?.HostPort),
    );
  }

  /**
   * Se o container tem IP fixo em alguma rede, geralmente você precisa parar o antigo
   * antes de criar o novo, senão o IP fica “ocupado”.
   */
  private hasStaticIps(networks: Record<string, any> | undefined): boolean {
    if (!networks) return false;
    return Object.values(networks).some((n: any) => {
      const ipv4 = (n?.IPAddress ?? '').trim();
      const ipv6 = (n?.GlobalIPv6Address ?? '').trim();
      return Boolean(ipv4 || ipv6);
    });
  }

  /**
   * Espera health ficar healthy (se existir).
   * Se a imagem não tem HEALTHCHECK, consideramos "ok" quando estiver running.
   */
  private async waitForHealthy(container: Docker.Container, timeoutMs: number) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const info = await container.inspect();

      const health = info?.State?.Health;
      if (!health) {
        if (info?.State?.Running)
          return { ok: true, reason: 'no-healthcheck' as const };
      } else {
        const status = health.Status; // starting | healthy | unhealthy
        if (status === 'healthy')
          return { ok: true, reason: 'healthy' as const };
        if (status === 'unhealthy')
          return { ok: false, reason: 'unhealthy' as const };
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    return { ok: false, reason: 'timeout' as const };
  }

async canUpdateContainer(containerName: string) {
  const c = this.docker.getContainer(containerName);
  const inspect = await c.inspect();

  const imageRef = inspect?.Config?.Image as string;
  const localImageId = inspect?.Image as string;

  // -----------------------------
  // 1) digest remoto (registry via engine)
  // -----------------------------
  let remoteDigest: string | null = null;

  try {
    remoteDigest = await this.digests.getRemoteDigest(imageRef);
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status;

    // 401/403 normalmente = registry privado / precisa auth
    if (status === 401 || status === 403) {
      return {
        container: containerName,
        imageRef,
        localImageId,
        canCheckRemote: false,
        canCheckLocal: true, // ainda podemos olhar repoDigests
        hasUpdate: false,
        reason: "registry_auth_required" as const,
      };
    }

    // outros erros: rede, engine, etc.
    return {
      container: containerName,
      imageRef,
      localImageId,
      canCheckRemote: false,
      canCheckLocal: true,
      hasUpdate: false,
      reason: "remote_digest_error" as const,
      error: err?.message ?? String(err),
    };
  }

  // tag local / imagem sem distribuição / tag inexistente no registry
  if (!remoteDigest) {
    return {
      container: containerName,
      imageRef,
      localImageId,
      canCheckRemote: false,
      canCheckLocal: true,
      hasUpdate: false,
      reason: "remote_digest_not_found" as const,
    };
  }

  // -----------------------------
  // 2) digests locais (RepoDigests)
  // -----------------------------
  let repoDigests: string[] = [];

  try {
    const img = this.docker.getImage(localImageId);
    const imgInspect = await img.inspect();
    repoDigests = imgInspect?.RepoDigests ?? [];
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status;

    // às vezes o engine responde "no such image" se imagem foi removida
    if (status === 404) {
      return {
        container: containerName,
        imageRef,
        localImageId,
        remoteDigest,
        repoDigests: [],
        canCheckRemote: true,
        canCheckLocal: false,
        hasUpdate: false,
        reason: "local_image_missing" as const,
      };
    }

    return {
      container: containerName,
      imageRef,
      localImageId,
      remoteDigest,
      repoDigests: [],
      canCheckRemote: true,
      canCheckLocal: false,
      hasUpdate: false,
      reason: "local_digest_error" as const,
      error: err?.message ?? String(err),
    };
  }

  // RepoDigests vazio = não dá pra comparar manifest digest
  if (!repoDigests.length) {
    return {
      container: containerName,
      imageRef,
      localImageId,
      remoteDigest,
      repoDigests: [],
      canCheckRemote: true,
      canCheckLocal: false,
      hasUpdate: false,
      reason: "local_repo_digests_empty" as const,
    };
  }

  // -----------------------------
  // 3) comparação final
  // -----------------------------
  const hasUpdate = this.hasUpdate(repoDigests, remoteDigest);

  return {
    container: containerName,
    imageRef,
    localImageId,
    remoteDigest,
    repoDigests,
    canCheckRemote: true,
    canCheckLocal: true,
    hasUpdate,
    reason: "ok" as const,
  };
}


  /**
   * Pull obrigatório antes de recriar:
   * - garante que a tag local realmente aponta pra versão nova.
   * - se falhar, nem começamos o processo (sem downtime).
   */
  async pullImage(
    imageRef: string,
  ): Promise<{ imageRef: string; pulledImageId?: string }> {
    this.logger.log(`Pulling image: ${imageRef}`);

    const stream = await this.docker.pull(imageRef);

    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (err: any) => (err ? reject(err) : resolve()),
        (event: any) => {
          if (event?.status) {
            const id = event?.id ? ` (${event.id})` : '';
            const prog = event?.progress ? ` ${event.progress}` : '';
            this.logger.debug(`${event.status}${id}${prog}`);
          }
        },
      );
    });

    // Depois do pull, a tag local “aponta” pra alguma imagem local.
    // Nem sempre dá pra inspecionar (dependendo do ref), mas normalmente dá.
    let pulledImageId: string | undefined;
    try {
      const img = this.docker.getImage(imageRef);
      const ii = await img.inspect();
      pulledImageId = ii?.Id;
    } catch {
      // ok: segue sem id
    }

    this.logger.log(
      `Pull completed: ${imageRef}${pulledImageId ? ` -> ${pulledImageId}` : ''}`,
    );
    return { imageRef, pulledImageId };
  }

  /**
   * Regra de “hasUpdate” usando digests:
   * - se algum RepoDigest contém o digest remoto, então NÃO há update
   */
  hasUpdate(repoDigests: string[], remoteDigest: string): boolean {
    const matches = repoDigests.some((d) => d.includes(remoteDigest));
    return !matches;
  }

  /**
   * ✅ Fluxo principal:
   * 0) pull da imagem alvo (obrigatório)
   * 1) stop (se precisar)
   * 2) rename old -> backup
   * 3) create new (mesma config + imagem nova)
   * 4) start new
   * 5) health-check
   * 6) se ok: remove backup
   * 7) se falhar: rollback
   */
  async recreateContainerWithImage(
    containerName: string,
    targetImage: string,
    opts?: { force?: boolean; pull?: boolean },
  ) {
    // 0) PULL ANTES DE QUALQUER COISA (sem downtime se falhar)
  const force = opts?.force ?? false;
  const pull = opts?.pull ?? true;

  // ✅ Só faz pull se pull=true
  const pullInfo = pull ? await this.pullImage(targetImage) : { skipped: true };

    // 1) pega container atual
    const current = this.docker.getContainer(containerName);
    const inspect = await current.inspect();

    const oldContainerId = inspect.Id;
    const oldImageRef = inspect.Config.Image;
    const oldLocalImageId = inspect.Image; // sha256 do container

    // Networks info (pra decidir stop-first se tiver IP fixo)
    const networks = inspect?.NetworkSettings?.Networks ?? {};

    // 2) monta create options preservando config principal + runtime
    const createOptions: ContainerCreateOptions = {
      name: containerName,
      Image: targetImage,

      Env: inspect.Config.Env ?? [],
      Labels: inspect.Config.Labels ?? {},
      ExposedPorts: inspect.Config.ExposedPorts ?? {},

      // Preserve detalhes úteis (muitos containers dependem disso)
      Cmd: inspect.Config.Cmd ?? undefined,
      Entrypoint: inspect.Config.Entrypoint ?? undefined,
      WorkingDir: inspect.Config.WorkingDir ?? undefined,
      User: inspect.Config.User ?? undefined,
      Hostname: inspect.Config.Hostname ?? undefined,
      Domainname: inspect.Config.Domainname ?? undefined,
      Tty: inspect.Config.Tty ?? undefined,
      OpenStdin: inspect.Config.OpenStdin ?? undefined,

      HostConfig: {
        Binds: inspect.HostConfig.Binds ?? [],
        PortBindings: inspect.HostConfig.PortBindings ?? {},
        RestartPolicy: inspect.HostConfig.RestartPolicy ?? { Name: 'no' },
        NetworkMode: inspect.HostConfig.NetworkMode ?? 'bridge',

        Privileged: inspect.HostConfig.Privileged ?? false,
        ReadonlyRootfs: inspect.HostConfig.ReadonlyRootfs ?? false,
      },
    };

    const needsStopFirst =
      this.hasHostPorts(createOptions.HostConfig?.PortBindings) ||
      this.hasStaticIps(networks);

    // 3) stop (se necessário)
    if (needsStopFirst) {
      this.logger.log(
        `Stopping container "${containerName}" before recreate (ports/ip constraints)...`,
      );
      try {
        await current.stop({ t: 10 });
      } catch {}
    }

    // 4) rename old -> backup
    const backupName = `${containerName}__backup__${Date.now()}`;
    this.logger.log(`Renaming "${containerName}" -> "${backupName}" (backup)`);
    await current.rename({ name: backupName });

    // 5) cria novo com nome original
    this.logger.log(
      `Creating new container "${containerName}" with image "${targetImage}"`,
    );
    const created = await this.docker.createContainer(createOptions);

    try {
      // 6) start novo
      this.logger.log(`Starting new container "${containerName}"`);
      await created.start();

      // 7) health-check / running
      const healthTimeoutMs = Number(process.env.HEALTH_TIMEOUT_MS ?? 60_000);
      const health = await this.waitForHealthy(created, healthTimeoutMs);

      if (!health.ok) {
        throw new Error(`Health-check failed: ${health.reason}`);
      }

      // (debug útil) inspeciona novo container e pega o ImageId real
      const newInspect = await created.inspect();
      const newLocalImageId = newInspect.Image;

      // 8) sucesso -> remove backup antigo
      this.logger.log(
        `New container OK (${health.reason}). Removing backup "${backupName}"...`,
      );
      const backup = this.docker.getContainer(backupName);

      try {
        await backup.stop({ t: 10 });
      } catch {}
      await backup.remove({ force: true });

      return {
        status: 'success',
        pull: pullInfo,
        old: {
          containerId: oldContainerId,
          imageRef: oldImageRef,
          localImageId: oldLocalImageId,
        },
        new: {
          containerId: newInspect.Id,
          imageRef: targetImage,
          localImageId: newLocalImageId,
        },
        health: health.reason,
        didChangeImageId: oldLocalImageId !== newLocalImageId,
      };
    } catch (err: any) {
      // rollback
      this.logger.error(
        `Update failed. Rolling back... Reason: ${err?.message ?? err}`,
      );

      // remove o novo (se existir)
      try {
        await created.stop({ t: 10 });
      } catch {}
      try {
        await created.remove({ force: true });
      } catch {}

      // renomeia backup de volta e sobe
      const backup = this.docker.getContainer(backupName);
      this.logger.warn(
        `Restoring backup name "${backupName}" -> "${containerName}"`,
      );
      await backup.rename({ name: containerName });

      try {
        this.logger.warn(`Starting restored container "${containerName}"`);
        await backup.start();
      } catch (e) {
        this.logger.error(`Rollback start failed: ${String(e)}`);
      }

      return {
        status: 'rolled_back',
        pull: pullInfo,
        old: {
          containerId: oldContainerId,
          imageRef: oldImageRef,
          localImageId: oldLocalImageId,
        },
        attemptedImage: targetImage,
        error: err?.message ?? String(err),
      };
    }
  }
}
