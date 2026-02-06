import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { DockerService } from './docker.service';
import { DockerUpdateService } from './docker-update.service';
import Docker from 'dockerode';
import { DockerDigestService } from './docker-digest.service';
import { DOCKER_CLIENT } from './docker.constants';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { recreateBodySchema } from './docker.schema';
import { RecreateDto } from './dto/recreate.dto';
import { updateBodySchema, UpdateDto } from './dto/update.dto';
import { ContainerDetailsDto } from './dto/container-details.dto';
import { RecreatePlanDto } from './dto/recreate-plan.dto';
import { ContainerSummaryDto } from './dto/container-summary.dto';
import { ContainerUpdateCheckDto } from './dto/update-check.dto';
import {
  ContainerRecreateNoopDto,
  ContainerUpdateResultRolledBackDto,
  ContainerUpdateResultSuccessDto,
  UpdateContainerNoopDto,
  UpdateContainerResultDto,
} from './dto/update-result.dto';

@ApiTags('Docker')
@ApiExtraModels(
  ContainerUpdateResultSuccessDto,
  ContainerUpdateResultRolledBackDto,
  ContainerRecreateNoopDto,
  UpdateContainerNoopDto,
  UpdateContainerResultDto,
  ContainerUpdateCheckDto,
)
@Controller('docker')
export class DockerController {
  constructor(
    private readonly DockerService: DockerService,
    private readonly updater: DockerUpdateService,
    @Inject(DOCKER_CLIENT) private readonly docker: Docker,
    private readonly digests: DockerDigestService,
  ) {}

  @Get('containers')
  @ApiOperation({ summary: 'Listar containers' })
  @ApiOkResponse({
    description: 'Lista de containers.',
    type: ContainerSummaryDto,
    isArray: true,
  })
  async containers() {
    return this.DockerService.listContainers();
  }

  @Get('containers/:id')
  @ApiOperation({ summary: 'Obter detalhes do container' })
  @ApiParam({ name: 'id', description: 'ID ou nome do container' })
  @ApiOkResponse({
    description: 'Detalhes do container.',
    type: ContainerDetailsDto,
  })
  @ApiNotFoundResponse({ description: 'Container não encontrado.' })
  async containerDetails(@Param('id') id: string) {
    return this.DockerService.getContainerDetails(id);
  }

  @Get('containers/:id/recreate-plan')
  @ApiOperation({ summary: 'Obter plano de recriação do container' })
  @ApiParam({ name: 'id', description: 'ID ou nome do container' })
  @ApiOkResponse({
    description: 'Plano de recriação do container.',
    type: RecreatePlanDto,
  })
  @ApiNotFoundResponse({ description: 'Container não encontrado.' })
  async recreatePlan(@Param('id') id: string) {
    return this.DockerService.buildRecreatePlan(id);
  }

  /**
   * Recria o container preservando config, mas usando a imagem informada.
   * Isso é a base do "update engine" (manual primeiro; depois vira automático).
   */
  @Post('containers/:name/recreate')
  @ApiOperation({ summary: 'Recriar container com nova imagem' })
  @ApiParam({ name: 'name', description: 'Nome do container' })
  @ApiBody({ type: RecreateDto })
  @ApiCreatedResponse({
    description: 'Resultado da recriação.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(ContainerRecreateNoopDto) },
        { $ref: getSchemaPath(ContainerUpdateResultSuccessDto) },
        { $ref: getSchemaPath(ContainerUpdateResultRolledBackDto) },
      ],
    },
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Container não encontrado.' })
  async recreate(
    @Param('name') name: string,
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
      throw new BadRequestException('Unable to determine target image.');
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
    if (
      !isChangingImage &&
      check.canCheckRemote &&
      check.canCheckLocal &&
      check.hasUpdate === false &&
      !force
    ) {
      return {
        status: 'noop',
        reason: 'already_up_to_date',
        container: name,
        imageRef: check.imageRef,
        remoteDigest: check.remoteDigest,
        repoDigests: check.repoDigests,
        hasUpdate: false,
      };
    }

    // 4) Se chegou aqui: tem update OU force OU troca de imagem
    return this.updater.recreateContainerWithImage(name, targetImage, {
      force,
      pull,
    });
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
  @ApiOperation({ summary: 'Checar atualização de imagem do container' })
  @ApiParam({ name: 'name', description: 'Nome do container' })
  @ApiOkResponse({
    description: 'Resultado da checagem de update.',
    type: ContainerUpdateCheckDto,
  })
  @ApiNotFoundResponse({ description: 'Container não encontrado.' })
  async updateCheck(@Param('name') name: string) {
    const c = this.docker.getContainer(name);
    const inspect = await c.inspect();

    const imageRef = inspect?.Config?.Image as string;
    const localImageId = inspect?.Image as string;

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

    const img = this.docker.getImage(localImageId);
    const imgInspect = await img.inspect();

    const repoDigests: string[] = imgInspect?.RepoDigests ?? [];

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

  @Post('containers/:name/update')
  @ApiOperation({
    summary: 'Update orquestrado: check + pull + recreate (se necessário)',
  })
  @ApiParam({ name: 'name', description: 'Nome do container' })
  @ApiBody({ type: UpdateDto })
  @ApiOkResponse({
    description: 'Resultado do update (noop ou execução).',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(UpdateContainerNoopDto) },
        { $ref: getSchemaPath(UpdateContainerResultDto) },
      ],
    },
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Container não encontrado.' })
  async updateContainer(
    @Param('name') name: string,
    @Body(new ZodValidationPipe(updateBodySchema)) body: UpdateDto,
  ) {
    const force = body.force ?? false;
    const pull = body.pull ?? true;

    // 1) Faz o check no servidor (fonte da verdade)
    const check = await this.updater.canUpdateContainer(name);

    // 2) Se não dá pra checar remoto (tag local / registry inacessível etc)
    //    - MVP recomendado: não atualiza a menos que force=true
    if (!check.canCheckRemote) {
      if (!force) {
        return {
          status: 'noop',
          reason: check.reason ?? 'cannot_check_remote',
          container: name,
          check,
        };
      }
      // force=true: continua e tenta recriar usando a mesma imageRef do container
    }

    // 3) Se dá pra checar e já está ok, devolve NOOP
    if (
      check.canCheckRemote &&
      check.canCheckLocal &&
      check.hasUpdate === false &&
      !force
    ) {
      return {
        status: 'noop',
        reason: 'already_up_to_date',
        container: name,
        check,
      };
    }

    // 4) Aqui: tem update OU force
    //    Atualiza usando a MESMA tag do container (imageRef atual)
    const targetImage = check.imageRef;
    if (!targetImage) {
      throw new BadRequestException(
        'Unable to determine container imageRef for update.',
      );
    }

    const result = await this.updater.recreateContainerWithImage(
      name,
      targetImage,
      { force, pull },
    );

    // (Opcional) re-check para o front já receber a confirmação final:
    const after = await this.updater.canUpdateContainer(name).catch(() => null);

    return {
      status: result.status,
      container: name,
      targetImage,
      checkBefore: check,
      result,
      checkAfter: after,
    };
  }
}
