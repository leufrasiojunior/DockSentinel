"use client";

import { Button } from "../../../shared/components/ui/Button";
import { useNotifications } from "../hooks/useNotifications";
import { columns } from "../table/columns";
import { DataTable } from "../table/data-table";

export default function NewNotifications() {
  const { items, refetch, isFetching, visible } = useNotifications();

  return (
    <>
      <div className="container mx-auto py-10 ">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Notificações</h1>
            <p className="mt-1 text-sm text-gray-600">
              Histórico das notificações in-app (ordem: mais novas primeiro •
              auto-refresh: {visible ? "ON" : "OFF"}).
            </p>
          </div>

          <Button type="button" onClick={() => refetch()} disabled={isFetching}>
            Recarregar
          </Button>
        </div>
        <DataTable columns={columns} data={items} />
      </div>
    </>
  );
}
