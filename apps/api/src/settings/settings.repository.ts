import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Patch "plano": somente campos do modelo GlobalSettings.
 * (Nada de { update: {...}, create: {...} } aqui.)
 */
export type SettingsPatch = {
  authMode?: string;
  adminPasswordHash?: string | null;
  totpSecretEnc?: string | null;
  logLevel?: string;
  defaultLocale?: "pt-BR" | "en-US";
  notificationsInAppEnabled?: boolean;
  notificationsEmailEnabled?: boolean;
  notificationLevel?: "all" | "errors_only";
  notificationReadRetentionDays?: number;
  notificationUnreadRetentionDays?: number;
  environmentHealthcheckIntervalMin?: number;
  notificationRecipientEmail?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecureMode?: "starttls" | "tls";
  smtpUsername?: string | null;
  smtpPasswordEnc?: string | null;
  smtpFromName?: string | null;
  smtpFromEmail?: string | null;
};

export type RegistryCredentialRow = {
  id: string;
  name: string;
  serverAddress: string;
  username: string;
  passwordEnc: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type RawRegistryRow = {
  id: string;
  name: string;
  serverAddress: string;
  username: string;
  passwordEnc: string;
  enabled: number | boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    return this.prisma.client.globalSettings.findUnique({
      where: { id: 1 },
    });
  }

  /**
   * Upsert: se não existir cria; se existir atualiza.
   * Prisma exige `create` e `update` no formato plano.
   */
  async upsert(patch: SettingsPatch) {
    return this.prisma.client.globalSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...patch },
      update: patch,
    });
  }

  private mapRegistryRow(row: RawRegistryRow): RegistryCredentialRow {
    return {
      id: row.id,
      name: row.name,
      serverAddress: row.serverAddress,
      username: row.username,
      passwordEnc: row.passwordEnc,
      enabled: Boolean(row.enabled),
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt),
    };
  }

  async listRegistries(): Promise<RegistryCredentialRow[]> {
    const rows = await this.prisma.client.$queryRawUnsafe<RawRegistryRow[]>(
      `SELECT "id", "name", "serverAddress", "username", "passwordEnc", "enabled", "createdAt", "updatedAt"
       FROM "RegistryCredential"
       ORDER BY "createdAt" ASC`,
    );
    return rows.map((row) => this.mapRegistryRow(row));
  }

  async findRegistryById(id: string): Promise<RegistryCredentialRow | null> {
    const rows = await this.prisma.client.$queryRawUnsafe<RawRegistryRow[]>(
      `SELECT "id", "name", "serverAddress", "username", "passwordEnc", "enabled", "createdAt", "updatedAt"
       FROM "RegistryCredential"
       WHERE "id" = ?
       LIMIT 1`,
      id,
    );
    return rows[0] ? this.mapRegistryRow(rows[0]) : null;
  }

  async findRegistryByServerAddress(
    serverAddress: string,
  ): Promise<RegistryCredentialRow | null> {
    const rows = await this.prisma.client.$queryRawUnsafe<RawRegistryRow[]>(
      `SELECT "id", "name", "serverAddress", "username", "passwordEnc", "enabled", "createdAt", "updatedAt"
       FROM "RegistryCredential"
       WHERE "serverAddress" = ?
       LIMIT 1`,
      serverAddress,
    );
    return rows[0] ? this.mapRegistryRow(rows[0]) : null;
  }

  async createRegistry(data: {
    name: string;
    serverAddress: string;
    username: string;
    passwordEnc: string;
    enabled: boolean;
  }): Promise<RegistryCredentialRow> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.prisma.client.$executeRawUnsafe(
      `INSERT INTO "RegistryCredential" ("id", "name", "serverAddress", "username", "passwordEnc", "enabled", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.serverAddress,
      data.username,
      data.passwordEnc,
      data.enabled ? 1 : 0,
      now,
      now,
    );
    const created = await this.findRegistryById(id);
    if (!created) {
      throw new Error('Failed to load created registry credential');
    }
    return created;
  }

  async updateRegistry(
    id: string,
    data: {
      name: string;
      serverAddress: string;
      username: string;
      passwordEnc: string;
      enabled: boolean;
    },
  ): Promise<RegistryCredentialRow> {
    const now = new Date().toISOString();
    await this.prisma.client.$executeRawUnsafe(
      `UPDATE "RegistryCredential"
       SET "name" = ?, "serverAddress" = ?, "username" = ?, "passwordEnc" = ?, "enabled" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      data.name,
      data.serverAddress,
      data.username,
      data.passwordEnc,
      data.enabled ? 1 : 0,
      now,
      id,
    );
    const updated = await this.findRegistryById(id);
    if (!updated) {
      throw new Error('Failed to load updated registry credential');
    }
    return updated;
  }

  async deleteRegistry(id: string): Promise<void> {
    await this.prisma.client.$executeRawUnsafe(
      `DELETE FROM "RegistryCredential" WHERE "id" = ?`,
      id,
    );
  }
}
