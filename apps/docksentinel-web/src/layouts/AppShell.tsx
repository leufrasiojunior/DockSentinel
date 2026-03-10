import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "../features/auth/api/auth";
import { Button } from "../shared/components/ui/Button";
import { NotificationsBridge } from "./NotificationsBridge";
import { NotificationCenter } from "../features/notifications/components/NotificationCenter";
import { ThemeToggle } from "../shared/components/ui/ThemeToggle";
import { cn } from "../shared/lib/utils/cn";

import { 
  LayoutDashboard, 
  Terminal, 
  Clock, 
  Bell, 
  Settings, 
  FlaskConical, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  type LucideIcon,

} from "lucide-react";

import logo from '../assets/logo2.png'

interface SidebarLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  isCollapsed: boolean;
}

function SidebarLink({ to, label, icon: Icon, isCollapsed }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
          isCollapsed ? "justify-center px-0" : "px-3",
          isActive
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      // MUITO importante para não “vazar” dados de sessão anterior
      qc.clear();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="flex">
        {/* Sidebar */}
        <aside 
          className={cn(
            "sticky top-0 h-screen bg-slate-950 text-white flex flex-col transition-all duration-300 ease-in-out z-20 shrink-0",
            isCollapsed ? "w-20" : "w-72"
          )}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-10 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-white shadow-md transition-colors hover:bg-slate-900 cursor-pointer"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className="px-5 py-6 shrink-0">
            <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "justify-center")}>
              <div className="h-10 w-10 shrink-0 rounded-xl bg-white p-2">
                <img
                  src={logo}
                  alt="DockSentinel"
                  className="h-full w-full object-contain"
                />
              </div>

              {!isCollapsed && (
                <div className="transition-opacity duration-300">
                  <div className="text-lg font-semibold leading-tight whitespace-nowrap">
                    DockSentinel
                  </div>
                  <div className="mt-1 text-xs text-white/60 whitespace-nowrap">
                    Docker updates • UI
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-3 grow overflow-y-auto scrollbar-hide">
            <div className="rounded-xl bg-white/5 p-2">
              <nav className="space-y-1">
                <SidebarLink to="/dashboard" label="Dashboard" icon={LayoutDashboard} isCollapsed={isCollapsed} />
                <SidebarLink to="/jobs" label="Jobs" icon={Terminal} isCollapsed={isCollapsed} />
                <SidebarLink to="/scheduler" label="Scheduler" icon={Clock} isCollapsed={isCollapsed} />
                <SidebarLink to="/notifications" label="Notifications" icon={Bell} isCollapsed={isCollapsed} />
                <SidebarLink to="/settings" label="Settings" icon={Settings} isCollapsed={isCollapsed} />
                <SidebarLink to="/teste" label="teste" icon={FlaskConical} isCollapsed={isCollapsed} />
              </nav>
            </div>
          </div>

          <div className="mt-auto px-5 py-6 shrink-0">
            <Button
              variant="ghost"
              className={cn(
                "w-full bg-white/10 text-white hover:bg-white/15 transition-all duration-200",
                isCollapsed ? "px-0 justify-center" : "px-4"
              )}
              onClick={handleLogout}
              type="button"
              title={isCollapsed ? "Sair" : undefined}
            >
              <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
              {!isCollapsed && "Sair"}
            </Button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <NotificationsBridge />
          <header className="sticky top-0 z-10 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">DockSentinel</div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <NotificationCenter />
              </div>
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
