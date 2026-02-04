import Docker from "dockerode"
import { DockerDigestService } from "./docker-digest.service"

type DialOptions = {
  method: string
  path: string
  statusCodes?: Record<number, boolean | string>
}
type DialCallback = (err: Error | null, body: string) => void

describe("DockerDigestService", () => {
  it("should parse Descriptor.Digest from /distribution/{name}/json", async () => {
    // Mock mínimo do dockerode
    const dockerMock = {
      modem: {
        dial: (_opts: DialOptions, cb: DialCallback) => {
          cb(null, JSON.stringify({ Descriptor: { Digest: "sha256:abc" } }))
        },
      },
    } as unknown as Docker

    const svc = new DockerDigestService(dockerMock)
    await expect(svc.getRemoteDigest("nginx:latest")).resolves.toBe("sha256:abc")
  })

  it("should throw if digest missing", async () => {
    const dockerMock = {
      modem: { dial: (_opts: DialOptions, cb: DialCallback) => cb(null, "{}") },
    } as unknown as Docker

    const svc = new DockerDigestService(dockerMock)
    await expect(svc.getRemoteDigest("nginx:latest")).rejects.toThrow(
      /Remote digest not found/,
    )
  })
})
