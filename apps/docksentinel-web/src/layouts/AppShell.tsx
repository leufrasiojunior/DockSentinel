import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

import { logout } from "../features/auth/api/auth";
import { NotificationCenter } from "../features/notifications/components/NotificationCenter";
import { Badge } from "../components/ui/badge";
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
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Containers, updates e ações operacionais.",
    badge: "Ops",
  },
  {
    to: "/jobs",
    label: "Jobs",
    icon: TerminalSquare,
    description: "Fila, histórico e execução do updater.",
    badge: "Queue",
  },
  {
    to: "/scheduler",
    label: "Scheduler",
    icon: Clock3,
    description: "Agendamento, cron e runtime do scan.",
    badge: "Automation",
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    description: "Fluxo in-app e histórico operacional.",
    badge: "Events",
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings2,
    description: "Autenticação, SMTP e defaults globais.",
    badge: "Control",
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
  return (
    <>
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-8 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent lg:flex"
        title={isCollapsed ? "Expandir" : "Recolher"}
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
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-sidebar-foreground/55">
                Docker control plane
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {!isCollapsed ? (
        <div className="px-5 pb-6">
          <div className="rounded-[1.75rem] border border-white/8 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
              <Sparkles className="size-3.5" />
              Observability-first UI
            </div>
            <p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/72">
              Operação de containers, jobs e notificações em um fluxo único e legível.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              isCollapsed={isCollapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </div>

      <div className="mt-auto px-5 py-6">
        {!isCollapsed ? (
          <div className="mb-4 rounded-[1.5rem] border border-white/8 bg-white/5 p-4 text-sm text-sidebar-foreground/72">
            <div className="flex items-center justify-between gap-3">
              <span>Theme & alerts</span>
              <Badge variant="info">Live</Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/55">
              O header concentra tema, notificações e contexto da rota ativa.
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
          title={isCollapsed ? "Sair" : undefined}
        >
          <LogOut className="size-4.5" />
          {!isCollapsed ? <span>Sair</span> : null}
        </Button>
      </div>
    </>
  );
}

export function AppShell() {
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
                    <Button variant="outline" size="icon-sm" aria-label="Abrir navegação">
                      <Menu className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="max-w-sm border-sidebar-border/80 bg-sidebar text-sidebar-foreground">
                    <SheetHeader className="border-b border-sidebar-border/80 pb-5">
                      <SheetTitle className="text-sidebar-foreground">DockSentinel</SheetTitle>
                      <SheetDescription className="text-sidebar-foreground/65">
                        Navegação principal do painel operacional.
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
                  <Badge variant="outline">{currentNav.badge}</Badge>
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {currentNav.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-4">
                  <div className="text-lg font-semibold tracking-tight text-foreground">{currentNav.label}</div>
                  <div className="text-sm text-muted-foreground">{currentNav.description}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
