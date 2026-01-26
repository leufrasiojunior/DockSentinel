import { CryptoService } from "./crypto.service"

describe("CryptoService (unit)", () => {
  beforeAll(() => {
    process.env.DOCKSENTINEL_SECRET = "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"
  })

  it("should encrypt and decrypt", () => {
    const crypto = new CryptoService()
    const plain = "my-super-secret"
    const enc = crypto.encrypt(plain)

    expect(enc).not.toEqual(plain)
    expect(enc.startsWith("v1:")).toBe(true)

    const dec = crypto.decrypt(enc)
    expect(dec).toBe(plain)
  })

  it("should fail on invalid payload", () => {
    const crypto = new CryptoService()
    expect(() => crypto.decrypt("invalid")).toThrow()
  })
})
