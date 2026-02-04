import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, ListChecks, CalendarClock, LogOut } from "lucide-react";
import { authApi } from "../api/auth";

function linkClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
    isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="w-72 bg-slate-900 text-white">
          <div className="px-6 py-6">
            <div className="text-xl font-semibold">DockSentinel</div>
            <div className="text-xs text-white/60">Docker updates sem Watchtower</div>
          </div>

          <nav className="px-4 pb-6 space-y-1">
            <NavLink to="/" className={linkClass} end>
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </NavLink>
            <NavLink to="/jobs" className={linkClass}>
              <ListChecks className="h-4 w-4" /> Jobs
            </NavLink>
            <NavLink to="/scheduler" className={linkClass}>
              <CalendarClock className="h-4 w-4" /> Scheduler
            </NavLink>

            <button
              className="mt-6 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              onClick={async () => {
                await authApi.logout();
                location.href = "/login";
              }}
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </nav>
        </aside>

        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
