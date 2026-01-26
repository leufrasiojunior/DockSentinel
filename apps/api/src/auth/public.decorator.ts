import { SetMetadata } from "@nestjs/common"

/**
 * Metadata key usada pelo guard global para saber se a rota é pública.
 * Se for pública, NÃO exige autenticação mesmo com auth ligado.
 */
export const IS_PUBLIC_KEY = "isPublic"

/**
 * @Public()
 * Marca uma rota (controller ou handler) como pública.
 *
 * Baseado no padrão comum do Nest:
 * - criar metadata e checar no guard usando Reflector.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
