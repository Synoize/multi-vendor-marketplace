import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import {
  Settings as SettingsIcon,
  Percent,
  Truck,
  Store,
  Phone,
  Building2,
  Share2,
  ShieldAlert,
} from "lucide-react";

const DEFAULT_FORM = {
  // Financial
  commission_rate: "5",
  min_payout: "500",
  online_pay_off: "199",
  max_cart_qty: "10",
  // Fulfillment
  shipping_charge: "40",
  free_shipping_threshold: "499",
  cancel_window_minutes: "15",
  // Brand
  site_name: "Damini",
  site_tagline: "",
  site_domain: "",
  // Contact
  support_email: "",
  business_email: "",
  support_phone: "",
  whatsapp_number: "",
  working_hours: "",
  // Legal
  gstin: "",
  registered_address: "",
  // Social
  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  twitter_url: "",
  // Danger zone
  maintenance_mode: "false",
};

const inputClass =
  "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-secondary-600";

function Field({ label, required = false, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label} {required && "*"}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await api.get("/admin/settings");
      return res.data.data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm((f) => {
        const next = { ...f };
        Object.keys(DEFAULT_FORM).forEach((key) => {
          if (data[key] !== undefined && data[key] !== null) {
            next[key] = String(data[key]);
          }
        });
        return next;
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return api.put("/admin/settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Platform settings updated successfully");
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const updateField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" /> Platform Settings
        </h1>
        <p className="text-gray-500 text-sm">
          Configure branding, contact details, social links, commissions,
          shipping charges, and platform operational mode
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6"
      >
        {/* Section 1: Financial */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" /> Financial Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Standard Commission Rate (%)" required>
              <input
                type="number"
                required
                value={form.commission_rate}
                onChange={(e) => updateField("commission_rate", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Minimum Vendor Payout (₹)" required>
              <input
                type="number"
                required
                value={form.min_payout}
                onChange={(e) => updateField("min_payout", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="Online Payment Offer (₹ Off)"
              required
              hint="Customers automatically get this flat discount when they pay online (UPI / Cards / Net Banking). Set 0 to disable."
            >
              <input
                type="number"
                min="0"
                required
                value={form.online_pay_off}
                onChange={(e) => updateField("online_pay_off", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Max Quantity per Cart Item" required>
              <input
                type="number"
                min="1"
                required
                value={form.max_cart_qty}
                onChange={(e) => updateField("max_cart_qty", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Section 2: Fulfillment */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Shipping &amp;
            Fulfillment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Default Shipping Charge (₹)" required>
              <input
                type="number"
                required
                value={form.shipping_charge}
                onChange={(e) => updateField("shipping_charge", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Free Shipping Threshold (₹)" required>
              <input
                type="number"
                required
                value={form.free_shipping_threshold}
                onChange={(e) =>
                  updateField("free_shipping_threshold", e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="Customer Cancel Window (minutes)" required>
              <input
                type="number"
                required
                value={form.cancel_window_minutes}
                onChange={(e) =>
                  updateField("cancel_window_minutes", e.target.value)
                }
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Section 3: Brand */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" /> Brand &amp; Identity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Site / Platform Name" required>
              <input
                type="text"
                required
                value={form.site_name}
                onChange={(e) => updateField("site_name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Site Tagline">
              <input
                type="text"
                value={form.site_tagline}
                onChange={(e) => updateField("site_tagline", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="Site Domain"
              hint="Shown in the footer copyright line, e.g. thedaminiedit.com"
            >
              <input
                type="text"
                value={form.site_domain}
                onChange={(e) => updateField("site_domain", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Section 4: Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Contact Information
          </h3>
          <p className="text-xs text-gray-400 -mt-2">
            Displayed across the storefront footer, Contact Us page, and
            corporate information page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Support Email (Customer Care)" required>
              <input
                type="email"
                required
                value={form.support_email}
                onChange={(e) => updateField("support_email", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Business Enquiries Email">
              <input
                type="email"
                value={form.business_email}
                onChange={(e) => updateField("business_email", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Support Phone" required>
              <input
                type="text"
                required
                value={form.support_phone}
                onChange={(e) => updateField("support_phone", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="WhatsApp Number"
              hint="With country code, no + sign — used for the wa.me link"
            >
              <input
                type="text"
                value={form.whatsapp_number}
                onChange={(e) =>
                  updateField("whatsapp_number", e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="Working Hours">
              <input
                type="text"
                value={form.working_hours}
                onChange={(e) => updateField("working_hours", e.target.value)}
                placeholder="Mon – Sat : 9:00 AM – 8:00 PM"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Section 5: Legal */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Legal &amp; Registered
            Office
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <Field label="GSTIN">
              <input
                type="text"
                value={form.gstin}
                onChange={(e) => updateField("gstin", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Registered Office Address">
              <textarea
                rows={2}
                value={form.registered_address}
                onChange={(e) =>
                  updateField("registered_address", e.target.value)
                }
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Section 6: Social */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" /> Social Links
          </h3>
          <p className="text-xs text-gray-400 -mt-2">
            Leave empty to hide that icon from the storefront footer.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Facebook URL">
              <input
                type="url"
                value={form.facebook_url}
                onChange={(e) => updateField("facebook_url", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Instagram URL">
              <input
                type="url"
                value={form.instagram_url}
                onChange={(e) => updateField("instagram_url", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="YouTube URL">
              <input
                type="url"
                value={form.youtube_url}
                onChange={(e) => updateField("youtube_url", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Twitter / X URL">
              <input
                type="url"
                value={form.twitter_url}
                onChange={(e) => updateField("twitter_url", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Section 7: Danger Zone */}
        <div className="space-y-4 pt-2 border-t border-gray-100">
          <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Danger Zone
          </h3>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-900 text-sm">
                Site Maintenance Mode
              </p>
              <p className="text-xs text-gray-500">
                Temporarily disable storefront access for updates
              </p>
            </div>
            <select
              value={form.maintenance_mode}
              onChange={(e) => updateField("maintenance_mode", e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50"
            >
              <option value="false">Operational (Live)</option>
              <option value="true">Maintenance Mode</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-primary hover:bg-opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
