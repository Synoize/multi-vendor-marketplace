import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVendorStore } from "../store/vendorStore";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import {
  Store,
  Building2,
  CreditCard,
  MapPin,
  FileText,
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle2,
  UploadCloud,
  ImagePlus,
  X,
} from "lucide-react";

const TABS = [
  { id: "store", label: "Store Profile", icon: <Store className="h-4 w-4" /> },
  {
    id: "business",
    label: "Business Details",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    id: "bank",
    label: "Bank Details",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: "pickup",
    label: "Pickup Address",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    id: "documents",
    label: "Documents",
    icon: <FileText className="h-4 w-4" />,
  },
];

const SECTION_LABELS = {
  business: "Business Details",
  bank: "Bank Details",
  pickup: "Pickup Address",
  documents: "Documents",
  store: "Store Profile",
};

const BUSINESS_TYPES = [
  "individual",
  "proprietorship",
  "partnership",
  "private_limited",
  "public_limited",
  "llp",
];

const DOC_FIELDS = [
  { key: "gst_certificate", label: "GST Certificate" },
  { key: "pan_image", label: "PAN Card" },
  { key: "aadhar_image_front", label: "Aadhaar (Front)" },
  { key: "aadhar_image_back", label: "Aadhaar (Back)" },
  { key: "passport_photo", label: "Passport Photo" },
  { key: "udyam_certificate", label: "Udyam Certificate" },
  { key: "bank_passbook", label: "Bank Passbook" },
  { key: "cancelled_cheque", label: "Cancelled Cheque" },
];

function PendingBadge({ status }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full bg-green-100 text-green-700">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
      <Clock className="h-3 w-3" /> Pending approval
    </span>
  );
}

function ApprovalNote({ section, pendingUpdates, onCancel }) {
  if (!pendingUpdates || pendingUpdates.length === 0) return null;
  const latest = pendingUpdates.find((p) => p.section === section);
  if (!latest) return null;
  if (latest.status === "approved") return null;

  const fieldsChanged = Object.keys(latest.changes || {}).length;

  if (latest.status === "rejected") {
    return (
      <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-bold text-red-600">
            Your {SECTION_LABELS[section] || section} update was rejected
          </p>
        </div>
        {latest.admin_note && (
          <p className="text-sm text-red-700 mt-1">
            Reason: {latest.admin_note}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-start justify-between gap-2 flex-wrap">
      <div>
        <p className="text-xs font-bold text-amber-700">
          {fieldsChanged} change{fieldsChanged > 1 ? "s" : ""} pending admin
          approval
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Requested{" "}
          {new Date(latest.created_at).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <button
        onClick={() => onCancel && onCancel(latest.id)}
        className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600"
      >
        <X className="h-3.5 w-3.5" /> Cancel request
      </button>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const fetchProfile = useVendorStore((state) => state.fetchProfile);
  const updateProfile = useVendorStore((state) => state.updateProfile);
  const updateStoreBranding = useVendorStore(
    (state) => state.updateStoreBranding
  );
  const submitPendingUpdate = useVendorStore(
    (state) => state.submitPendingUpdate
  );
  const submitPendingDocuments = useVendorStore(
    (state) => state.submitPendingDocuments
  );
  const fetchPendingUpdates = useVendorStore(
    (state) => state.fetchPendingUpdates
  );
  const cancelPendingUpdate = useVendorStore(
    (state) => state.cancelPendingUpdate
  );
  const [activeTab, setActiveTab] = useState("store");

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor-profile-settings"],
    queryFn: () => fetchProfile(),
  });

  const {
    data: pendingUpdates = [],
    isLoading: loadingUpdates,
  } = useQuery({
    queryKey: ["vendor-pending-updates"],
    queryFn: () => fetchPendingUpdates(),
  });

  const cancelPending = async (id) => {
    try {
      await cancelPendingUpdate(id);
      queryClient.invalidateQueries({ queryKey: ["vendor-pending-updates"] });
      toast.success("Update request cancelled");
    } catch {
      toast.error("Failed to cancel request");
    }
  };

  const [cancelTarget, setCancelTarget] = useState(null);

  const handleCancelPending = (id) => {
    setCancelTarget(id);
  };

  const confirmCancelPending = async () => {
    if (!cancelTarget) return;
    await cancelPending(cancelTarget);
    setCancelTarget(null);
  };

  const [formData, setFormData] = useState({
    store_name: "",
    store_description: "",
    business_name: "",
    business_type: "",
    business_email: "",
    gst_number: "",
    pan_number: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    account_holder: "",
    pickup_name: "",
    pickup_phone: "",
    pickup_line1: "",
    pickup_line2: "",
    pickup_city: "",
    pickup_state: "",
    pickup_pincode: "",
  });

  const [docFiles, setDocFiles] = useState({});

  useEffect(() => {
    if (vendor) {
      setFormData((prev) => ({
        ...prev,
        store_name: vendor.store_name || "",
        store_description: vendor.store_description || "",
        business_name: vendor.business_name || "",
        business_type: vendor.business_type || "",
        business_email: vendor.business_email || "",
        gst_number: vendor.gst_number || "",
        pan_number: vendor.pan_number || "",
        bank_name: vendor.bank_name || "",
        account_number: vendor.account_number || "",
        ifsc_code: vendor.ifsc_code || "",
        account_holder: vendor.account_holder || "",
        pickup_name: vendor.pickup_name || "",
        pickup_phone: vendor.pickup_phone || "",
        pickup_line1: vendor.pickup_line1 || "",
        pickup_line2: vendor.pickup_line2 || "",
        pickup_city: vendor.pickup_city || "",
        pickup_state: vendor.pickup_state || "",
        pickup_pincode: vendor.pickup_pincode || "",
      }));
    }
  }, [vendor]);

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["vendor-profile-settings"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-pending-updates"] });
  };

  const pendingMutation = useMutation({
    mutationFn: ({ section, changes }) =>
      submitPendingUpdate({ section, changes }),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.data?.message || "Submitted for admin approval");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to submit update");
    },
  });

  const docsMutation = useMutation({
    mutationFn: (formData) => submitPendingDocuments(formData),
    onSuccess: (res) => {
      invalidateAll();
      setDocFiles({});
      toast.success(res.data?.message || "Documents submitted for admin approval");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to submit documents");
    },
  });

  const [brandingKind, setBrandingKind] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const brandingMutation = useMutation({
    mutationFn: (formData) => updateStoreBranding(formData),
    onSuccess: (res) => {
      setBrandingKind(null);
      setLogoPreview(null);
      setBannerPreview(null);
      invalidateAll();
      toast.success(res.data?.message || "Store branding updated");
    },
    onError: (err) => {
      setBrandingKind(null);
      toast.error(err.response?.data?.message || "Failed to update branding");
    },
  });

  const handleBrandingSelect = (kind, file) => {
    if (!file) return;
    if (kind === "logo") {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setBannerPreview(URL.createObjectURL(file));
    }
    setBrandingKind(kind);
    const formData = new FormData();
    formData.append(kind, file);
    brandingMutation.mutate(formData);
  };

  const handleStoreUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({
        store_name: formData.store_name,
        store_description: formData.store_description,
      });
      invalidateAll();
      toast.success("Store profile updated successfully");
    } catch {
      toast.error("Failed to update store profile");
    }
  };

  const handlePendingSubmit = (e, section, fields) => {
    e.preventDefault();
    const changes = {};
    for (const key of fields) {
      if (formData[key] !== undefined && formData[key] !== null) {
        changes[key] = formData[key];
      }
    }
    pendingMutation.mutate({ section, changes });
  };

  const handleDocSubmit = (e) => {
    e.preventDefault();
    const form = new FormData();
    let count = 0;
    for (const [key, file] of Object.entries(docFiles)) {
      if (file) {
        form.append(key, file);
        count++;
      }
    }
    if (count === 0) {
      toast.error("Please select at least one document");
      return;
    }
    docsMutation.mutate(form);
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Store Settings</h1>
        <p className="text-sm text-secondary-800 mt-0.5">
          Store profile updates apply instantly. Changes to business, bank,
          pickup address, and documents are applied after admin approval.
        </p>
      </div>

      {/* Pending updates banner */}
      {!loadingUpdates && pendingUpdates.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#2874F0]" />
            <h3 className="text-sm font-bold text-gray-900">
              Update Requests ({pendingUpdates.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingUpdates.map((p) => (
              <div
                key={p.id}
                className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PendingBadge status={p.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {SECTION_LABELS[p.section] || p.section}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Object.keys(p.changes || {}).length} field
                      {Object.keys(p.changes || {}).length > 1 ? "s" : ""} ·{" "}
                      {new Date(p.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {p.status === "pending" && (
                  <button
                    onClick={() => cancelPending(p.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab Sidebar */}
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden py-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary-50 text-primary border-l-4 border-primary"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {activeTab === "store" && (
            <>
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2 mb-4">
                  Store Branding{" "}
                  <span className="ml-1 text-[10px] font-bold uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    Applies instantly
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Logo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Store Logo
                    </label>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="relative w-full h-28 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary bg-secondary/50 flex items-center justify-center overflow-hidden transition-colors"
                    >
                      {logoPreview || vendor?.store_logo ? (
                        <img
                          src={logoPreview || vendor?.store_logo}
                          alt="Store logo"
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-xs text-gray-500">
                          <ImagePlus className="h-6 w-6" /> Click to upload logo
                        </span>
                      )}
                      {brandingKind === "logo" &&
                        brandingMutation.isPending && (
                          <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </span>
                        )}
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleBrandingSelect("logo", e.target.files?.[0])
                      }
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Shown next to your store name (JPG, PNG, WEBP).
                    </p>
                  </div>

                  {/* Banner */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Store Banner
                    </label>
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="relative w-full h-28 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary bg-secondary/50 flex items-center justify-center overflow-hidden transition-colors"
                    >
                      {bannerPreview || vendor?.store_banner ? (
                        <img
                          src={bannerPreview || vendor?.store_banner}
                          alt="Store banner"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-xs text-gray-500">
                          <ImagePlus className="h-6 w-6" /> Click to upload
                          banner
                        </span>
                      )}
                      {brandingKind === "banner" &&
                        brandingMutation.isPending && (
                          <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </span>
                        )}
                    </button>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleBrandingSelect("banner", e.target.files?.[0])
                      }
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Wide banner shown at the top of your store.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleStoreUpdate} className="space-y-4">
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">
                Store Profile Details{" "}
                <span className="ml-1 text-[10px] font-bold uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                  Applies instantly
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.store_name}
                    onChange={(e) =>
                      handleFieldChange("store_name", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    KYC Status
                  </label>
                  <div className="mt-2.5">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
                        vendor?.kyc_status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {vendor?.kyc_status || "not_submitted"}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Store Description
                </label>
                <textarea
                  rows={4}
                  value={formData.store_description}
                  onChange={(e) =>
                    handleFieldChange("store_description", e.target.value)
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <button
                type="submit"
                className="bg-primary hover:bg-opacity-90 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors"
              >
                Save Profile
              </button>
            </form>
            </>
          )}

          {activeTab === "business" && (
            <form
              onSubmit={(e) =>
                handlePendingSubmit(
                  e,
                  "business",
                  [
                    "business_name",
                    "business_type",
                    "business_email",
                    "gst_number",
                    "pan_number",
                  ],
                )
              }
              className="space-y-4"
            >
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">
                Business & Store Details{" "}
                <span className="ml-1 text-[10px] font-bold uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  Needs admin approval
                </span>
              </h3>
              <ApprovalNote section="business" pendingUpdates={pendingUpdates} onCancel={handleCancelPending} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business_name}
                    onChange={(e) =>
                      handleFieldChange("business_name", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Business Type *
                  </label>
                  <select
                    value={formData.business_type}
                    onChange={(e) =>
                      handleFieldChange("business_type", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary capitalize"
                  >
                    <option value="" disabled>
                      Select type
                    </option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    value={formData.business_email}
                    onChange={(e) =>
                      handleFieldChange("business_email", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={(e) =>
                      handleFieldChange("gst_number", e.target.value.toUpperCase())
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={formData.pan_number}
                    onChange={(e) =>
                      handleFieldChange("pan_number", e.target.value.toUpperCase())
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={pendingMutation.isPending}
                className="bg-primary hover:bg-opacity-90 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {pendingMutation.isPending
                  ? "Submitting..."
                  : "Submit for Approval"}
              </button>
            </form>
          )}

          {activeTab === "bank" && (
            <form
              onSubmit={(e) =>
                handlePendingSubmit(
                  e,
                  "bank",
                  ["bank_name", "account_number", "ifsc_code", "account_holder"],
                )
              }
              className="space-y-4"
            >
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">
                Bank Settlement Details{" "}
                <span className="ml-1 text-[10px] font-bold uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  Needs admin approval
                </span>
              </h3>
              <ApprovalNote section="bank" pendingUpdates={pendingUpdates} onCancel={handleCancelPending} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Bank of India"
                    value={formData.bank_name}
                    onChange={(e) =>
                      handleFieldChange("bank_name", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="As registered in bank account"
                    value={formData.account_holder}
                    onChange={(e) =>
                      handleFieldChange("account_holder", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter complete bank account number"
                    value={formData.account_number}
                    onChange={(e) =>
                      handleFieldChange("account_number", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="11-character alphanumeric code"
                    value={formData.ifsc_code}
                    onChange={(e) =>
                      handleFieldChange("ifsc_code", e.target.value.toUpperCase())
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={pendingMutation.isPending}
                className="bg-primary hover:bg-opacity-90 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {pendingMutation.isPending
                  ? "Submitting..."
                  : "Submit for Approval"}
              </button>
            </form>
          )}

          {activeTab === "pickup" && (
            <form
              onSubmit={(e) =>
                handlePendingSubmit(
                  e,
                  "pickup",
                  [
                    "pickup_name",
                    "pickup_phone",
                    "pickup_line1",
                    "pickup_line2",
                    "pickup_city",
                    "pickup_state",
                    "pickup_pincode",
                  ],
                )
              }
              className="space-y-4"
            >
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">
                Pickup/Shipping Location{" "}
                <span className="ml-1 text-[10px] font-bold uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  Needs admin approval
                </span>
              </h3>
              <ApprovalNote section="pickup" pendingUpdates={pendingUpdates} onCancel={handleCancelPending} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_name}
                    onChange={(e) =>
                      handleFieldChange("pickup_name", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.pickup_phone}
                    onChange={(e) =>
                      handleFieldChange("pickup_phone", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_line1}
                    onChange={(e) =>
                      handleFieldChange("pickup_line1", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_line2}
                    onChange={(e) =>
                      handleFieldChange("pickup_line2", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_city}
                    onChange={(e) =>
                      handleFieldChange("pickup_city", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_state}
                    onChange={(e) =>
                      handleFieldChange("pickup_state", e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formData.pickup_pincode}
                    onChange={(e) =>
                      handleFieldChange(
                        "pickup_pincode",
                        e.target.value.replace(/\D/g, ""),
                      )
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={pendingMutation.isPending}
                className="bg-primary hover:bg-opacity-90 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {pendingMutation.isPending
                  ? "Submitting..."
                  : "Submit for Approval"}
              </button>
            </form>
          )}

          {activeTab === "documents" && (
            <form onSubmit={handleDocSubmit} className="space-y-4">
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">
                KYC Documents{" "}
                <span className="ml-1 text-[10px] font-bold uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  Needs admin approval
                </span>
              </h3>
              <ApprovalNote
                section="documents"
                pendingUpdates={pendingUpdates}
                onCancel={handleCancelPending}
              />
              <p className="text-sm text-gray-600">
                Upload replacement documents. They will be reviewed and applied
                by the admin. Existing documents remain active until approved.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DOC_FIELDS.map((doc) => (
                  <label
                    key={doc.key}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      docFiles[doc.key]
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {doc.label}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {docFiles[doc.key]
                            ? docFiles[doc.key].name
                            : vendor?.[doc.key]
                              ? "Replace current document"
                              : "No file selected"}
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDocFiles((prev) => ({ ...prev, [doc.key]: file }));
                        }
                      }}
                    />
                    {docFiles[doc.key] ? (
                      <span className="text-[10px] font-bold uppercase text-green-600">
                        Selected
                      </span>
                    ) : (
                      <UploadCloud className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
              <button
                type="submit"
                disabled={docsMutation.isPending}
                className="bg-primary hover:bg-opacity-90 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {docsMutation.isPending
                  ? "Uploading..."
                  : "Submit Documents for Approval"}
              </button>
            </form>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancelPending}
        title="Cancel Update Request?"
        description="This will discard the pending changes for this section. This action cannot be undone."
        confirmLabel="Cancel Request"
        variant="danger"
      />
    </div>
  );
}
