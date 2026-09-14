import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/fill";
import "@phosphor-icons/web/bold";
import "@phosphor-icons/web/duotone";
import "@/styles/globals.css";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>
);
