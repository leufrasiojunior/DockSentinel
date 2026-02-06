import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllowAutoUpdateFromLabels,
  listContainers,
  updateCheck,
  updateContainer,
  getContainerDetails,
  type DockerContainer,
  type UpdateCheckResult,
} from "../../api/docker";
import { scanAndEnqueue } from "../../api/updates";
import { Badge } from "../../layouts/ui/Badge";
import { Card, CardHeader } from "../../layouts/ui/Card";
import { useToast } from "../../layouts/ui/ToastProvider";
import { useConfirm } from "../../layouts/ui/ConfirmProvider";
import { Button } from "../../layouts/ui/Button";
import simpleIconsAliases from "../../assets/simpleicons-aliases.json";

type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "done"; result: UpdateCheckResult; checkedAt: string }
  | { status: "error"; error: string };

type ContainerDetails = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  env?: string[];
  labels?: Record<string, string>;
  restartPolicy?: { name?: string; maximumRetryCount?: number };
  ports?: Array<{ containerPort?: string; hostIp?: string; hostPort?: string }>;
  mounts?: Array<{
    type?: string;
    source?: string;
    target?: string;
    readOnly?: boolean;
  }>;
  networks?: Array<{
    name?: string;
    ipv4Address?: string;
    ipv6Address?: string;
    macAddress?: string;
  }>;
  // qualquer outra coisa extra que o backend resolver mandar
  [key: string]: unknown;
};

function splitImageRef(image: string) {
  const idx = image.lastIndexOf(":");
  if (idx > -1 && !image.includes("://")) {
    return { repo: image.slice(0, idx), tag: image.slice(idx + 1) };
  }
  return { repo: image, tag: "" };
}

/**
 * Determina o “registry” (domínio) a partir do repo.
 * Ex:
 * - ghcr.io/homarr-labs/homarr -> ghcr.io
 * - lscr.io/linuxserver/sonarr -> lscr.io
 * - homarr-labs/homarr -> docker hub (fallback)
 */
function getRegistryDomain(repo: string) {
  const first = repo.split("/")[0] ?? "";
  console.log("getRegistryDomain:", repo, "->", first);
  const looksLikeDomain =
    first.includes(".") || first.includes(":") || first === "localhost";
    console.log("looksLikeDomain:", looksLikeDomain);
  if (looksLikeDomain) return first;
  // fallback Docker Hub
  return "hub.docker.com";
}

function toSimpleIconsSlug(input: string) {
  // SimpleIcons usa "slugs" em lowercase com hífen, sem caracteres especiais
  // ex: "Home Assistant" -> "homeassistant"
  // ex: "nginx-proxy-manager" -> "nginxproxymanager"
  return input
    .toLowerCase()
    .replace(/[@:]/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getAppCandidates(imageRepo: string, containerName: string) {
  // imageRepo: "ghcr.io/homarr-labs/homarr"
  const parts = imageRepo.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const secondLast = parts[parts.length - 2] ?? "";

  // candidatos: último segmento do repo, nome do container, penúltimo (org)
  const raw = [last, containerName, secondLast].filter(Boolean);

  // alguns aliases comuns (vai crescer com o tempo)
const aliases = simpleIconsAliases as Record<string, string[]>;


  const slugs = raw.flatMap((r) => {
    const base = toSimpleIconsSlug(r);
    const extra = aliases[base] ?? [];
    return [base, ...extra.map(toSimpleIconsSlug)];
  });

  // remove duplicados mantendo ordem
  return Array.from(new Set(slugs)).filter(Boolean);
}

function SimpleIconsLogo({
  imageRepo,
  containerName,
}: {
  imageRepo: string;
  containerName: string;
}) {
  const domain = getRegistryDomain(imageRepo);

  // estado: qual candidato estamos testando?
  const [idx, setIdx] = useState(0);
  const [useFavicon, setUseFavicon] = useState(false);
  const [failedAll, setFailedAll] = useState(false);

  const candidates = useMemo(
    () => getAppCandidates(imageRepo, containerName),
    [imageRepo, containerName],
  );

  // se não tiver candidatos, pula direto pro favicon
  const current = candidates[idx];

  if (failedAll) {
    return (
      <div
        className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"
        title="Docker"
        aria-label="docker placeholder"
      >
        <span className="text-sm">🐳</span>
      </div>
    );
  }

  // fallback 1: favicon do registry
  if (useFavicon || !current) {
    const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      domain,
    )}&sz=64`;

    return (
      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
        <img
          src={src}
          alt={`${containerName} registry`}
          className="h-6 w-6"
          title={domain}
          onError={() => setFailedAll(true)}
        />
      </div>
    );
  }

  // tentativa: SimpleIcons CDN (retorna svg)
  // dica: se você quiser forçar cor: /<slug>/111827 (cinza-900)
  const siSrc = `https://cdn.simpleicons.org/${encodeURIComponent(current)}`;

  return (
    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
      <img
        src={siSrc}
        alt={`${containerName} icon`}
        className="h-6 w-6"
        title={`simpleicons: ${current}`}
        onError={() => {
          // tenta próximo slug; se acabar, vai pro favicon
          if (idx + 1 < candidates.length) setIdx(idx + 1);
          else setUseFavicon(true);
        }}
      />
    </div>
  );
}


function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="whitespace-pre-wrap wrap-break-word rounded-md bg-slate-50 p-3 text-xs text-slate-800 border">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function DashboardPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const containersQuery = useQuery({
    queryKey: ["docker", "containers"],
    queryFn: listContainers,
    refetchInterval: 10_000,
  });

  const containers = Array.isArray(containersQuery.data)
    ? containersQuery.data
    : [];

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [busy, setBusy] = useState<null | {
    kind: "checkAll" | "updateSelected" | "scanOnly" | "scanAndUpdate";
    progressText: string;
  }>(null);

  // Modal: container selecionado para detalhes
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const detailsQuery = useQuery({
    queryKey: ["docker", "containers", "details", detailsId],
    queryFn: async () => {
      const id = detailsId!;
      return (await getContainerDetails(id)) as ContainerDetails;
    },
    enabled: !!detailsId,
    retry: false,
  });

  const selectedNames = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected],
  );

  const allSelected = useMemo(() => {
    if (!Array.isArray(containers) || containers.length === 0) return false;
    return containers.every((c) => !!selected[c.name]);
  }, [containers, selected]);

  const anySelected = selectedNames.length > 0;

  const selectedContainers = useMemo(() => {
    const map = new Map(containers.map((c) => [c.name, c] as const));
    return selectedNames
      .map((n) => map.get(n))
      .filter(Boolean) as DockerContainer[];
  }, [containers, selectedNames]);

  const selectedBlocked = useMemo(
    () =>
      selectedContainers.filter((c) => !getAllowAutoUpdateFromLabels(c.labels)),
    [selectedContainers],
  );

  async function runUpdateCheckOne(name: string) {
    setChecks((prev) => ({ ...prev, [name]: { status: "checking" } }));
    try {
      const result = await updateCheck(name);
      setChecks((prev) => ({
        ...prev,
        [name]: { status: "done", result, checkedAt: new Date().toISOString() },
      }));
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao checar updates";
      setChecks((prev) => ({
        ...prev,
        [name]: { status: "error", error: msg },
      }));
      toast.error(msg, "Update check");
    }
  }

  async function handleCheckAll() {
    if (busy) return;
    if (!Array.isArray(containers) || containers.length === 0) return;

    setBusy({ kind: "checkAll", progressText: "Checando containers..." });

    setChecks((prev) => {
      const next = { ...prev };
      for (const c of containers) next[c.name] = { status: "checking" };
      return next;
    });

    const results = await Promise.allSettled(
      containers.map((c) => updateCheck(c.name)),
    );

    setChecks((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        const name = containers[i]?.name;
        if (!name) return;

        if (r.status === "fulfilled") {
          next[name] = {
            status: "done",
            result: r.value,
            checkedAt: new Date().toISOString(),
          };
        } else {
          next[name] = {
            status: "error",
            error: (r.reason as any)?.message ?? "Erro ao checar",
          };
        }
      });
      return next;
    });

    setBusy(null);
  }

  async function handleUpdateSelected() {
    if (busy || !anySelected) return;

    const allowed = selectedContainers.filter((c) =>
      getAllowAutoUpdateFromLabels(c.labels),
    );
    const blocked = selectedContainers.filter(
      (c) => !getAllowAutoUpdateFromLabels(c.labels),
    );

    if (blocked.length > 0) {
      toast.info(
        `Ignorando ${blocked.length} bloqueado(s): ${blocked.map((c) => c.name).join(", ")}`,
        "Auto-update OFF",
      );
    }

    if (allowed.length === 0) {
      toast.info("Nenhum selecionado permitido para update.", "Nada a fazer");
      return;
    }

    const ok = await confirm.confirm({
      title: "Atualizar selecionados?",
      description:
        `Você vai iniciar update em ${allowed.length} container(s).\n\n` +
        `Selecionados: ${allowed.map((c) => c.name).join(", ")}`,
      confirmText: "Atualizar agora",
      cancelText: "Cancelar",
    });

    if (!ok) return;

    setBusy({
      kind: "updateSelected",
      progressText: "Atualizando selecionados...",
    });

    for (let i = 0; i < allowed.length; i++) {
      const c = allowed[i];
      setBusy({
        kind: "updateSelected",
        progressText: `Atualizando ${c.name} (${i + 1}/${allowed.length})...`,
      });

      try {
        await updateContainer(c.name, { pull: true, force: false });
        toast.success(`Update disparado: ${c.name}`, "Update");
        await runUpdateCheckOne(c.name);
      } catch (e: any) {
        const msg = e?.message ?? `Erro ao atualizar ${c.name}`;
        toast.error(msg, "Update");
        setChecks((prev) => ({
          ...prev,
          [c.name]: { status: "error", error: msg },
        }));
      }
    }

    await qc.invalidateQueries({ queryKey: ["docker", "containers"] });
    setBusy(null);
  }

  async function handleScanOnly() {
    if (busy) return;

    setBusy({ kind: "scanOnly", progressText: "Executando scan (scan_only)..." });
    try {
      const result = await scanAndEnqueue("scan_only");
      toast.success("Scan concluído.", "Scan");

      if (result && typeof result === "object") {
        const keys = Object.keys(result);
        if (keys.length > 0) {
          toast.info(`Retorno: ${keys.slice(0, 6).join(", ")}...`, "Scan");
        }
      }

      await qc.invalidateQueries({ queryKey: ["docker", "containers"] });
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao executar scan";
      toast.error(msg, "Scan");
    } finally {
      setBusy(null);
    }
  }

  async function handleScanAndUpdate() {
    if (busy) return;

    const ok = await confirm.confirm({
      title: "Scan + enfileirar updates?",
      description:
        "Isso vai rodar o scan e enfileirar jobs para atualizar os containers elegíveis.\n\n" +
        "Containers com label docksentinel.update=false serão ignorados.",
      confirmText: "Executar",
      cancelText: "Cancelar",
    });

    if (!ok) return;

    setBusy({
      kind: "scanAndUpdate",
      progressText: "Executando scan e enfileirando jobs (scan_and_update)...",
    });

    try {
      await scanAndEnqueue("scan_and_update");
      toast.success("Jobs enfileirados com sucesso.", "Scheduler/Queue");
      await qc.invalidateQueries({ queryKey: ["docker", "containers"] });
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao executar scan_and_update";
      toast.error(msg, "Scheduler/Queue");
    } finally {
      setBusy(null);
    }
  }

  function toggleAll() {
    const next = !allSelected;
    const obj: Record<string, boolean> = {};
    for (const c of containers) obj[c.name] = next;
    setSelected(obj);
  }

  function toggleOne(name: string) {
    setSelected((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function renderUpdateBadge(name: string, labels: Record<string, string>) {
    const allow = getAllowAutoUpdateFromLabels(labels);
    const st = checks[name];

    if (!allow) return <Badge tone="gray">Auto update OFF</Badge>;
    if (!st || st.status === "idle")
      return <Badge tone="gray">Não checado</Badge>;
    if (st.status === "checking") return <Badge tone="blue">Checando...</Badge>;
    if (st.status === "error") return <Badge tone="red">Erro</Badge>;

    if (st.result.hasUpdate === true)
      return <Badge tone="yellow">Update disponível</Badge>;
    if (st.result.hasUpdate === false)
      return <Badge tone="green">Atualizado</Badge>;
    return <Badge tone="gray">Checado</Badge>;
  }

  const loading = containersQuery.isLoading;

  const details = detailsQuery.data as ContainerDetails | undefined;

  const mainDetails = details
    ? {
        id: details.id,
        name: details.name,
        image: details.image,
        state: details.state,
        status: details.status,
      }
    : null;

  const extras = details
    ? Object.fromEntries(
        Object.entries(details).filter(
          ([k]) =>
            ![
              "id",
              "name",
              "image",
              "state",
              "status",
              "env",
              "labels",
              "restartPolicy",
              "ports",
              "mounts",
              "networks",
            ].includes(k),
        ),
      )
    : null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Containers do host Docker + checagem de updates por imagem.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => containersQuery.refetch()}
            disabled={loading || !!busy}
            type="button"
          >
            Recarregar
          </Button>

          <Button
            onClick={handleScanOnly}
            disabled={loading || !!busy}
            type="button"
            title="Roda scan manual (não enfileira jobs)"
          >
            Scan
          </Button>

          <Button
            variant="primary"
            onClick={handleScanAndUpdate}
            disabled={loading || !!busy}
            type="button"
            title="Roda scan e enfileira jobs para atualizar"
          >
            Scan + Enqueue
          </Button>

          <Button
            onClick={handleCheckAll}
            disabled={loading || !!busy || containers.length === 0}
            type="button"
          >
            Checar todos
          </Button>

          <Button
            variant="primary"
            onClick={handleUpdateSelected}
            disabled={loading || !!busy || !anySelected}
            type="button"
            title={
              selectedBlocked.length > 0
                ? "Alguns selecionados estão bloqueados por label"
                : undefined
            }
          >
            Atualizar selecionados
          </Button>
        </div>
      </div>

      {busy && (
        <Card className="px-4 py-3">
          <div className="text-sm text-gray-700">{busy.progressText}</div>
        </Card>
      )}

      {containersQuery.isError && (
        <Card className="border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm text-red-700">
            Erro ao carregar containers:{" "}
            {(containersQuery.error as any)?.message ?? "desconhecido"}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title={`Containers (${containers.length})`}
          subtitle={
            <>
              Auto-update bloqueado quando label{" "}
              <span className="font-mono">docksentinel.update=false</span>.
            </>
          }
        />

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={containers.length === 0}
                  />
                </th>
                <th className="px-4 py-3">Container</th>
                <th className="px-4 py-3">Imagem</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Update</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={6}>
                    Carregando...
                  </td>
                </tr>
              )}

              {!loading && containers.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={6}>
                    Nenhum container encontrado.
                  </td>
                </tr>
              )}

              {containers.map((c) => {
                const allowAutoUpdate = getAllowAutoUpdateFromLabels(c.labels);
                const img = splitImageRef(c.image);

                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={!!selected[c.name]}
                        onChange={() => toggleOne(c.name)}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <SimpleIconsLogo imageRepo={img.repo} containerName={c.name} />

                        <div>
                          <div className="font-medium text-gray-900">
                            {c.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono truncate max-w-55">
                            {c.id.slice(0, 12)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-mono text-xs text-gray-900 truncate max-w-130">
                        {img.repo}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone="gray">{img.tag || "no-tag"}</Badge>
                        {!allowAutoUpdate && <Badge tone="gray">blocked</Badge>}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{c.state}</div>
                      <div className="text-xs text-gray-500">{c.status}</div>
                    </td>

                    <td className="px-4 py-4">
                      {renderUpdateBadge(c.name, c.labels)}
                      {checks[c.name]?.status === "error" && (
                        <div className="mt-1 text-[11px] text-red-600">
                          {(checks[c.name] as any).error}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => setDetailsId(c.id)}
                          disabled={!!busy}
                          type="button"
                        >
                          Detalhes
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => runUpdateCheckOne(c.name)}
                          disabled={!!busy}
                          type="button"
                        >
                          Checar
                        </Button>

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            updateContainer(c.name, {
                              pull: true,
                              force: false,
                            })
                          }
                          disabled={!!busy || !allowAutoUpdate}
                          type="button"
                        >
                          Atualizar
                        </Button>
                      </div>

                      {!allowAutoUpdate && (
                        <div className="mt-1 text-[11px] text-gray-500">
                          bloqueado por label
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {anySelected && (
        <div className="text-xs text-gray-600">
          Selecionados:{" "}
          <span className="font-medium">{selectedNames.join(", ")}</span>
        </div>
      )}

      {/* Modal de detalhes */}
      {detailsId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* backdrop */}
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetailsId(null)}
            aria-label="Fechar"
            type="button"
          />

          <div className="relative w-full max-w-3xl">
            <Card className="p-4 max-h-[85vh] overflow-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">Detalhes do container</div>
                  <div className="mt-1 text-xs text-gray-600">
                    ID: <span className="font-mono">{detailsId}</span>
                  </div>
                </div>

                <Button type="button" onClick={() => setDetailsId(null)}>
                  Fechar
                </Button>
              </div>

              {detailsQuery.isLoading && (
                <div className="mt-4 text-sm text-gray-600">Carregando detalhes...</div>
              )}

              {detailsQuery.isError && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Erro ao carregar detalhes:{" "}
                  {(detailsQuery.error as any)?.message ?? "desconhecido"}
                </div>
              )}

              {details && (
                <div className="mt-4 space-y-4">
                  {/* principais */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-gray-600">Name</div>
                      <div className="font-medium">{details.name}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-gray-600">Image</div>
                      <div className="font-mono text-xs wrap-break-word">{details.image}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-gray-600">State</div>
                      <div className="font-medium">{details.state}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-gray-600">Status</div>
                      <div className="font-medium">{details.status}</div>
                    </div>
                  </div>

                  {/* ENV */}
                  {Array.isArray(details.env) && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Env</div>
                      <div className="rounded-md border bg-white">
                        <div className="max-h-48 overflow-auto p-3 text-xs font-mono">
                          {details.env.length === 0 ? (
                            <div className="text-gray-500">Sem env.</div>
                          ) : (
                            <ul className="space-y-1">
                              {details.env.map((line, idx) => (
                                <li key={idx} className="wrap-break-word">
                                  {line}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Labels */}
                  {details.labels && typeof details.labels === "object" && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Labels</div>
                      <JsonBlock value={details.labels} />
                    </div>
                  )}

                  {/* Restart Policy */}
                  {details.restartPolicy && typeof details.restartPolicy === "object" && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Restart policy</div>
                      <JsonBlock value={details.restartPolicy} />
                    </div>
                  )}

                  {/* Ports */}
                  {Array.isArray(details.ports) && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Ports</div>
                      <JsonBlock value={details.ports} />
                    </div>
                  )}

                  {/* Mounts */}
                  {Array.isArray(details.mounts) && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Mounts</div>
                      <JsonBlock value={details.mounts} />
                    </div>
                  )}

                  {/* Networks */}
                  {Array.isArray(details.networks) && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Networks</div>
                      <JsonBlock value={details.networks} />
                    </div>
                  )}

                  {/* Extras */}
                  {extras && Object.keys(extras).length > 0 && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Outros detalhes</div>
                      <JsonBlock value={extras} />
                    </div>
                  )}

                  {/* Debug: principais */}
                  {mainDetails && (
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Nota:</span> campos podem variar conforme container.
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
