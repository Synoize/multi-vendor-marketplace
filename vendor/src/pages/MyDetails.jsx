import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useVendorStore } from "../store/vendorStore";
import { useDashboardStore } from "../store/dashboardStore";
import api from "../lib/axios";
import Spinner from "../components/ui/Spinner";
import { assets } from "../assets/assets";
import {
  User,
  Store,
  ShieldCheck,
  CreditCard,
  MapPin,
  Package,
  ShoppingCart,
  IndianRupee,
  Activity,
  Mail,
  Phone,
  Hash,
  Calendar,
  BadgeCheck,
  FileText,
  Building2,
  Landmark,
  Star,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const KYC_STYLES = {
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  under_review: "bg-amber-100 text-amber-700",
  submitted: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-gray-600",
};

const BUSINESS_TYPES = {
  individual: "Individual",
  proprietorship: "Proprietorship",
  partnership: "Partnership",
  private_limited: "Private Limited",
  public_limited: "Public Limited",
  llp: "LLP",
};

const KYC_DOCS = [
  { label: "GST Certificate", field: "gst_certificate" },
  { label: "PAN Card", field: "pan_image" },
  { label: "Aadhaar (Front)", field: "aadhar_image_front" },
  { label: "Aadhaar (Back)", field: "aadhar_image_back" },
  { label: "Passport Photo", field: "passport_photo" },
  { label: "Udyam Certificate", field: "udyam_certificate" },
  { label: "Bank Passbook", field: "bank_passbook" },
];

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div className="py-2 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 border-b border-dashed border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-500 sm:w-52 flex-shrink-0 uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-sm text-gray-900 break-all ${
          mono ? "font-mono" : "font-medium"
        }`}
      >
        {value || <span className="text-gray-400">—</span>}
      </span>
    </div>
  );
}

function Badge({ children, className = "bg-gray-100 text-gray-600" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, prefix }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-semibold">{label}</p>
        <p className="text-lg font-bold text-gray-900 truncate">
          {prefix}
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function maskAccountNumber(value) {
  if (!value) return null;
  const s = String(value);
  return s.length > 4 ? `•••• •••• ${s.slice(-4)}` : "•".repeat(s.length);
}

export default function MyDetails() {
  const fetchProfile = useVendorStore((state) => state.fetchProfile);
  const fetchDashboard = useDashboardStore((state) => state.fetchDashboard);

  const {
    data: vendor,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["my-details-vendor"],
    queryFn: () => fetchProfile(),
  });

  const { data: user } = useQuery({
    queryKey: ["my-details-user"],
    queryFn: async () => {
      const { data } = await api.get("/users/me/profile");
      return data.data || data;
    },
  });

  const { data: dashboard } = useQuery({
    queryKey: ["my-details-stats"],
    queryFn: () => fetchDashboard(),
  });

  const stats = dashboard?.stats || {};

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );

  if (isError)
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
        <p className="text-sm text-gray-600 mb-3">
          Could not load your details. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 text-sm font-bold text-white bg-primary px-4 py-2 rounded-lg"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );

  const kycDocs = KYC_DOCS.filter((doc) => vendor?.[doc.field]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute right-16 -bottom-10 w-32 h-32 bg-white/10 rounded-full" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative">
          <div className="w-16 h-16 rounded-2xl bg-white/90 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {vendor?.store_logo ? (
              <img
                src={vendor.store_logo}
                alt={vendor.store_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={assets.logoIcon} alt="Store" className="h-10" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold truncate">
                {vendor?.store_name || vendor?.business_name || "My Store"}
              </h1>
              {vendor?.is_featured == 1 && (
                <Badge className="bg-amber-400 text-amber-950">
                  <Star className="h-3 w-3" /> Featured
                </Badge>
              )}
              {vendor?.is_active == 1 ? (
                <Badge className="bg-green-500/80 text-white">Active</Badge>
              ) : (
                <Badge className="bg-red-500/80 text-white">Disabled</Badge>
              )}
            </div>
            <p className="text-sm text-white/80 mt-0.5">
              {vendor?.business_name || vendor?.store_name}
              {vendor?.business_type
                ? ` · ${BUSINESS_TYPES[vendor.business_type] || vendor.business_type}`
                : ""}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-300 fill-amber-300" />
                <b>{Number(vendor?.rating || 0).toFixed(1)}</b>
              </span>
              <span className="text-white/70">
                ₹{Number(vendor?.total_sales || 0).toLocaleString("en-IN")}{" "}
                lifetime sales
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Badge
              className={KYC_STYLES[vendor?.kyc_status] || KYC_STYLES.pending}
            >
              <ShieldCheck className="h-3 w-3" />
              KYC: {vendor?.kyc_status || "pending"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Products"
          value={stats.total_products}
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.total_orders}
        />
        <StatCard
          icon={IndianRupee}
          label="Revenue (Delivered)"
          value={Number(stats.total_revenue || 0).toLocaleString("en-IN")}
          prefix="₹"
        />
        <StatCard
          icon={Activity}
          label="Active Orders"
          value={stats.active_orders}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Details */}
        <Section
          icon={User}
          title="Account Details"
          subtitle="Your login & personal information"
        >
          <DetailRow
            label="Full Name"
            value={user?.name || vendor?.owner_name}
          />
          <DetailRow label="Email" value={user?.email || vendor?.email} />
          <DetailRow label="Phone" value={user?.phone || vendor?.phone} />
          <DetailRow label="Role" value={user?.role} />
          <DetailRow
            label="Email Verified"
            value={user?.is_verified ? "Yes" : "No"}
          />
          <DetailRow label="Referral Code" value={user?.referral_code} />
          <DetailRow
            label="Member Since"
            value={formatDate(user?.created_at)}
          />
          <DetailRow label="User ID" value={user?.id} mono />
        </Section>

        {/* Business / Store Details */}
        <Section
          icon={Store}
          title="Business & Store Details"
          subtitle="Your registered business information"
        >
          <DetailRow label="Store Name" value={vendor?.store_name} />
          <DetailRow label="Business Name" value={vendor?.business_name} />
          <DetailRow
            label="Business Type"
            value={
              (vendor?.business_type && BUSINESS_TYPES[vendor.business_type]) ||
              vendor?.business_type
            }
          />
          <DetailRow
            label="Business Email"
            value={
              vendor?.business_email
                ? `${vendor.business_email} ${
                    vendor.business_email_verified
                      ? "✓ verified"
                      : "(unverified)"
                  }`
                : null
            }
          />
          <DetailRow label="GST Number" value={vendor?.gst_number} mono />
          <DetailRow label="PAN Number" value={vendor?.pan_number} mono />
          <DetailRow
            label="Commission Rate"
            value={`${Number(vendor?.commission_rate || 0)}%`}
          />
          <DetailRow
            label="Store Description"
            value={vendor?.store_description}
          />
        </Section>

        {/* KYC Status */}
        <Section
          icon={ShieldCheck}
          title="KYC Verification"
          subtitle="Verification status and uploaded documents"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </span>
            <Badge
              className={KYC_STYLES[vendor?.kyc_status] || KYC_STYLES.pending}
            >
              {vendor?.kyc_status || "pending"}
            </Badge>
          </div>
          {vendor?.kyc_status === "rejected" && vendor?.kyc_rejected_reason && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-xs font-bold text-red-600 mb-1">
                Rejection reason
              </p>
              <p className="text-sm text-red-700">
                {vendor.kyc_rejected_reason}
              </p>
            </div>
          )}
          {kycDocs.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <FileText className="h-4 w-4 text-gray-400" />
              No documents uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {kycDocs.map((doc) => (
                <a
                  key={doc.field}
                  href={`/api/v1/vendors/kyc/${vendor[doc.field].split("/").pop()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-100 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 group-hover:text-primary">
                    <FileText className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                    {doc.label}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary" />
                </a>
              ))}
            </div>
          )}
        </Section>

        {/* Bank Details */}
        <Section
          icon={CreditCard}
          title="Bank Settlement Details"
          subtitle="Account used for payouts"
        >
          <DetailRow label="Bank Name" value={vendor?.bank_name} />
          <DetailRow label="Account Holder" value={vendor?.account_holder} />
          <DetailRow
            label="Account Number"
            value={maskAccountNumber(vendor?.account_number)}
            mono
          />
          <DetailRow label="IFSC Code" value={vendor?.ifsc_code} mono />
          {vendor?.cancelled_cheque && (
            <DetailRow
              label="Cancelled Cheque"
              value={
                <a
                  href={`/api/v1/vendors/kyc/${vendor.cancelled_cheque
                    .split("/")
                    .pop()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary font-semibold"
                >
                  View document <ExternalLink className="h-3 w-3" />
                </a>
              }
            />
          )}
        </Section>
      </div>

      {/* Pickup Address */}
      <Section
        icon={MapPin}
        title="Pickup / Shipping Address"
        subtitle="Address used for order pickups"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <DetailRow label="Contact Name" value={vendor?.pickup_name} />
            <DetailRow label="Contact Phone" value={vendor?.pickup_phone} />
          </div>
          <div>
            <DetailRow label="Address Line 1" value={vendor?.pickup_line1} />
            <DetailRow label="Address Line 2" value={vendor?.pickup_line2} />
            <DetailRow
              label="City / State"
              value={
                vendor?.pickup_city || vendor?.pickup_state
                  ? `${vendor?.pickup_city || "—"}, ${vendor?.pickup_state || "—"}`
                  : null
              }
            />
            <DetailRow label="Pincode" value={vendor?.pickup_pincode} mono />
          </div>
        </div>
      </Section>
    </div>
  );
}
