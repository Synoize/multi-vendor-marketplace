import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import {
  ArrowLeft, Store, Mail, Phone, MapPin, FileText,
  CheckCircle, XCircle, Ban, ExternalLink, Building, CreditCard,
  Calendar, User, AlertTriangle,
} from 'lucide-react';
import api from '../lib/axios';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-sm text-white text-right max-w-xs truncate ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function maskAccount(num) {
  if (!num) return '—';
  const s = String(num);
  return s.slice(0, 4) + '•'.repeat(Math.max(0, s.length - 8)) + s.slice(-4);
}

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const { data: vendor, isLoading, isError } = useQuery({
    queryKey: ['admin-vendor', id],
    queryFn: async () => {
      const res = await api.get(`/admin/vendors/${id}`);
      return res.data?.data || res.data || {};
    },
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries(['admin-vendor', id]);
    queryClient.invalidateQueries(['admin-vendors']);
  };

  const approveMutation = useMutation({
    mutationFn: () => api.put(`/admin/vendors/${id}/kyc`, { status: 'approved' }),
    onSuccess: () => { toast.success('Vendor approved successfully'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to approve vendor'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.put(`/admin/vendors/${id}/kyc`, { status: 'rejected', reason: rejectReason }),
    onSuccess: () => { toast.success('Vendor rejected'); setRejectOpen(false); setRejectReason(''); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to reject vendor'),
  });

  const suspendMutation = useMutation({
    mutationFn: () => api.put(`/admin/vendors/${id}/suspend`, { reason: suspendReason }),
    onSuccess: () => { toast.success('Vendor suspended'); setSuspendOpen(false); setSuspendReason(''); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to suspend vendor'),
  });

  const unsuspendMutation = useMutation({
    mutationFn: () => api.put(`/admin/vendors/${id}/unsuspend`),
    onSuccess: () => { toast.success('Vendor reinstated'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to reinstate vendor'),
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
      <div className="glass-card p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-white font-semibold">Vendor not found</p>
        <button onClick={() => navigate('/vendors')} className="btn-ghost mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Vendors
        </button>
      </div>
    );
  }

  const kycStatus = vendor.kyc_status || 'not_submitted';
  const isSuspended = vendor.is_suspended || vendor.kyc_status === 'suspended';
  const docs = vendor.kyc_documents || vendor.documents || [];

  return (
    <>
      <Helmet><title>{vendor.store_name || 'Vendor'} — Damini Admin</title></Helmet>
      <div className="space-y-5 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vendors')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{vendor.store_name}</h1>
              <StatusBadge status={kycStatus} />
              {isSuspended && <StatusBadge status="suspended" />}
            </div>
            <p className="text-gray-400 text-sm mt-0.5">{vendor.business_name}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {kycStatus === 'pending' && (
              <>
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
                >
                  {approveMutation.isPending ? <Spinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={() => setRejectOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}
            {!isSuspended && kycStatus === 'approved' && (
              <button
                onClick={() => setSuspendOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl transition-all"
              >
                <Ban className="w-4 h-4" />
                Suspend
              </button>
            )}
            {isSuspended && (
              <button
                onClick={() => unsuspendMutation.mutate()}
                disabled={unsuspendMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
              >
                {unsuspendMutation.isPending ? <Spinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
                Reinstate
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Store & Contact Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Store Info */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Store className="w-4 h-4 text-blue-400" /> Store Information
              </h3>
              <InfoRow label="Store Name" value={vendor.store_name} />
              <InfoRow label="Business Name" value={vendor.business_name} />
              <InfoRow label="Business Type" value={vendor.business_type} />
              <InfoRow label="GST Number" value={vendor.gst_number} mono />
              <InfoRow label="PAN Number" value={vendor.pan_number} mono />
              <InfoRow label="FSSAI Number" value={vendor.fssai_number} mono />
              <InfoRow label="Commission Rate" value={vendor.commission_rate !== undefined ? `${vendor.commission_rate}%` : null} />
              <InfoRow label="Store Description" value={vendor.store_description} />
            </div>

            {/* Contact Info */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-blue-400" /> Contact & Location
              </h3>
              <InfoRow label="Owner Name" value={vendor.owner_name || vendor.user?.name} />
              <InfoRow label="Email" value={vendor.email || vendor.user?.email} />
              <InfoRow label="Phone" value={vendor.phone || vendor.user?.phone} />
              <InfoRow label="Address" value={vendor.address} />
              <InfoRow label="City" value={vendor.city} />
              <InfoRow label="State" value={vendor.state} />
              <InfoRow label="Pincode" value={vendor.pincode} />
              <InfoRow
                label="Joined"
                value={vendor.created_at ? new Date(vendor.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : null}
              />
            </div>

            {/* Bank Details */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-blue-400" /> Bank Details
                <span className="text-xs text-gray-600 font-normal ml-1">(masked)</span>
              </h3>
              <InfoRow label="Account Holder" value={vendor.bank_details?.account_holder_name} />
              <InfoRow label="Account Number" value={maskAccount(vendor.bank_details?.account_number)} mono />
              <InfoRow label="IFSC Code" value={vendor.bank_details?.ifsc_code} mono />
              <InfoRow label="Bank Name" value={vendor.bank_details?.bank_name} />
              <InfoRow label="Branch" value={vendor.bank_details?.branch} />
            </div>
          </div>

          {/* Right: KYC Documents */}
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-blue-400" /> KYC Documents
              </h3>
              {docs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No documents uploaded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {docs.map((doc, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-white">{doc.type || doc.name || `Document ${idx + 1}`}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{doc.file_name || 'File'}</p>
                        </div>
                        {(doc.url || doc.file_url) && (
                          <a
                            href={doc.url || doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      {doc.status && (
                        <div className="mt-2">
                          <StatusBadge status={doc.status} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white mb-4">Performance</h3>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-gray-500">Total Orders</span>
                <span className="text-sm font-semibold text-white">{(vendor.total_orders || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-gray-500">Total Revenue</span>
                <span className="text-sm font-semibold text-emerald-400">
                  ₹{(vendor.total_revenue || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-gray-500">Total Products</span>
                <span className="text-sm font-semibold text-white">{(vendor.total_products || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-500">Rating</span>
                <span className="text-sm font-semibold text-yellow-400">{(vendor.rating || 0).toFixed(1)} ⭐</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Vendor KYC"
        size="sm"
        footer={
          <>
            <button onClick={() => setRejectOpen(false)} className="btn-ghost">Cancel</button>
            <button
              onClick={() => { if (!rejectReason.trim()) { toast.error('Please provide a reason'); return; } rejectMutation.mutate(); }}
              disabled={rejectMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
            >
              {rejectMutation.isPending && <Spinner size="sm" />}
              Reject Vendor
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Please provide a reason for rejecting this vendor's KYC. This will be sent to the vendor.</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={4}
            className="input-dark w-full resize-none"
          />
        </div>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        isOpen={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title="Suspend Vendor"
        size="sm"
        footer={
          <>
            <button onClick={() => setSuspendOpen(false)} className="btn-ghost">Cancel</button>
            <button
              onClick={() => { if (!suspendReason.trim()) { toast.error('Please provide a reason'); return; } suspendMutation.mutate(); }}
              disabled={suspendMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
            >
              {suspendMutation.isPending && <Spinner size="sm" />}
              Suspend Vendor
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Suspending this vendor will prevent them from receiving new orders. Please provide a reason.</p>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Reason for suspension..."
            rows={4}
            className="input-dark w-full resize-none"
          />
        </div>
      </Modal>
    </>
  );
}
