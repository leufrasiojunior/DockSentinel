import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth";
import { Button } from "./ui/Button";

function SidebarLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
          isActive
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white",
        ].join(" ")
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
      {label}
    </NavLink>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();

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
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="min-h-screen w-72 bg-slate-950 text-white flex flex-col">
          <div className="px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white p-2">
                <img
                  src="/logo.png"
                  alt="DockSentinel"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <div className="text-lg font-semibold leading-tight">
                  DockSentinel
                </div>
                <div className="mt-1 text-xs text-white/60">
                  Docker updates • UI
                </div>
              </div>
            </div>
          </div>

          <div className="px-3">
            <div className="rounded-xl bg-white/5 p-2">
              <nav className="space-y-1">
                <SidebarLink to="/dashboard" label="Dashboard" />
                <SidebarLink to="/jobs" label="Jobs" />
                <SidebarLink to="/scheduler" label="Scheduler" />
                <SidebarLink to="/settings" label="Settings" />
                
              </nav>
            </div>
          </div>

          <div className="mt-auto px-5 py-6">
            <Button
              variant="ghost"
              className="w-full bg-white/10 text-white hover:bg-white/15"
              onClick={handleLogout}
              type="button"
            >
              Sair
            </Button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="text-sm text-gray-600">DockSentinel</div>
              <div className="flex items-center gap-2" />
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
