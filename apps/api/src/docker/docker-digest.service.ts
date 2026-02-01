import { Inject, Injectable, Logger } from "@nestjs/common"
import Docker from "dockerode"
import { DOCKER_CLIENT } from "./docker.constants"

@Injectable()
export class DockerDigestService {
  private readonly logger = new Logger(DockerDigestService.name)

  constructor(@Inject(DOCKER_CLIENT) private readonly docker: Docker) {}

  /**
   * Busca o digest remoto do registry via Docker Engine:
   * /distribution/{name}/json
   *
   * Retorna string (sha256:...) ou null quando a tag não existe no registry (404).
   */
  async getRemoteDigest(imageRef: string): Promise<string | null> {
    const encoded = encodeURIComponent(imageRef)
    const path = `/distribution/${encoded}/json`

    let data: any
    try {
      data = await this.dialEngineJson(path)
    } catch (err: any) {
      const status = err?.statusCode ?? err?.status
      if (status === 404) {
        this.logger.warn(
          `Distribution not found for ${imageRef} (404). Provavelmente é uma tag só local.`,
        )
        return null
      }
      throw err
    }


    // Estrutura típica: data.Descriptor.Digest
    const digest = data?.Descriptor?.digest ?? data?.Descriptor?.Digest;
    if (!digest || typeof digest !== "string") {
      throw new Error(`Remote digest not found for imageRef=${imageRef}`)
    }
    return digest
  }

  /**
   * Chamada raw na Docker Engine API via modem.
   * IMPORTANTE: passar statusCodes, senão o docker-modem pode quebrar ao receber 404.
   */
  private dialEngineJson(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.docker.modem.dial(
        {
          method: "GET",
          path,
          // ✅ evita o crash do docker-modem quando statusCodes é undefined
          // e ainda nos dá um erro “bonito” com statusCode=404 para tratarmos acima.
          statusCodes: {
            200: true,
            404: "not found",
          },
        },
        (err: any, body: any) => {
          if (err) return reject(err)

          try {
            const parsed = typeof body === "string" ? JSON.parse(body) : body
            resolve(parsed)
          } catch (e) {
            reject(e)
          }
        },
      )
    })
  }
}
