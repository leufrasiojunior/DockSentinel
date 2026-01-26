import { Injectable } from "@nestjs/common"
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

/**
 * CryptoService:
 * - criptografa/decriptografa strings para armazenar em DB
 * - usa AES-256-GCM (confidencialidade + integridade)
 *
 * Entrada:
 * - DOCKSENTINEL_SECRET: uma string forte definida via ENV
 *
 * Importante:
 * - Não armazenamos a chave no banco
 * - Se a chave mudar, dados antigos não serão decriptáveis (comportamento esperado)
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer

  constructor() {
    const secret = process.env.DOCKSENTINEL_SECRET
    if (!secret || secret.trim().length < 32) {
      // 32 chars mínimo como regra prática
      throw new Error("DOCKSENTINEL_SECRET missing or too short (min 32 chars)")
    }

    /**
     * Derivação da chave:
     * - AES-256 precisa de 32 bytes.
     * - Transformamos a string do ENV em 32 bytes via SHA-256.
     */
    this.key = createHash("sha256").update(secret).digest()
  }

  /**
   * Criptografa uma string e retorna um payload serializado.
   */
  encrypt(plain: string): string {
    const iv = randomBytes(12) // recomendado p/ GCM
    const cipher = createCipheriv("aes-256-gcm", this.key, iv)

    const cipherText = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
    const tag = cipher.getAuthTag()

    return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${cipherText.toString("base64")}`
  }

  /**
   * Decripta payload no formato v1:iv:tag:cipherText
   */
  decrypt(payload: string): string {
    const [version, ivB64, tagB64, dataB64] = payload.split(":")
    if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
      throw new Error("Invalid encrypted payload format")
    }

    const iv = Buffer.from(ivB64, "base64")
    const tag = Buffer.from(tagB64, "base64")
    const data = Buffer.from(dataB64, "base64")

    const decipher = createDecipheriv("aes-256-gcm", this.key, iv)
    decipher.setAuthTag(tag)

    const plain = Buffer.concat([decipher.update(data), decipher.final()])
    return plain.toString("utf8")
  }
}
