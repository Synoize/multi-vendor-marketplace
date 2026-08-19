import { create } from "zustand";
import api from "@/lib/axios";

export const useSettingsStore = create(() => ({
  fetchPublic: () => api.get("/settings").then((r) => r.data.data || {}),
}));
