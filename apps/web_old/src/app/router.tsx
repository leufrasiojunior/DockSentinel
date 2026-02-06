import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AppShell } from "../components/AppShell";
import { LoginPage } from "../pages/Login";
import { DashboardPage } from "../pages/Dashboard";
import { JobsPage } from "../pages/Jobs";
import { SchedulerPage } from "../pages/Scheduler";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/jobs", element: <JobsPage /> },
          { path: "/scheduler", element: <SchedulerPage /> },
        ],
      },
    ],
  },
]);
