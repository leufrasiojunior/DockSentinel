import { z } from "zod"
import { ZodValidationPipe } from "./zod-validation.pipe"

describe("ZodValidationPipe", () => {
  it("validates parsed JSON strings and applies schema defaults", () => {
    const pipe = new ZodValidationPipe(
      z.object({
        enabled: z.boolean().default(true),
      }),
    )

    expect(pipe.transform("{}")).toEqual({ enabled: true })
  })
})
