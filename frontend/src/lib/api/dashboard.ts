import { api } from "./client";
import type { DashboardResumen } from "@/lib/types/dashboard";

export const dashboardApi = {
  getResumen: (mes?: number) =>
    api.get<DashboardResumen>(
      mes ? `/api/dashboard/resumen?mes=${mes}` : "/api/dashboard/resumen",
    ),
};
