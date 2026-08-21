import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  ArrowLeft,
  Store,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Ban,
  ExternalLink,
  Building,
  CreditCard,
  Calendar,
  User,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";
import api from "../lib/axios";
import StatusBadge from "../components/ui/StatusBadge";
import Spinner from "../components/ui/Spinner";
import ConfirmDialog from "../components/ui/ConfirmDialog";

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        {label}
      </span>
      <div
        className={`text-sm text-gray-900 text-right max-w-xs ${
          mono ? "font-mono" : ""
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function maskAccount(num) {
  if (!num) return "—";
  const s = String(num);
  return s.slice(0, 4) + "•".repeat(Math.max(0, s.length - 8)) + s.slice(-4);
}

function MaskedValue({ value }) {
  if (!value) return "—";
  return (
    <span
      className="group relative inline-flex items-center cursor-pointer font-mono"
      title="Hover to reveal"
    >
      <span className="group-hover:hidden">{maskAccount(value)}</span>
      <span className="hidden group-hover:inline">{String(value)}</span>
    </span>
  );
}

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [updateRejectOpen, setUpdateRejectOpen] = useState(false);
  const [updateRejectNote, setUpdateRejectNote] = useState("");
  const [activeUpdate, setActiveUpdate] = useState(null);

  const {
    data: vendor,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-vendor", id],
    queryFn: async () => {
      const res = await api.get(`/admin/vendors/${id}`);
      return res.data?.data || res.data || {};
    },
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries(["admin-vendor", id]);
    queryClient.invalidateQueries(["admin-vendors"]);
  };

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ["admin-vendor-pending-updates", id],
    queryFn: async () => {
      const res = await api.get(
        `/admin/vendors/pending-updates?vendor_id=${id}&limit=50`,
      );
      return res.data?.data?.updates || res.data?.updates || [];
    },
    enabled: !!id,
  });

  const approveUpdateMutation = useMutation({
    mutationFn: (updateId) =>
      api.post(`/admin/vendors/pending-updates/${updateId}/approve`),
    onSuccess: () => {
      toast.success("Update approved and applied");
      invalidate();
      queryClient.invalidateQueries(["admin-vendor-pending-updates", id]);
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to approve update"),
  });

  const rejectUpdateMutation = useMutation({
    mutationFn: (updateId) =>
      api.post(`/admin/vendors/pending-updates/${updateId}/reject`, {
        note: updateRejectNote,
      }),
    onSuccess: () => {
      toast.success("Update rejected");
      setUpdateRejectOpen(false);
      setUpdateRejectNote("");
      setActiveUpdate(null);
      invalidate();
      queryClient.invalidateQueries(["admin-vendor-pending-updates", id]);
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to reject update"),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.patch(`/admin/vendors/${id}/approve`),
    onSuccess: () => {
      toast.success("Vendor approved successfully");
      invalidate();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to approve vendor"),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.patch(`/admin/vendors/${id}/reject`, { reason: rejectReason }),
    onSuccess: () => {
      toast.success("Vendor rejected");
      setRejectOpen(false);
      setRejectReason("");
      invalidate();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to reject vendor"),
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      api.patch(`/admin/vendors/${id}/suspend`, { reason: suspendReason }),
    onSuccess: () => {
      toast.success("Vendor suspended");
      setSuspendOpen(false);
      setSuspendReason("");
      invalidate();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to suspend vendor"),
  });

  const unsuspendMutation = useMutation({
    mutationFn: () => api.patch(`/admin/vendors/${id}/unsuspend`),
    onSuccess: () => {
      toast.success("Vendor reinstated");
      invalidate();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to reinstate vendor"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-gray-900 font-semibold">Vendor not found</p>
        <button
          onClick={() => navigate("/vendors")}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Vendors
        </button>
      </div>
    );
  }

  const kycStatus = vendor.kyc_status || "not_submitted";
  const isSuspended = vendor.is_suspended || vendor.kyc_status === "suspended";
  const DOC_LABELS = [
    { key: "passport_photo", label: "Passport Size Photo" },
    { key: "pan_image", label: "PAN Card" },
    { key: "aadhar_image_front", label: "Aadhaar (Front)" },
    { key: "aadhar_image_back", label: "Aadhaar (Back)" },
    { key: "udyam_certificate", label: "Udyam Certificate" },
    { key: "gst_certificate", label: "GST Certificate" },
    { key: "bank_passbook", label: "Bank Passbook" },
    { key: "cancelled_cheque", label: "Cancelled Cheque" },
  ];
  const docs = DOC_LABELS.map(({ key, label }) => ({
    label,
    path: vendor[key] || null,
    filename: vendor[key] ? vendor[key].split("/").pop() : null,
  })).filter((d) => d.path);

  return (
    <>
      <Helmet>
        <title>{vendor.store_name || "Vendor"} — Damini Admin</title>
      </Helmet>
      <div className="bg-gray-50/80 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/vendors")}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                  {vendor.store_name}
                </h1>
                <StatusBadge status={kycStatus} />
                {isSuspended && <StatusBadge status="suspended" />}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">
                {vendor.business_name}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {kycStatus === "pending" && (
                <>
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
                  >
                    {approveMutation.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}
              {!isSuspended && kycStatus === "approved" && (
                <button
                  onClick={() => setSuspendOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  <Ban className="w-4 h-4" />
                  Suspend
                </button>
              )}
              {isSuspended && (
                <button
                  onClick={() => unsuspendMutation.mutate()}
                  disabled={unsuspendMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
                >
                  {unsuspendMutation.isPending ? (
                    <Spinner size="sm" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Reinstate
                </button>
              )}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Store & Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Store Info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <Store className="w-4 h-4 text-blue-500" /> Store Information
                </h3>
                <InfoRow label="Store Name" value={vendor.store_name} />
                <InfoRow label="Business Name" value={vendor.business_name} />
                <InfoRow label="Business Type" value={vendor.business_type} />
                <InfoRow
                  label="Business Email"
                  value={
                    <div className="flex items-center gap-2 justify-end">
                      <span>{vendor.business_email}</span>
                      {vendor.business_email_verified ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                          Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          Not verified
                        </span>
                      )}
                    </div>
                  }
                />
                <InfoRow label="GST Number" value={vendor.gst_number} mono />
                <InfoRow label="PAN Number" value={vendor.pan_number} mono />
                <InfoRow
                  label="FSSAI Number"
                  value={vendor.fssai_number}
                  mono
                />
                <InfoRow
                  label="Commission Rate"
                  value={
                    vendor.commission_rate !== undefined
                      ? `${vendor.commission_rate}%`
                      : null
                  }
                />
                <InfoRow
                  label="Store Description"
                  value={vendor.store_description}
                />
                {vendor.store_logo && (
                  <InfoRow
                    label="Store Logo"
                    value={
                      <a
                        href={vendor.store_logo}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View
                      </a>
                    }
                  />
                )}
                {vendor.store_banner && (
                  <InfoRow
                    label="Store Banner"
                    value={
                      <a
                        href={vendor.store_banner}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View
                      </a>
                    }
                  />
                )}
                {vendor.kyc_rejected_reason && (
                  <InfoRow
                    label="Rejection Reason"
                    value={vendor.kyc_rejected_reason}
                  />
                )}
              </div>

              {/* Contact Info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-blue-500" /> Contact & Location
                </h3>
                <InfoRow
                  label="Owner Name"
                  value={vendor.owner_name || vendor.user?.name}
                />
                <InfoRow
                  label="Email"
                  value={vendor.email || vendor.user?.email}
                />
                <InfoRow
                  label="Phone"
                  value={vendor.phone || vendor.user?.phone}
                />
                <InfoRow
                  label="Role"
                  value={
                    <StatusBadge
                      status={vendor.user_role || "customer"}
                      label={vendor.user_role || "customer"}
                    />
                  }
                />
                <InfoRow
                  label="Account Status"
                  value={
                    vendor.user_active ? (
                      <span className="text-emerald-600 font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium">Inactive</span>
                    )
                  }
                />
                <InfoRow label="Pickup Contact" value={vendor.pickup_name} />
                <InfoRow
                  label="Pickup Phone"
                  value={vendor.pickup_phone}
                  mono
                />
                <InfoRow
                  label="Pickup Address"
                  value={`${vendor.pickup_line1 || ""}${vendor.pickup_line2 ? `, ${vendor.pickup_line2}` : ""}`.trim()}
                />
                <InfoRow label="City" value={vendor.pickup_city} />
                <InfoRow label="State" value={vendor.pickup_state} />
                <InfoRow label="Pincode" value={vendor.pickup_pincode} mono />
                <InfoRow
                  label="Joined"
                  value={
                    vendor.created_at
                      ? new Date(vendor.created_at).toLocaleDateString(
                          "en-IN",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : null
                  }
                />
              </div>

              {/* Bank Details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-blue-500" /> Bank Details
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    (masked)
                  </span>
                </h3>
                <InfoRow label="Account Holder" value={vendor.account_holder} />
                <InfoRow
                  label="Account Number"
                  value={<MaskedValue value={vendor.account_number} />}
                />
                <InfoRow label="IFSC Code" value={vendor.ifsc_code} mono />
                <InfoRow label="Bank Name" value={vendor.bank_name} />
              </div>
            </div>

            {/* Right: KYC Documents & Stats */}
            <div className="space-y-6">
              {/* KYC Documents */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-blue-500" /> KYC Documents
                </h3>
                {docs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      No documents uploaded
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {docs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 border border-gray-100 rounded-xl"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 break-words line-clamp-1">
                              {doc.label}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 break-all line-clamp-1">
                              {doc.filename || "File"}
                            </p>
                          </div>
                          <a
                            href={`/api/v1/admin/vendors/${id}/documents/${doc.filename}`}
                            target="_blank"
                            rel="noreferrer"
                            title="View document"
                            className="flex-shrink-0 p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Performance
                </h3>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-400">Total Sales</span>
                  <span className="text-sm font-semibold text-emerald-600">
                    ₹{(Number(vendor.total_sales) || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-400">Total Reviews</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {(vendor.total_reviews || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-gray-400">Rating</span>
                  <span className="text-sm font-semibold text-amber-500">
                    {(Number(vendor.rating) || 0).toFixed(1)} ⭐
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Update Requests */}
          {!pendingLoading && pendingData && pendingData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-amber-500" /> Pending Update
                Requests
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-gray-400">
                  <RefreshCw className="w-3.5 h-3.5" /> Vendor-initiated changes
                  awaiting review
                </span>
              </h3>
              <div className="space-y-3">
                {pendingData.map((upd) => {
                  const changes = upd.changes || {};
                  const entries = Object.entries(changes);
                  return (
                    <div
                      key={upd.id}
                      className={`p-4 rounded-xl border ${
                        upd.status === "pending"
                          ? "bg-amber-50 border-amber-200"
                          : upd.status === "rejected"
                            ? "bg-red-50 border-red-200"
                            : "bg-emerald-50 border-emerald-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide px-2.5 py-1 rounded-full bg-gray-100">
                            {upd.section}
                          </span>
                          <StatusBadge status={upd.status} />
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(upd.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {entries.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 my-3">
                          {entries.map(([key, value]) => {
                            const isDoc =
                              typeof value === "string" && value.includes("/");
                            return (
                              <div
                                key={key}
                                className="px-3 py-2 rounded-lg bg-white border border-gray-100 text-xs"
                              >
                                <span className="text-gray-400 font-medium uppercase tracking-wide block">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <span className="text-gray-900 mt-0.5 block break-all">
                                  {isDoc ? (
                                    <a
                                      href={`/api/v1/admin/vendors/${id}/documents/${value.split("/").pop()}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-500 hover:underline inline-flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />{" "}
                                      {value.split("/").pop()}
                                    </a>
                                  ) : (
                                    value || (
                                      <span className="text-gray-300">—</span>
                                    )
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {upd.admin_note && (
                        <p className="text-xs text-secondary-800 mb-2">
                          Admin note: {upd.admin_note}
                        </p>
                      )}

                      {upd.status === "pending" && (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => approveUpdateMutation.mutate(upd.id)}
                            disabled={approveUpdateMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-60"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              setActiveUpdate(upd);
                              setUpdateRejectNote("");
                              setUpdateRejectOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <ConfirmDialog
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => {
          if (!rejectReason.trim()) {
            toast.error("Please provide a reason");
            return;
          }
          rejectMutation.mutate();
        }}
        loading={rejectMutation.isPending}
        title="Reject Vendor KYC"
        message="Please provide a reason for rejecting this vendor's KYC. This will be sent to the vendor."
        confirmLabel="Reject Vendor"
        variant="danger"
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
          rows={4}
          className="w-full resize-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-secondary-600 transition-all"
        />
      </ConfirmDialog>

      {/* Suspend Modal */}
      <ConfirmDialog
        isOpen={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={() => {
          if (!suspendReason.trim()) {
            toast.error("Please provide a reason");
            return;
          }
          suspendMutation.mutate();
        }}
        loading={suspendMutation.isPending}
        title="Suspend Vendor"
        message="Suspending this vendor will prevent them from receiving new orders. Please provide a reason."
        confirmLabel="Suspend Vendor"
        variant="warning"
      >
        <textarea
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          placeholder="Reason for suspension..."
          rows={4}
          className="w-full resize-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 transition-all"
        />
      </ConfirmDialog>

      {/* Reject Update Modal */}
      <ConfirmDialog
        isOpen={updateRejectOpen}
        onClose={() => setUpdateRejectOpen(false)}
        onConfirm={() => {
          if (!updateRejectNote.trim()) {
            toast.error("Please provide a note");
            return;
          }
          if (activeUpdate) {
            rejectUpdateMutation.mutate(activeUpdate.id);
          }
        }}
        loading={rejectUpdateMutation.isPending}
        title={`Reject ${activeUpdate?.section || ""} Update`}
        message="Provide a note explaining why this update was rejected. It will be shown to the vendor."
        confirmLabel="Reject Update"
        variant="danger"
      >
        <textarea
          value={updateRejectNote}
          onChange={(e) => setUpdateRejectNote(e.target.value)}
          placeholder="Reason for rejection..."
          rows={4}
          className="w-full resize-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-secondary-600 transition-all"
        />
      </ConfirmDialog>
    </>
  );
}
