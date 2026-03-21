import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "./app/router";
import { queryClient } from "./app/queryClient";
import "./i18n";

import "./index.css";
import { ToastProvider } from "./shared/components/ui/ToastProvider";
import { ConfirmProvider } from "./shared/components/ui/ConfirmProvider";
import { ThemeProvider } from "./shared/components/ui/ThemeProvider";
import { LocaleProvider } from "./shared/components/ui/LocaleProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <RouterProvider router={router} />
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
