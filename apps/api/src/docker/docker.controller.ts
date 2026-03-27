import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { DockerService } from './docker.service';
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
import { NotificationsService } from '../notifications/notifications.service';
import { DockerOperationsService } from './docker-operations.service';

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
    private readonly operations: DockerOperationsService,
    private readonly notifications: NotificationsService,
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
    return this.operations.recreateContainer(name, body);
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
    try {
      const result = await this.operations.updateCheck(name);
      if (!result.canCheckRemote) {
        await this.notifications.emitScanError({
          mode: 'manual_check',
          scanned: 1,
          errors: 1,
          container: name,
          imageRef: result.imageRef,
          reason: 'remote_digest_not_found',
          scannedImages: [`${name} => ${result.imageRef}`],
          updateCandidates: [],
        });
      }

      await this.notifications.emitScanInfo({
        mode: 'manual_check',
        scanned: 1,
        scannedImages: [`${name} => ${result.imageRef}`],
        updateCandidates: result.hasUpdate ? [`${name} => ${result.imageRef}`] : [],
      });

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.notifications.emitSystemError(`Falha em update-check manual: ${name} -> ${msg}`, {
        container: name,
      });
      throw err;
    }
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
    return this.operations.updateContainer(name, body);
  }
}
