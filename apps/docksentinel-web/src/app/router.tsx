import { createBrowserRouter, Navigate } from "react-router-dom";

import { RequireAuth } from "../auth/RequireAuth";

import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { JobsPage } from "../pages/Jobs/JobsPage";
import { SchedulerPage } from "../pages/Scheduler/SchedulerPage";
import { LoginPage } from "../pages/Auth/LoginPage";
import { AppShell } from "../layouts/AppShell";
import { SettingsPage } from "../pages/Settings/SettingsPage";
import { NotificationsPage } from "../pages/Notifications/NotificationsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/settings/environments" replace /> },

      { path: "environments", element: <Navigate to="/settings/environments" replace /> },
      { path: "environments/:environmentId/dashboard", element: <DashboardPage /> },
      { path: "environments/:environmentId/jobs", element: <JobsPage /> },
      { path: "environments/:environmentId/scheduler", element: <SchedulerPage /> },
      { path: "environments/:environmentId/notifications", element: <NotificationsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "settings/notifications", element: <SettingsPage /> },
      { path: "settings/environments", element: <SettingsPage /> },

      // compatibilidade local legada
      { path: "dashboard", element: <Navigate to="/environments/local/dashboard" replace /> },
      { path: "jobs", element: <Navigate to="/environments/local/jobs" replace /> },
      { path: "scheduler", element: <Navigate to="/environments/local/scheduler" replace /> },
      { path: "notifications", element: <Navigate to="/environments/local/notifications" replace /> },
    ],
  },

  // fallback para rotas desconhecidas
  { path: "*", element: <Navigate to="/settings/environments" replace /> },
]);
