import simpleIconsAliases from "../../../assets/simpleicons-aliases.json";

export function splitImageRef(image: string) {
  const idx = image.lastIndexOf(":");
  if (idx > -1 && !image.includes("://")) {
    return { repo: image.slice(0, idx), tag: image.slice(idx + 1) };
  }
  return { repo: image, tag: "" };
}

/**
 * Determina o “registry” (domínio) a partir do repo.
 */
export function getRegistryDomain(repo: string) {
  const first = repo.split("/")[0] ?? "";
  const looksLikeDomain =
    first.includes(".") || first.includes(":") || first === "localhost";
  if (looksLikeDomain) return first;
  // fallback Docker Hub
  return "hub.docker.com";
}

export function toSimpleIconsSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[@:]/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getAppCandidates(imageRepo: string, containerName: string) {
  const parts = imageRepo.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const secondLast = parts[parts.length - 2] ?? "";

  const raw = [last, containerName, secondLast].filter(Boolean);
  const aliases = simpleIconsAliases as Record<string, string[]>;

  const slugs = raw.flatMap((r) => {
    const base = toSimpleIconsSlug(r);
    const extra = aliases[base] ?? [];
    return [base, ...extra.map(toSimpleIconsSlug)];
  });

  return Array.from(new Set(slugs)).filter(Boolean);
}
