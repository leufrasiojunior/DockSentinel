import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common"
import type { Response } from "express"
import { t } from "../../i18n/translate"

type ErrorPayload = {
  statusCode: number
  message: string
  code?: string
  issues?: unknown
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    const payload = this.normalizeException(exception)
    response.status(payload.statusCode).json(payload)
  }

  private normalizeException(exception: unknown): ErrorPayload {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: t("errors.internalServerError"),
        code: "INTERNAL_SERVER_ERROR",
      }
    }

    const statusCode = exception.getStatus()
    const response = exception.getResponse()

    if (typeof response === "string") {
      return {
        statusCode,
        message: response,
      }
    }

    if (!response || typeof response !== "object") {
      return {
        statusCode,
        message: exception.message || this.defaultMessage(statusCode),
      }
    }

    const data = response as {
      message?: unknown
      code?: unknown
      issues?: unknown
      error?: unknown
    }

    const message = this.normalizeMessage(
      data.message ?? data.error ?? exception.message ?? this.defaultMessage(statusCode),
    )

    return {
      statusCode,
      message,
      ...(typeof data.code === "string" ? { code: data.code } : {}),
      ...(data.issues !== undefined ? { issues: data.issues } : {}),
    }
  }

  private normalizeMessage(value: unknown) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }

    if (Array.isArray(value)) {
      const messages = value.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
      if (messages.length > 0) {
        return messages.join(", ")
      }
    }

    return t("errors.internalServerError")
  }

  private defaultMessage(statusCode: number) {
    if (statusCode >= 500) {
      return t("errors.internalServerError")
    }
    return "Request failed"
  }
}
