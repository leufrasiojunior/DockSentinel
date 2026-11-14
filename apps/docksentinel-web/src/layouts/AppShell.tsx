import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowUpCircle,
  Bell,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  House,
  KeyRound,
  LogOut,
  Menu,
  RefreshCw,
  Server,
  Settings2,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

import { logout } from "../features/auth/api/auth";
import { useVersionCheck } from "../features/settings/hooks/useVersionCheck";
import { NotificationCenter } from "../features/notifications/components/NotificationCenter";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { NotificationsBridge } from "./NotificationsBridge";
import { ThemeToggle } from "../shared/components/ui/ThemeToggle";
import { cn } from "../shared/lib/utils/cn";
import { LanguageSelector } from "../shared/components/ui/LanguageSelector";
import {
  buildEnvironmentPath,
} from "../features/environments/api/environments";
import {
  getEnvironmentIdFromPathname,
  readStoredEnvironmentId,
  writeStoredEnvironmentId,
} from "../features/environments/hooks/useEnvironmentRoute";

import logo from "../assets/logo2.png";

const SIDEBAR_COLLAPSED_WIDTH = 96;
const SIDEBAR_DEFAULT_WIDTH = 320;
const SIDEBAR_MIN_WIDTH = 256;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_WIDTH_STORAGE_KEY = "docksentinel.sidebar.width";
const APP_VERSION = __APP_VERSION__;

function clampSidebarWidth(value: number) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(value)));
}

interface SidebarLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  id: string;
  title: string;
  items: NavItem[];
};

function SidebarLink({ to, label, icon: Icon, isCollapsed, onNavigate }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end
      onClick={onNavigate}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isCollapsed ? "justify-center px-0" : "px-3",
          isActive
            ? "border border-violet-500/40 bg-gradient-to-r from-violet-600/20 via-violet-600/12 to-transparent text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.35)] font-semibold"
            : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100 border border-transparent"
        )
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200",
              isActive
                ? "border-violet-400/40 bg-violet-600/25 text-violet-300 shadow-sm"
                : "border-white/5 bg-white/[0.04] text-slate-400 group-hover:border-white/10 group-hover:bg-white/8 group-hover:text-slate-200"
            )}
          >
            <Icon className="size-4 shrink-0" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm">{label}</div>
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({
  isCollapsed,
  onToggleCollapse,
  onLogout,
  onNavigate,
  navSections,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  onNavigate?: () => void;
  navSections: NavSection[];
}) {
  const { t } = useTranslation();
  const { versionCheck, isRefreshing, refreshVersions } = useVersionCheck();
  const hasServerUpdate = Boolean(
    versionCheck?.server.hasUpdate && versionCheck.server.latestVersion,
  );

  return (
    <>
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-8 z-50 hidden size-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent lg:flex"
        title={isCollapsed ? t("navigation.expand") : t("navigation.collapse")}
        type="button"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Top Header / Branding */}
      <div className="px-5 py-6">
        <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "justify-center")}>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-600 to-indigo-800 p-2 shadow-lg shadow-violet-500/20">
            <img src={logo} alt="DockSentinel" className="h-full w-full object-contain filter drop-shadow" />
          </div>

          {!isCollapsed ? (
            <div className="min-w-0 space-y-1">
              <div className="truncate text-lg font-bold tracking-tight text-white">
                DockSentinel
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-violet-300 font-mono">
                  v{APP_VERSION} {t("navigation.stableTag")}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <nav className="space-y-4">
          {navSections.map((section) => (
            <div key={section.id} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pt-2 pb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  {section.title}
                </div>
              ) : (
                <div className="my-2 h-px bg-white/5" />
              )}
              {section.items.map((item) => (
                <SidebarLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="mt-auto px-4 py-5 space-y-3 border-t border-sidebar-border/60">
        {!isCollapsed ? (
          <>
            {/* Host Status & Version Refresh Card */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex size-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">Docker Engine</div>
                  <div className="truncate text-[0.68rem] text-muted-foreground">{t("navigation.daemonOnline")}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => refreshVersions()}
                disabled={isRefreshing}
                title={t("updatesCheck.checkNow")}
                className="flex size-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              </button>
            </div>

            {/* Server Update Banner */}
            {hasServerUpdate && versionCheck?.server.latestVersion ? (
              <a
                href={versionCheck.server.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/25"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <ArrowUpCircle className="size-4 shrink-0 text-amber-400" />
                  <span className="truncate">
                    {t("updatesCheck.newServerVersionBanner", {
                      version: versionCheck.server.latestVersion,
                    })}
                  </span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 opacity-80" />
              </a>
            ) : null}
          </>
        ) : hasServerUpdate && versionCheck?.server.latestVersion ? (
          <div className="flex justify-center">
            <a
              href={versionCheck.server.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={t("updatesCheck.newServerVersionBanner", {
                version: versionCheck.server.latestVersion,
              })}
              className="flex size-10 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-300 transition-colors hover:bg-amber-500/25"
            >
              <ArrowUpCircle className="size-4.5" />
            </a>
          </div>
        ) : null}

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-sidebar-foreground hover:bg-white/10 hover:text-white transition-all",
            !isCollapsed && "justify-start px-4",
          )}
          onClick={onLogout}
          type="button"
          title={isCollapsed ? t("navigation.logout") : undefined}
        >
          <LogOut className="size-4" />
          {!isCollapsed ? <span>{t("navigation.logout")}</span> : null}
        </Button>
      </div>
    </>
  );
}

export function AppShell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const activeEnvironmentId = useMemo(
    () => getEnvironmentIdFromPathname(location.pathname) ?? readStoredEnvironmentId() ?? "local",
    [location.pathname],
  );

  const navSections = useMemo<NavSection[]>(() => {
    const dashboardPath = buildEnvironmentPath(activeEnvironmentId, "dashboard");
    return [
      {
        id: "management",
        title: t("navigation.management"),
        items: [
          {
            to: "/home",
            label: "Home",
            icon: House,
          },
          {
            to: dashboardPath,
            label: t("navigation.dashboard"),
            icon: Boxes,
          },
          {
            to: buildEnvironmentPath(activeEnvironmentId, "jobs"),
            label: t("navigation.jobs"),
            icon: TerminalSquare,
          },
          {
            to: buildEnvironmentPath(activeEnvironmentId, "scheduler"),
            label: t("navigation.scheduler"),
            icon: Clock3,
          },
        ],
      },
      {
        id: "diagnostics",
        title: t("navigation.diagnostics"),
        items: [
          {
            to: buildEnvironmentPath(activeEnvironmentId, "notifications"),
            label: t("navigation.notifications"),
            icon: Bell,
          },
          {
            to: "/settings/registries",
            label: t("navigation.registries"),
            icon: KeyRound,
          },
          {
            to: "/settings/environments",
            label: t("navigation.environments"),
            icon: Server,
          },
          {
            to: "/settings",
            label: t("navigation.settings"),
            icon: Settings2,
          },
        ],
      },
    ];
  }, [activeEnvironmentId, i18n.resolvedLanguage, t]);

  const allNavItems = useMemo(
    () => navSections.flatMap((section) => section.items),
    [navSections]
  );

  const currentNav = useMemo(() => {
    return (
      allNavItems.find(
        (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
      ) ?? allNavItems[0]
    );
  }, [allNavItems, location.pathname]);
  const currentTitle = useMemo(() => currentNav.label, [currentNav.label]);

  useEffect(() => {
    document.title = `DockSentinel | ${currentTitle}`;
  }, [currentTitle]);

  useEffect(() => {
    const environmentId = getEnvironmentIdFromPathname(location.pathname);
    if (environmentId) {
      writeStoredEnvironmentId(environmentId);
    }
  }, [location.pathname]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
      if (!raw) return;

      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        setSidebarWidth(clampSidebarWidth(parsed));
      }
    } catch {
      // ignore storage failures and keep default width
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
    } catch {
      // ignore storage failures and keep current session width only
    }
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;

      const delta = event.clientX - state.startX;
      setSidebarWidth(clampSidebarWidth(state.startWidth + delta));
    };

    const stopResizing = () => {
      resizeStateRef.current = null;
      setIsResizing(false);
    };

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [isResizing]);

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isCollapsed) return;

      event.preventDefault();
      resizeStateRef.current = {
        startX: event.clientX,
        startWidth: sidebarWidth,
      };
      setIsResizing(true);
    },
    [isCollapsed, sidebarWidth],
  );

  const desktopSidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      qc.clear();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NotificationsBridge />
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r-2 border-sidebar-border/80 bg-sidebar text-sidebar-foreground lg:flex",
            isResizing ? "transition-none" : "transition-[width] duration-300 ease-in-out",
          )}
          style={{ width: desktopSidebarWidth, minWidth: desktopSidebarWidth }}
        >
          <SidebarContent
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((current) => !current)}
            onLogout={handleLogout}
            navSections={navSections}
          />

          {!isCollapsed ? (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={t("navigation.resizeSidebar")}
              className="absolute inset-y-0 -right-2 hidden w-4 cursor-col-resize lg:block"
              onPointerDown={handleResizeStart}
            >
              <div
                className={cn(
                  "absolute inset-y-8 left-1/2 w-1 -translate-x-1/2 rounded-full transition-colors",
                  isResizing ? "bg-sidebar-ring" : "bg-sidebar-border/85 hover:bg-sidebar-ring/80",
                )}
              />
            </div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-400 items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="lg:hidden">
                  <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon-sm" aria-label={t("navigation.openNavigation")}>
                      <Menu className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="max-w-sm border-sidebar-border/80 bg-sidebar text-sidebar-foreground">
                    <SheetHeader className="border-b border-sidebar-border/80 pb-5">
                      <SheetTitle className="text-sidebar-foreground">DockSentinel</SheetTitle>
                      <SheetDescription className="text-sidebar-foreground/65">
                        {t("navigation.primaryNavigation")}
                      </SheetDescription>
                    </SheetHeader>
                    <div className="flex h-full flex-col">
                      <SidebarContent
                        isCollapsed={false}
                        onToggleCollapse={() => undefined}
                        onLogout={handleLogout}
                        navSections={navSections}
                        onNavigate={() => setMobileOpen(false)}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {currentTitle}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-4">
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    {currentTitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <LanguageSelector />
                <ThemeToggle />
                <NotificationCenter />
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-400 px-4 py-5 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
