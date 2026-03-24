import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { t } from "../i18n/translate"

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureExists(id: string) {
    const existing = await this.prisma.client.notificationEvent.findUnique({
      where: { id },
      select: { id: true, readAt: true },
    })

    if (!existing) throw new NotFoundException(t("notifications.notFound", { id }))
    return existing
  }

  async createInApp(input: {
    type: string
    level: "info" | "error"
    title: string
    message: string
    payloadJson?: string | null
  }) {
    return this.prisma.client.notificationEvent.create({
      data: {
        channel: "in_app",
        type: input.type,
        level: input.level,
        title: input.title,
        message: input.message,
        payloadJson: input.payloadJson ?? null,
      },
    })
  }

  async listForClient(params: { afterId?: string; take: number }) {
    const take = Math.max(1, Math.min(params.take, 100))

    if (!params.afterId) {
      return this.prisma.client.notificationEvent.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
      })
    }

    const after = await this.prisma.client.notificationEvent.findUnique({
      where: { id: params.afterId },
      select: { createdAt: true, id: true },
    })

    // Se o cursor não existir mais (limpeza/retenção), volta para últimas N.
    if (!after) {
      return this.prisma.client.notificationEvent.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
      })
    }

    return this.prisma.client.notificationEvent.findMany({
      where: {
        OR: [
          { createdAt: { gt: after.createdAt } },
          {
            createdAt: after.createdAt,
            id: { gt: after.id },
          },
        ],
      },
      // incremental feed keeps chronological order when cursor is provided
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take,
    })
  }

  async markRead(id: string) {
    const existing = await this.ensureExists(id)
    if (existing.readAt) return { ok: true as const }

    await this.prisma.client.notificationEvent.update({
      where: { id },
      data: { readAt: new Date() },
    })
    return { ok: true as const }
  }

  async markUnread(id: string) {
    const existing = await this.ensureExists(id)
    if (!existing.readAt) return { ok: true as const }

    await this.prisma.client.notificationEvent.update({
      where: { id },
      data: { readAt: null },
    })
    return { ok: true as const }
  }

  async markAllRead() {
    const now = new Date()
    const result = await this.prisma.client.notificationEvent.updateMany({
      where: { readAt: null },
      data: { readAt: now },
    })
    return { ok: true as const, affected: result.count }
  }

  async deleteOne(id: string) {
    await this.ensureExists(id)

    await this.prisma.client.notificationEvent.delete({
      where: { id },
    })

    return { ok: true as const }
  }

  async deleteMany(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.map((value) => value.trim()).filter(Boolean)))

    if (uniqueIds.length === 0) return { ok: true as const, affected: 0 }

    const result = await this.prisma.client.notificationEvent.deleteMany({
      where: {
        id: {
          in: uniqueIds,
        },
      },
    })

    return { ok: true as const, affected: result.count }
  }

  async cleanupExpired(readDays: number, unreadDays: number) {
    const now = Date.now()
    const readBefore = new Date(now - readDays * 24 * 60 * 60 * 1000)
    const unreadBefore = new Date(now - unreadDays * 24 * 60 * 60 * 1000)

    const result = await this.prisma.client.notificationEvent.deleteMany({
      where: {
        OR: [
          {
            readAt: {
              not: null,
              lt: readBefore,
            },
          },
          {
            readAt: null,
            createdAt: {
              lt: unreadBefore,
            },
          },
        ],
      },
    })

    return { removed: result.count }
  }
}
