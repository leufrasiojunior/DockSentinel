import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { DockerService } from './docker.service';
import { DockerUpdateService } from './docker-update.service';
import Docker from 'dockerode';
import { DockerDigestService } from './docker-digest.service';
import { DOCKER_CLIENT } from './docker.constants';

@Controller('docker')
export class DockerController {
  constructor(
    private readonly DockerService: DockerService,
    private readonly updater: DockerUpdateService,
    @Inject(DOCKER_CLIENT) private readonly docker: Docker,
    private readonly digests: DockerDigestService,
  ) {}

  @Get('containers')
  async containers() {
    return this.DockerService.listContainers();
  }

  @Get('containers/:id')
  async containerDetails(@Param('id') id: string) {
    return this.DockerService.getContainerDetails(id);
  }

  @Get('containers/:id/recreate-plan')
  async recreatePlan(@Param('id') id: string) {
    return this.DockerService.buildRecreatePlan(id);
  }

  /**
   * Recria o container preservando config, mas usando a imagem informada.
   * Isso é a base do "update engine" (manual primeiro; depois vira automático).
   */
  @Post('containers/:name/recreate')
  async recreate(@Param('name') name: string, @Body() body: { image: string }) {
    return this.updater.recreateContainerWithImage(name, body.image);
  }

  /**
   * GET /docker/containers/:name/update-check
   *
   * Retorna:
   * - imageRef (tag)
   * - localImageId (id da imagem local)
   * - remoteDigest (digest do registry)
   * - hasUpdate (se remote digest != algum digest local conhecido)
   *
   * Observação: tags tipo "latest" podem mudar sem aviso, então digest é o jeito certo.
   */
@Get('containers/:name/update-check')
async updateCheck(@Param('name') name: string) {
  const c = this.docker.getContainer(name);
  const inspect = await c.inspect();

  const imageRef = inspect?.Config?.Image as string;   // ex "localhost:5000/docksentinel-nginx:stable"
  const localImageId = inspect?.Image as string;       // ex "sha256:...."

  const remoteDigest = await this.digests.getRemoteDigest(imageRef);

  if (!remoteDigest) {
    return {
      container: name,
      imageRef,
      localImageId,
      canCheckRemote: false,
      canCheckLocal: true,
      hasUpdate: false,
      reason: 'remote_digest_not_found',
    };
  }

let repoDigests: string[] = [];
try {
  const imgInspect = await this.docker.getImage(localImageId).inspect();
  repoDigests = imgInspect?.RepoDigests ?? [];
} catch (err: any) {
  const status = err?.statusCode ?? err?.status;
  if (status === 404) {
    return {
      container: name,
      imageRef,
      localImageId,
      remoteDigest,
      canCheckRemote: true,
      canCheckLocal: false,
      hasUpdate: null, // <= importante: “desconhecido”
      reason: "local_image_not_found_for_container_image_id",
      hint: "O container está rodando, mas o Docker Engine não tem mais metadata da imagem. Recrie o container ou faça pull da tag original.",
    };
  }
  throw err;
}
  let localImageMissing = false;

  try {
    const img = this.docker.getImage(localImageId);
    const imgInspect = await img.inspect();
    repoDigests = imgInspect?.RepoDigests ?? [];
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status;
    if (status === 404) {
      localImageMissing = true;
    } else {
      throw err;
    }
  }

  if (localImageMissing) {
    return {
      container: name,
      imageRef,
      localImageId,
      remoteDigest,
      repoDigests: [],
      canCheckRemote: true,
      canCheckLocal: false,
      hasUpdate: false,
      reason: 'local_image_not_found_for_container_image_id',
      hint: 'A imagem local do ID usado pelo container não está disponível no Docker Engine. Verifique se a API está usando o mesmo docker.sock do host.',
    };
  }

  // ✅ use o método centralizado (não use !matches)
  const hasUpdate = this.updater.hasUpdate(repoDigests, remoteDigest);

  return {
    container: name,
    imageRef,
    localImageId,
    remoteDigest,
    repoDigests,
    canCheckRemote: true,
    canCheckLocal: true,
    hasUpdate,
  };
}
}
