import { useQuery } from "@tanstack/react-query";
import { dockerApi } from "../api/docker";
import { UpdateBadge } from "./badges";
import { RowActions } from "../pages/Dashboard";

export default function ContainerRow({ c }: { c: any }) {
  const checkQ = useQuery({
    queryKey: ["update-check", c.name],
    queryFn: () => dockerApi.updateCheck(c.name),
    enabled: false, // só busca quando clicar
  });

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-6 py-3 font-medium">{c.name}</td>
      <td className="px-6 py-3">{c.image}</td>
      <td className="px-6 py-3">{c.status}</td>
      <td className="px-6 py-3">
        <UpdateBadge check={checkQ.data} />
      </td>
      <td className="px-6 py-3">
        <RowActions name={c.name} onChecked={() => checkQ.refetch()} />
      </td>
    </tr>
  );
}
