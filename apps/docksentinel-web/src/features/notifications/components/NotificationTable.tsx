import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Menu, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components/ui/Button";
import { Badge } from "../../../shared/components/ui/Badge";
import { Checkbox } from "../../../components/ui/checkbox";
import { formatDateTime } from "../../../i18n/format";
import { type InAppNotification } from "../api/notifications";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { cn } from "../../../shared/lib/utils/cn";

function fmt(value: string) {
  return formatDateTime(value) ?? value;
}

const NEW_NOTIFICATION_HIGHLIGHT_MS = 2_800;

interface NotificationTableProps {
  items: InAppNotification[];
  loading: boolean;
  selectedIds: string[];
  allSelected: boolean;
  onToggleSelected: (id: string) => void;
  onToggleAllSelected: (checked: boolean) => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDelete: (id: string) => Promise<void> | void;
  markReadPendingId: string | null;
  markUnreadPendingId: string | null;
  deletePendingId: string | null;
  deleteManyPending: boolean;
}

export function NotificationTable({
  items,
  loading,
  selectedIds,
  allSelected,
  onToggleSelected,
  onToggleAllSelected,
  onMarkRead,
  onMarkUnread,
  onDelete,
  markReadPendingId,
  markUnreadPendingId,
  deletePendingId,
  deleteManyPending,
}: NotificationTableProps) {
  const { t } = useTranslation();
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const clearTimersRef = useRef<Map<string, number>>(new Map());
  const recentIdsSet = useMemo(() => new Set(recentIds), [recentIds]);
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    return () => {
      clearTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      clearTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const currentIds = items.map((item) => item.id);

    if (!initializedRef.current) {
      initializedRef.current = true;
      seenIdsRef.current = new Set(currentIds);
      return;
    }

    const incomingIds = currentIds.filter((id) => !seenIdsRef.current.has(id));
    seenIdsRef.current = new Set(currentIds);

    if (incomingIds.length === 0) return;

    setRecentIds((current) => Array.from(new Set([...incomingIds, ...current])));

    incomingIds.forEach((id) => {
      const existingTimer = clearTimersRef.current.get(id);
      if (existingTimer) window.clearTimeout(existingTimer);

      const timer = window.setTimeout(() => {
        clearTimersRef.current.delete(id);
        setRecentIds((current) => current.filter((value) => value !== id));
      }, NEW_NOTIFICATION_HIGHLIGHT_MS);

      clearTimersRef.current.set(id, timer);
    });
  }, [items, loading]);

  useEffect(() => {
    if (!openMenuId) return;

    const exists = items.some((item) => item.id === openMenuId);
    if (!exists) setOpenMenuId(null);
  }, [items, openMenuId]);

  useEffect(() => {
    if (!openMenuId) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenuId]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onToggleAllSelected}
              aria-label={t("notifications.table.selectAll")}
              disabled={deleteManyPending}
            />
          </TableHead>
          <TableHead className="text-left">{t("notifications.table.when")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.type")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.status")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.title")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.message")}</TableHead>
          <TableHead className="text-left">{t("notifications.table.action")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                {t("notifications.table.loading")}
              </TableCell>
            </TableRow>
          )}

        {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                {t("notifications.table.empty")}
              </TableCell>
            </TableRow>
          )}

        {items.map((n) => {
          const rowPending =
            markReadPendingId === n.id ||
            markUnreadPendingId === n.id ||
            deletePendingId === n.id;

          return (
            <TableRow
              key={n.id}
              data-state={selectedIdsSet.has(n.id) ? "selected" : undefined}
              className={cn(
                "hover:bg-muted/50 transition-[background-color] duration-700",
                !n.readAt && "bg-blue-500/5 dark:bg-blue-500/10",
                recentIdsSet.has(n.id) && "bg-primary/10 dark:bg-primary/15",
                selectedIdsSet.has(n.id) && "bg-accent/55 dark:bg-accent/30",
              )}
            >
              <TableCell className="text-center">
                <Checkbox
                  checked={selectedIdsSet.has(n.id)}
                  onCheckedChange={() => onToggleSelected(n.id)}
                  aria-label={t("notifications.table.selectRow")}
                  disabled={deleteManyPending}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap text-left text-muted-foreground">
                <div
                  className={cn(
                    recentIdsSet.has(n.id) && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-500",
                  )}
                >
                  {fmt(n.createdAt)}
                </div>
              </TableCell>
              <TableCell className="text-left">
                <div
                  className={cn(
                    recentIdsSet.has(n.id) && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-500",
                  )}
                >
                  <Badge tone={n.level === "error" ? "red" : "green"}>
                    {n.level === "error" ? t("common.states.error") : t("common.states.info")}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-left text-xs">
                <div
                  className={cn(
                    recentIdsSet.has(n.id) && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-500",
                  )}
                >
                  {n.readAt ? (
                    <Badge tone="gray">{t("common.states.read")}</Badge>
                  ) : (
                    <Badge tone="blue">{t("common.states.unread")}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-left font-medium text-foreground">
                <div
                  className={cn(
                    recentIdsSet.has(n.id) && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-500",
                  )}
                >
                  {n.title}
                </div>
              </TableCell>
              <TableCell className="text-left text-foreground/80">
                <div
                  className={cn(
                    recentIdsSet.has(n.id) && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-500",
                  )}
                >
                  {n.message}
                </div>
              </TableCell>
              <TableCell className="text-left">
                <div
                  className={cn(
                    "flex justify-end",
                    recentIdsSet.has(n.id) && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-500",
                  )}
                >
                  <div
                    className="relative"
                    ref={openMenuId === n.id ? menuRef : undefined}
                  >
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("notifications.table.openActions")}
                      title={t("notifications.table.openActions")}
                      aria-expanded={openMenuId === n.id}
                      onClick={() => setOpenMenuId((current) => (current === n.id ? null : n.id))}
                      disabled={rowPending || deleteManyPending}
                    >
                      {rowPending ? <LoaderCircle className="size-4 animate-spin" /> : <Menu className="size-4" />}
                    </Button>

                    {openMenuId === n.id ? (
                      <div className="absolute right-0 top-10 z-30 min-w-44 rounded-xl border border-border/70 bg-popover/95 p-1.5 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.4)] backdrop-blur">
                        <button
                          type="button"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent/70"
                          onClick={() => {
                            setOpenMenuId(null);
                            if (n.readAt) onMarkUnread(n.id);
                            else onMarkRead(n.id);
                          }}
                          disabled={rowPending || deleteManyPending}
                        >
                          {n.readAt ? t("common.actions.markAsUnread") : t("common.actions.markAsRead")}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/8"
                          onClick={() => {
                            setOpenMenuId(null);
                            void onDelete(n.id);
                          }}
                          disabled={rowPending || deleteManyPending}
                        >
                          <Trash2 className="size-4" />
                          {t("common.actions.delete")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
