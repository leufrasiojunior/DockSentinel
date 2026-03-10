"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "../../../shared/components/ui/Button";
import { useNotifications } from "../hooks/useNotifications";

export interface Item {
  id: string;
  channel: string;
  type: string;
  level: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  meta?: Record<string, any>;
}

export const columns: ColumnDef<Item>[] = [
  {
    accessorKey: "createdAt",
    header: "Quando",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return date.toLocaleString();
    },
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      return (
        <span
          className={[
            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
            row.original.level === "error"
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700",
          ].join(" ")}
        >
          {row.original.level === "error" ? "ERRO" : "INFO"}
        </span>
      );
    },
  },
  {
    accessorKey: "readAt",
    header: "Status",
    cell: ({ row }) => {
      const readAt = row.getValue("readAt");
      return readAt ? (
        <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
          Lida
        </span>
      ) : (
        <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
          Não lida
        </span>
      );
    },
  },
  {
    accessorKey: "title",
    header: "Título",
  },
  {
    accessorKey: "message",
    header: "Mensagem",
  },
  {
    id: "actions",
    header: "Ação",
    cell: ({ row }) => {
      const { markRead } = useNotifications();
      //ajustar para um dropdown com mais ações no futuro (ex: detalhes, deletar, etc, criar no back para marcar como nao lida)
      return (
        !row.original.readAt && (
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => markRead(row.original.id)}
          >
            Marcar lida
          </Button>
        )
      );
    },
  },
];
