import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";
import { Megaphone, Check, X, BarChart2, Download } from "lucide-react";

export default function Ads() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["admin-ads", activeTab],
    queryFn: async () => {
      const res = await api.get("/ads/admin");
      const list = res.data.data || [];
      if (activeTab === "all") return list;
      return list.filter((c) => c.status === activeTab);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/ads/admin/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("Campaign approved successfully");
    },
    onError: () => {
      toast.error("Failed to approve campaign");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      return api.patch(`/ads/admin/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("Campaign rejected successfully");
      setRejectModal(null);
      setRejectReason("");
    },
    onError: () => {
      toast.error("Failed to reject campaign");
    },
  });

  const handleApprove = (id) => {
    approveMutation.mutate(id);
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    rejectMutation.mutate({ id: rejectModal, reason: rejectReason });
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Campaign Details",
        render: (_, row) => (
          <div>
            <p className="font-bold text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-400">
              Dates: {new Date(row.start_date).toLocaleDateString("en-IN")} -{" "}
              {new Date(row.end_date).toLocaleDateString("en-IN")}
            </p>
          </div>
        ),
      },
      {
        key: "store_name",
        label: "Vendor",
      },
      {
        key: "type",
        label: "Type",
        render: (value) => <span className="capitalize">{value}</span>,
      },
      {
        key: "budget",
        label: "Budget Progress",
        render: (_, row) => {
          const progress = Math.min(
            100,
            Math.round((row.spent / row.total_budget) * 100),
          );
          return (
            <div className="space-y-1 w-44">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">
                  Spent: ₹{parseFloat(row.spent).toFixed(0)}
                </span>
                <span className="text-gray-900 font-bold">
                  Limit: ₹{parseFloat(row.total_budget).toFixed(0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-1.5 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: "performance",
        label: "Performance",
        render: (_, row) => {
          const ctr =
            row.impressions > 0
              ? ((row.clicks / row.impressions) * 100).toFixed(2)
              : "0.00";
          return (
            <div className="text-xs text-gray-500">
              <p>
                <span className="font-bold text-gray-900">
                  {row.impressions}
                </span>{" "}
                Imps
              </p>
              <p>
                <span className="font-bold text-gray-900">{row.clicks}</span>{" "}
                Clicks ({ctr}%)
              </p>
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (value) => <StatusBadge status={value} type="ad" />,
      },
      {
        key: "id",
        label: "Actions",
        sortable: false,
        render: (_, row) =>
          row.status === "pending" && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => handleApprove(row.id)}
                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg transition-colors"
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRejectModal(row.id)}
                className="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"
                title="Reject"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ),
      },
    ],
    [],
  );

  const handleExport = (data) => {
    const header = ["Campaign", "Vendor", "Type", "Status"];
    const rows = data.map((c) => [c.name, c.store_name, c.type, c.status]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaigns-${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTopToolbarCustomActions = ({ table }) => (
    <button
      onClick={() =>
        handleExport(
          table.getPrePaginationRowModel().rows.map((r) => r.original),
        )
      }
      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Sponsored Campaigns
        </h1>
        <p className="text-gray-500 text-sm">
          Approve and monitor paid banner and product campaigns
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { id: "pending", label: "Pending Approval" },
          { id: "active", label: "Active Campaigns" },
          { id: "rejected", label: "Rejected" },
          { id: "exhausted", label: "Exhausted" },
          { id: "all", label: "All Campaigns" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-red-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-10 w-10 text-gray-400" />}
          title="No campaigns"
          description="Promotional campaigns will appear here."
        />
      ) : (
        <DataTable
          columns={columns}
          data={campaigns}
          loading={isLoading}
          emptyMessage="No campaigns found"
          enableSearch
          enableExport
          enableColumnVisibility
          enablePagination
          renderTopToolbarCustomActions={renderTopToolbarCustomActions}
        />
      )}

      <ConfirmDialog
        isOpen={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectReason("");
        }}
        onConfirm={handleRejectSubmit}
        loading={rejectMutation.isPending}
        title="Reject Campaign Listing"
        message="Provide a feedback reason so the vendor can rectify and resubmit."
        confirmLabel={
          rejectMutation.isPending ? "Saving..." : "Reject Campaign"
        }
        variant="danger"
      >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Rejection Reason *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Describe why this campaign is being rejected (e.g. invalid dates, duplicate products)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
