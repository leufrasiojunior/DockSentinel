import { createBrowserRouter, Navigate } from "react-router-dom";

import { RequireAuth } from "../auth/RequireAuth";

import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { JobsPage } from "../pages/Jobs/JobsPage";
import { SchedulerPage } from "../pages/Scheduler/SchedulerPage";
import { LoginPage } from "../pages/Auth/LoginPage";
import { AppShell } from "../layouts/AppShell";
import { SetupPage } from "../pages/Setup/SetupPage";
import { SettingsPage } from "../pages/Settings/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  { path: "/setup", 
    element: <SetupPage /> 
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      // "/" → "/dashboard"
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // rotas reais
      { path: "dashboard", element: <DashboardPage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "scheduler", element: <SchedulerPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },

  // fallback para rotas desconhecidas
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
