import { create } from "zustand";
import api from "@/lib/axios";

// Mirrors server/src/database/default-settings.js — used until the API
// responds and as fallback if the API is unreachable.
export const DEFAULT_SETTINGS = {
  site_name: "The Damini Edit",
  site_tagline: "India's Favourite Marketplace",
  site_domain: "thedaminiedit.com",
  support_email: "supportthedaminiedit@gmail.com",
  business_email: "thedaminiedit3094@gmail.com",
  support_phone: "+91 8485833094",
  whatsapp_number: "918485833094",
  registered_address:
    "Opposite Chubeji Katiya Bhandar, Gittikhadan Chowk, Nagpur, Maharashtra – 440013, India",
  gstin: "27AYDPT0267H1Z9",
  working_hours: "Mon – Sat : 9:00 AM – 8:00 PM",
  facebook_url: "https://www.facebook.com/share/1XqTtsPwgG/",
  instagram_url: "https://www.instagram.com/the_damini_edit",
  youtube_url: "https://www.youtube.com/@thedaminiedit",
  twitter_url: "",
  free_shipping_threshold: "499",
  shipping_charge: "40",
  online_pay_off: "199",
  max_cart_qty: "10",
  cancel_window_minutes: "15",
  maintenance_mode: "false",
};

export const useSettingsStore = create((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  // Fetch public platform settings and cache them in the store.
  // Safe to call from multiple components — the store dedupes via `loaded`.
  fetchPublic: async () => {
    if (get().loaded) return get().settings;
    try {
      const r = await api.get("/settings");
      const data = r.data.data || {};
      set({ settings: { ...DEFAULT_SETTINGS, ...data }, loaded: true });
      return get().settings;
    } catch {
      return get().settings; // fall back to defaults
    }
  },
}));

// Convenience selector hook for components.
export const useSettings = () => useSettingsStore((s) => s.settings);
