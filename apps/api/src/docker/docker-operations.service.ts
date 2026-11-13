import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common"
import Docker from "dockerode"
import { t } from "../i18n/translate"
import { SettingsService } from "../settings/settings.service"
import { DOCKER_CLIENT } from "./docker.constants"
import { DockerUpdateService } from "./docker-update.service"
import { RecreateDto } from "./dto/recreate.dto"
import { UpdateDto } from "./dto/update.dto"

@Injectable()
export class DockerOperationsService {
  constructor(
    @Inject(DOCKER_CLIENT) private readonly docker: Docker,
    private readonly updater: DockerUpdateService,
    @Optional() private readonly settings?: SettingsService,
  ) {}

  private async getAuthEntries() {
    if (!this.settings) return []
    return this.settings.getEnabledRegistryAuthEntries()
  }

  async updateCheck(name: string) {
    const authEntries = await this.getAuthEntries()
    return this.updater.canUpdateContainer(name, authEntries)
  }

  async recreateContainer(name: string, body: RecreateDto) {
    const targetFromBody = body.image?.trim()
    const force = body.force ?? false
    const pull = body.pull ?? true

    let targetImage = targetFromBody
    if (!targetImage) {
      const c = this.docker.getContainer(name)
      const inspect = await c.inspect()
      targetImage = inspect?.Config?.Image
    }

    if (!targetImage) {
      throw new BadRequestException(t("docker.targetImageRequired"))
    }

    const authEntries = await this.getAuthEntries()
    const check = await this.updater.canUpdateContainer(name, authEntries)
    const isChangingImage = targetFromBody && targetFromBody !== check.imageRef

    if (isChangingImage && !force) {
      throw new BadRequestException(
        t("docker.forceRequiredForImageChange", {
          current: check.imageRef,
          requested: targetFromBody,
        }),
      )
    }

    if (
      !isChangingImage &&
      check.canCheckRemote &&
      check.canCheckLocal &&
      check.hasUpdate === false &&
      !force
    ) {
      return {
        status: "noop" as const,
        reason: "already_up_to_date",
        container: name,
        imageRef: check.imageRef,
        remoteDigest: check.remoteDigest,
        repoDigests: check.repoDigests,
        hasUpdate: false,
      }
    }

    return this.updater.recreateContainerWithImage(name, targetImage, {
      force,
      pull,
      authEntries,
    })
  }

  async updateContainer(name: string, body: UpdateDto) {
    const force = body.force ?? false
    const pull = body.pull ?? true
    const authEntries = await this.getAuthEntries()
    const check = await this.updater.canUpdateContainer(name, authEntries)

    if (!check.canCheckRemote) {
      if (!force) {
        return {
          status: "noop" as const,
          reason: check.reason ?? "cannot_check_remote",
          container: name,
          check,
        }
      }
    }

    if (
      check.canCheckRemote &&
      check.canCheckLocal &&
      check.hasUpdate === false &&
      !force
    ) {
      return {
        status: "noop" as const,
        reason: "already_up_to_date",
        container: name,
        check,
      }
    }

    const targetImage = check.imageRef
    if (!targetImage) {
      throw new BadRequestException(t("docker.imageRefRequired"))
    }

    const result = await this.updater.recreateContainerWithImage(
      name,
      targetImage,
      { force, pull, authEntries },
    )

    const after =
      result.status === "success"
        ? {
            ...check,
            localImageId: result.new.localImageId,
            hasUpdate: false,
            reason: "ok" as const,
          }
        : null

    return {
      status: result.status,
      container: name,
      targetImage,
      checkBefore: check,
      result,
      checkAfter: after,
    }
  }
}
