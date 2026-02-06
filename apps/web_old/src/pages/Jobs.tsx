import { useQuery } from "@tanstack/react-query";
import { updatesApi } from "../api/updates";

export function JobsPage() {
  const jobsQ = useQuery({
    queryKey: ["jobs", 20, 0],
    queryFn: () => updatesApi.jobs({ take: 20, skip: 0 }),
    refetchInterval: 3000,
  });

  if (jobsQ.isLoading) return <div>Carregando...</div>;
  if (jobsQ.isError) return <div>Erro ao carregar jobs</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Jobs</h1>

      <div className="rounded-xl bg-white shadow">
        <div className="border-b px-6 py-4 text-lg font-semibold">Fila recente</div>
        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr className="border-b">
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Container</th>
              <th className="px-6 py-3 text-left">Image</th>
              <th className="px-6 py-3 text-left">Criado</th>
            </tr>
          </thead>
          <tbody>
            {jobsQ.data.items.map((j) => (
              <tr key={j.id} className="border-b last:border-b-0">
                <td className="px-6 py-3">{j.status}</td>
                <td className="px-6 py-3 font-medium">{j.container}</td>
                <td className="px-6 py-3">{j.image}</td>
                <td className="px-6 py-3">{new Date(j.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
