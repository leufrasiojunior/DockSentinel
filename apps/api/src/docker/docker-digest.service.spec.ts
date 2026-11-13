import Docker from "dockerode"
import { DockerDigestService } from "./docker-digest.service"
import { DockerUpdateService } from "./docker-update.service"
import {
  decodeAgentRegistryAuthHeader,
  encodeAgentRegistryAuthHeader,
  extractRegistryFromImage,
  matchRegistryAuth,
} from "./registry-auth.util"

type DialOptions = {
  method: string
  path: string
  headers?: Record<string, string>
  statusCodes?: Record<number, boolean | string>
}
type DialCallback = (err: Error | null, body: string) => void

describe("DockerDigestService & RegistryAuth", () => {
  it("should parse Descriptor.Digest and cache subsequent calls within TTL", async () => {
    let dialCalls = 0
    const dockerMock = {
      modem: {
        dial: (_opts: DialOptions, cb: DialCallback) => {
          dialCalls += 1
          cb(null, JSON.stringify({ Descriptor: { Digest: "sha256:abc" } }))
        },
      },
    } as unknown as Docker

    const svc = new DockerDigestService(dockerMock)
    await expect(svc.getRemoteDigest("nginx:latest")).resolves.toBe("sha256:abc")
    await expect(svc.getRemoteDigest("nginx:latest")).resolves.toBe("sha256:abc")
    expect(dialCalls).toBe(1)

    svc.invalidate("nginx:latest")
    await expect(svc.getRemoteDigest("nginx:latest")).resolves.toBe("sha256:abc")
    expect(dialCalls).toBe(2)
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

  it("should pass X-Registry-Auth header when authConfig is provided", async () => {
    let capturedHeaders: Record<string, string> | undefined
    const dockerMock = {
      modem: {
        dial: (opts: DialOptions, cb: DialCallback) => {
          capturedHeaders = opts.headers
          cb(null, JSON.stringify({ Descriptor: { Digest: "sha256:def" } }))
        },
      },
    } as unknown as Docker

    const svc = new DockerDigestService(dockerMock)
    const auth = matchRegistryAuth("linuxserver/radarr:latest", [
      {
        serveraddress: "docker.io",
        username: "myuser",
        password: "mypassword",
      },
    ])
    expect(auth).toBeDefined()

    await expect(
      svc.getRemoteDigest("linuxserver/radarr:latest", auth),
    ).resolves.toBe("sha256:def")
    expect(capturedHeaders?.["X-Registry-Auth"]).toBeDefined()
  })

  it("should detect local_only images without calling remote registry", async () => {
    let dialCalled = false
    const dockerMock = {
      getContainer: () => ({
        inspect: async () => ({
          Config: { Image: "bt-bridge:latest" },
          Image: "sha256:local123",
        }),
      }),
      getImage: () => ({
        inspect: async () => ({
          RepoDigests: [],
        }),
      }),
      modem: {
        dial: (_opts: DialOptions, cb: DialCallback) => {
          dialCalled = true
          cb(new Error("Should not be called"), "")
        },
      },
    } as unknown as Docker

    const digestSvc = new DockerDigestService(dockerMock)
    const updateSvc = new DockerUpdateService(dockerMock, digestSvc)

    const result = await updateSvc.canUpdateContainer("bt-bridge")
    expect(result.reason).toBe("local_only")
    expect(result.hasUpdate).toBe(false)
    expect(result.canCheckRemote).toBe(false)
    expect(dialCalled).toBe(false)
  })

  it("should extract and match registry domains accurately", () => {
    expect(extractRegistryFromImage("bt-bridge:latest")).toBe("index.docker.io")
    expect(extractRegistryFromImage("linuxserver/sonarr:latest")).toBe("index.docker.io")
    expect(extractRegistryFromImage("ghcr.io/org/app:1.0")).toBe("ghcr.io")
    expect(extractRegistryFromImage("lscr.io/linuxserver/prowlarr:latest")).toBe("lscr.io")

    const entries = [
      { serveraddress: "ghcr.io", username: "ghuser", password: "ghp_token" },
    ]
    const lscrMatch = matchRegistryAuth("lscr.io/linuxserver/prowlarr:latest", entries)
    expect(lscrMatch?.username).toBe("ghuser")

    const encoded = encodeAgentRegistryAuthHeader(entries)
    expect(encoded).toBeDefined()
    expect(decodeAgentRegistryAuthHeader(encoded)).toEqual(entries)
  })
})
