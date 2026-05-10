import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { z } from "zod";
import { t } from "../../i18n/translate";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodTypeAny) {}

  transform(value: unknown) {
    let v = value;

    if (typeof v === "string") {
      try {
        v = JSON.parse(v);
      } catch {
        // deixa cair no Zod com erro mais claro
      }
    }

    const parsed = this.schema.safeParse(v);
    if (!parsed.success) {
      throw new BadRequestException({
        message: t("validation.failed"),
        code: "VALIDATION_FAILED",
        issues: parsed.error.issues,
      });
    }

    // ✅ MUITO IMPORTANTE:
    // retornando parsed.data, você ganha os `.default()` do Zod
    return parsed.data;
  }
}
