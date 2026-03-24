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
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

import { logout } from "../features/auth/api/auth";
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

const navItems = [
  {
    to: "/dashboard",
    labelKey: "navigation.dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/jobs",
    labelKey: "navigation.jobs",
    icon: TerminalSquare,
  },
  {
    to: "/scheduler",
    labelKey: "navigation.scheduler",
    icon: Clock3,
  },
  {
    to: "/notifications",
    labelKey: "navigation.notifications",
    icon: Bell,
  },
  {
    to: "/settings",
    labelKey: "navigation.settings",
    icon: Settings2,
  },
] as const;

function SidebarLink({ to, label, icon: Icon, isCollapsed, onNavigate }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end
      onClick={onNavigate}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
          isCollapsed ? "justify-center px-0" : "px-3",
          isActive
            ? "border border-sidebar-border/80 bg-sidebar-accent text-sidebar-foreground shadow-[0_12px_24px_-18px_rgba(7,10,18,0.7)]"
            : "text-sidebar-foreground/72 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )
      }
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
        <Icon className="h-4.5 w-4.5 shrink-0" />
      </div>
      {!isCollapsed && (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{label}</div>
        </div>
      )}
    </NavLink>
  );
}

function SidebarContent({
  isCollapsed,
  onToggleCollapse,
  onLogout,
  onNavigate,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-8 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent lg:flex"
        title={isCollapsed ? t("navigation.expand") : t("navigation.collapse")}
        type="button"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="px-5 py-6">
        <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "justify-center")}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/95 p-2 shadow-sm">
            <img src={logo} alt="DockSentinel" className="h-full w-full object-contain" />
          </div>

          {!isCollapsed ? (
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight text-sidebar-foreground">DockSentinel</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              label={t(item.labelKey)}
              icon={item.icon}
              isCollapsed={isCollapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </div>

      <div className="mt-auto px-5 py-6">
        {!isCollapsed ? (
          <div className="mb-4 border-white/8 p-4 text-sm text-sidebar-foreground/72">
            <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/55">
              {t("navigation.projectBlurb", { version: APP_VERSION })}{" "}
              <a
                href="https://github.com/leufrasiojunior/DockSentinel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub
              </a>
            </p>
          </div>
        ) : null}

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-center rounded-2xl border border-white/10 bg-white/7 text-sidebar-foreground hover:bg-white/12 hover:text-sidebar-foreground",
            !isCollapsed && "justify-start px-4",
          )}
          onClick={onLogout}
          type="button"
          title={isCollapsed ? t("navigation.logout") : undefined}
        >
          <LogOut className="size-4.5" />
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

  const currentNav = useMemo(() => {
    return (
      navItems.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) ??
      navItems[0]
    );
  }, [location.pathname]);
  const currentTitle = useMemo(() => t(currentNav.labelKey), [currentNav.labelKey, i18n.resolvedLanguage, t]);

  useEffect(() => {
    document.title = `DockSentinel | ${currentTitle}`;
  }, [currentTitle]);

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
