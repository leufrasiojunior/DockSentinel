import { useMemo, useState } from "react";
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
              {t("navigation.projectBlurb")}{" "}
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentNav = useMemo(() => {
    return (
      navItems.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) ??
      navItems[0]
    );
  }, [location.pathname]);

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
            "sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r-2 border-sidebar-border/80 bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out lg:flex",
            isCollapsed ? "w-24" : "w-80",
          )}
        >
          <SidebarContent
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((current) => !current)}
            onLogout={handleLogout}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
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
                    {t(currentNav.labelKey)}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-4">
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    {t(currentNav.labelKey)}
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
            <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
