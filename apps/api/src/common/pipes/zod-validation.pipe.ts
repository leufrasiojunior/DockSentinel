import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { z } from "zod";

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
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Validation failed",
        issues: parsed.error.issues,
      });
    }

    // ✅ MUITO IMPORTANTE:
    // retornando parsed.data, você ganha os `.default()` do Zod
    return parsed.data;
  }
}
