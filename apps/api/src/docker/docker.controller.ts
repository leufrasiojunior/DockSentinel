import { BadRequestException, Body, Controller, Get, Inject, Param, Post, UsePipes } from '@nestjs/common';
import { DockerService } from './docker.service';
import { DockerUpdateService } from './docker-update.service';
import Docker from 'dockerode';
import { DockerDigestService } from './docker-digest.service';
import { DOCKER_CLIENT } from './docker.constants';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { recreateBodySchema } from './docker.schema';
import { RecreateDto} from './dto/recreate.dto';

@ApiTags('Docker')
@Controller('docker')
export class DockerController {
  constructor(
    private readonly DockerService: DockerService,
    private readonly updater: DockerUpdateService,
    @Inject(DOCKER_CLIENT) private readonly docker: Docker,
    private readonly digests: DockerDigestService,
  ) {}

  @Get('containers')
  @ApiOperation({ summary: 'List all containers' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all containers.',
  })
  async containers() {
    return this.DockerService.listContainers();
  }

  @Get('containers/:id')
  @ApiOperation({ summary: 'Get container details' })
  @ApiResponse({ status: 200, description: 'Returns container details.' })
  @ApiResponse({ status: 404, description: 'Container not found.' })
  async containerDetails(@Param('id') id: string) {
    return this.DockerService.getContainerDetails(id);
  }

  @Get('containers/:id/recreate-plan')
  @ApiOperation({ summary: 'Get a recreate plan for a container' })
  @ApiResponse({ status: 200, description: 'Returns a recreate plan.' })
  @ApiResponse({ status: 404, description: 'Container not found.' })
  async recreatePlan(@Param('id') id: string) {
    return this.DockerService.buildRecreatePlan(id);
  }

  /**
   * Recria o container preservando config, mas usando a imagem informada.
   * Isso é a base do "update engine" (manual primeiro; depois vira automático).
   */
@Post("containers/:name/recreate")
@ApiOperation({ summary: "Recreate a container with a new image" })
@ApiResponse({ status: 201, description: "Container recreated successfully." })
@ApiResponse({ status: 404, description: "Container not found." })
@ApiBody({ type: RecreateDto }) // Swagger continua usando class
async recreate(
  @Param("name") name: string,
  @Body(new ZodValidationPipe(recreateBodySchema)) body: RecreateDto, // Zod valida o body
) {
    const targetFromBody = body.image?.trim();
    const force = body.force ?? false;
    const pull = body.pull ?? true;

    // 1) Descobre targetImage (se não veio no body, usa a do container)
    let targetImage = targetFromBody;
    if (!targetImage) {
      const c = this.docker.getContainer(name);
      const inspect = await c.inspect();
      targetImage = inspect?.Config?.Image;
    }

    if (!targetImage) {
      throw new BadRequestException("Unable to determine target image.");
    }

    // 2) Regra simples do MVP:
    //    - Se o user tentou trocar a imagem manualmente (body.image diferente),
    //      exige force=true (porque o hasUpdate é calculado sobre a imagem atual do container).
    const check = await this.updater.canUpdateContainer(name);

    const isChangingImage = targetFromBody && targetFromBody !== check.imageRef;
    if (isChangingImage && !force) {
      throw new BadRequestException(
        `Changing container image requires force=true (current=${check.imageRef}, requested=${targetFromBody}).`,
      );
    }

    // 3) Se NÃO está trocando imagem e a engine consegue checar local+remoto,
    //    e não tem update, retorna NOOP (não puxa, não recria)
    if (!isChangingImage && check.canCheckRemote && check.canCheckLocal && check.hasUpdate === false && !force) {
      return {
        status: "noop",
        reason: "already_up_to_date",
        container: name,
        imageRef: check.imageRef,
        remoteDigest: check.remoteDigest,
        repoDigests: check.repoDigests,
        hasUpdate: false,
      };
    }

    // 4) Se chegou aqui: tem update OU force OU troca de imagem
    return this.updater.recreateContainerWithImage(name, targetImage, { force, pull });
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
  @ApiOperation({ summary: 'Check for container image updates' })
  @ApiResponse({
    status: 200,
    description: 'Returns update check status.',
  })
  @ApiResponse({ status: 404, description: 'Container not found.' })
async updateCheck(@Param('name') name: string) {
  const c = this.docker.getContainer(name)
  const inspect = await c.inspect()

  const imageRef = inspect?.Config?.Image as string
  const localImageId = inspect?.Image as string

  const remoteDigest = await this.digests.getRemoteDigest(imageRef)

  if (!remoteDigest) {
    return {
      container: name,
      imageRef,
      localImageId,
      canCheckRemote: false,
      canCheckLocal: true,
      hasUpdate: false,
      reason: "remote_digest_not_found",
    }
  }

  const img = this.docker.getImage(localImageId)
  const imgInspect = await img.inspect()

  const repoDigests: string[] = imgInspect?.RepoDigests ?? []

  const hasUpdate = this.updater.hasUpdate(repoDigests, remoteDigest)

  return {
    container: name,
    imageRef,
    localImageId,
    remoteDigest,
    repoDigests,
    canCheckRemote: true,
    canCheckLocal: true,
    hasUpdate,
  }
}
}
