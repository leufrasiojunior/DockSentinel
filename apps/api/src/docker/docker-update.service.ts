import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import type { ContainerCreateOptions } from 'dockerode';

@Injectable()
export class DockerUpdateService {
  private readonly logger = new Logger(DockerUpdateService.name);

  // dockerode conecta no /var/run/docker.sock (o DockSentinel roda no host com o socket montado)
  private readonly docker = new Docker({ socketPath: '/var/run/docker.sock' });

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
   * Espera health ficar healthy (se existir).
   * Se a imagem não tem HEALTHCHECK, a gente considera "ok" quando estiver running.
   */
  private async waitForHealthy(container: Docker.Container, timeoutMs: number) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const info = await container.inspect();

      // Se não existe Health, não tem o que aguardar -> consideramos sucesso se estiver running
      const health = info?.State?.Health;
      if (!health) {
        if (info?.State?.Running)
          return { ok: true, reason: 'no-healthcheck' as const };
        // ainda não está running; espera um pouco
      } else {
        const status = health.Status; // "starting" | "healthy" | "unhealthy"
        if (status === 'healthy')
          return { ok: true, reason: 'healthy' as const };
        if (status === 'unhealthy')
          return { ok: false, reason: 'unhealthy' as const };
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    return { ok: false, reason: 'timeout' as const };
  }

  /**
   * ✅ Fluxo principal:
   * - stop (se precisar)
   * - rename old -> backup
   * - create new (mesma config + imagem nova)
   * - start new
   * - health-check (obrigatório: se tiver HEALTHCHECK, vamos respeitar; senão, "running" basta)
   * - se falhar: remove new + rollback (rename + start old)
   */
  async recreateContainerWithImage(containerName: string, targetImage: string) {
    // 1) pega container
    const current = this.docker.getContainer(containerName);
    const inspect = await current.inspect();

    const oldId = inspect.Id;
    const oldImage = inspect.Config.Image;

    // 2) monta create options preservando config principal
    // Observação: dockerode usa o formato do Docker Engine API para create container.
    const createOptions: ContainerCreateOptions = {
      name: containerName,

      // imagem nova
      Image: targetImage,

      // env, labels, exposed ports
      Env: inspect.Config.Env ?? [],
      Labels: inspect.Config.Labels ?? {},
      ExposedPorts: inspect.Config.ExposedPorts ?? {},

      // HostConfig tem binds, port bindings, restart policy, etc.
      HostConfig: {
        Binds: inspect.HostConfig.Binds ?? [],
        PortBindings: inspect.HostConfig.PortBindings ?? {},
        RestartPolicy: inspect.HostConfig.RestartPolicy ?? { Name: 'no' },
        NetworkMode: inspect.HostConfig.NetworkMode ?? 'bridge',

        // também preserva outros campos úteis se existirem
        Privileged: inspect.HostConfig.Privileged ?? false,
        ReadonlyRootfs: inspect.HostConfig.ReadonlyRootfs ?? false,
      },

      // Networks: no create, dá pra passar NetworkingConfig.
      // (v0: vamos criar no NetworkMode do HostConfig e depois conectar em redes extras se necessário)
    };

    const portBindings = createOptions.HostConfig?.PortBindings;
    const needsStopFirst = this.hasHostPorts(portBindings);

    // 3) stop (se necessário)
    if (needsStopFirst) {
      this.logger.log(
        `Stopping container "${containerName}" due to host port bindings...`,
      );
      try {
        await current.stop({ t: 10 });
      } catch (e) {
        // se já estiver parado, ok
      }
    }

    // 4) rename old -> backup
    const backupName = `${containerName}__backup__${Date.now()}`;
    this.logger.log(`Renaming "${containerName}" -> "${backupName}" (backup)`);
    await current.rename({ name: backupName }); // docker rename :contentReference[oaicite:2]{index=2}

    // 5) cria novo com nome original
    this.logger.log(
      `Creating new container "${containerName}" with image "${targetImage}"`,
    );
    const created = await this.docker.createContainer(createOptions);

    try {
      // 6) start novo
      this.logger.log(`Starting new container "${containerName}"`);
      await created.start(); // start container :contentReference[oaicite:3]{index=3}

      // 7) health-check / running
      const healthTimeoutMs = Number(process.env.HEALTH_TIMEOUT_MS ?? 60_000);
      const health = await this.waitForHealthy(created, healthTimeoutMs);

      if (!health.ok) {
        throw new Error(`Health-check failed: ${health.reason}`);
      }

      // 8) sucesso -> remove backup antigo
      this.logger.log(
        `New container OK (${health.reason}). Removing backup "${backupName}"...`,
      );
      const backup = this.docker.getContainer(backupName);

      try {
        // garante parado antes de remover
        await backup.stop({ t: 10 });
      } catch {}

      await backup.remove({ force: true });

      const newInspect = await created.inspect();
      return {
        status: 'success',
        old: { id: oldId, image: oldImage },
        new: { id: newInspect.Id, image: targetImage },
        health: health.reason,
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

      // renomeia backup de volta pro nome original e sobe ele
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
        old: { id: oldId, image: oldImage },
        attemptedImage: targetImage,
        error: err?.message ?? String(err),
      };
    }
  }

  // docker-update.service.ts
  hasUpdate(repoDigests: string[], remoteDigest: string): boolean {
    // Se algum RepoDigest contém o digest remoto, então NÃO há update
    const matches = repoDigests.some((d) => d.includes(remoteDigest));
    return !matches;
  }
}
