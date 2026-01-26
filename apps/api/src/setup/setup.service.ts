import {
  ConflictException,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { SettingsRepository } from '../settings/settings.repository';
import { SetupDto } from './setup.dto';

/**
 * SetupService:
 * - garante que o setup só rode uma vez
 * - aplica config inicial via SettingsService
 */
@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly repo: SettingsRepository,
  ) {}

  /**
   * Executa setup somente se ainda não foi concluído.
   * Regra:
   * - se setupCompletedAt != null => 409 Conflict
   */
  async runSetup(input: SetupDto) {
    const row = await this.repo.get();

    if (row?.setupCompletedAt) {
      throw new ConflictException('Setup already completed');
    }

    // Validação de regra (além do DTO):
    const needsPassword =
      input.authMode === 'password' || input.authMode === 'both';
    const needsTotp = input.authMode === 'totp' || input.authMode === 'both';

    if (needsPassword && !input.adminPassword) {
      throw new BadRequestException(
        'adminPassword is required for password/both modes',
      );
    }
    if (needsTotp && !input.totpSecret) {
      throw new BadRequestException(
        'totpSecret is required for totp/both modes',
      );
    }

    // 1) aplica settings normalmente (hash/encrypt etc)
    const safe = await this.settings.updateSettings({
      authMode: input.authMode,
      logLevel: input.logLevel,
      adminPassword: input.adminPassword,
      totpSecret: input.totpSecret,
    });

    // 2) marca setup como concluído
    await this.repo.upsert({
      authMode: input.authMode,
      logLevel: input.logLevel,
      setupCompletedAt: new Date(),
    });

    this.logger.log('Setup completed');
    return safe;
  }
}
