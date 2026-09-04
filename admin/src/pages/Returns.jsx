import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import Spinner from "../components/ui/Spinner";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { RotateCcw, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const RETURN_TABS = [
  { id: "all", label: "All" },
  { id: "requested", label: "Requested" },
  { id: "under_review", label: "Under Review" },
  { id: "approved", label: "Approved" },
  { id: "pickup_scheduled", label: "Pickup Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "rejected", label: "Rejected" },
];

const statusColor = (status) => {
  const map = {
    requested: "bg-amber-50 text-amber-700 border border-amber-200",
    under_review: "bg-blue-50 text-blue-700 border border-blue-200",
    approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
    pickup_scheduled: "bg-violet-50 text-violet-700 border border-violet-200",
    picked_up: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    quality_check: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    completed: "bg-green-50 text-green-700 border border-green-200",
    cancelled: "bg-gray-100 text-gray-600 border border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
        map[status] || "bg-gray-100 text-gray-600 border border-gray-200"
      }`}
    >
      {String(status).replace(/_/g, " ")}
    </span>
  );
};

export default function Returns() {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [decisionModal, setDecisionModal] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-returns", activeTab, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: pageSize });
      if (activeTab !== "all") params.set("status", activeTab);
      const res = await api.get(`/returns?${params.toString()}`);
      return res.data;
    },
  });

  const returns = data?.data?.data || data?.data || [];
  const total = data?.data?.total || data?.total || returns.length || 0;

  const updateStatusMutation = useMutation({
    mutationFn: ({ returnId, status, notes }) =>
      api.patch(`/returns/${returnId}/status`, { status, adminNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-returns"] });
      toast.success("Return status updated");
      setDecisionModal(null);
      setAdminNotes("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update return status");
    },
  });

  const handleUpdate = (returnId, status, notes) => {
    updateStatusMutation.mutate({ returnId, status, notes });
  };

  const columns = [
    {
      key: "order_info",
      label: "Order / Product",
      render: (_, row) => (
        <>
          <p className="font-bold text-gray-900">#{row.order_number || row.order_id}</p>
          <p className="text-sm text-gray-700">{row.product_name}</p>
        </>
      ),
    },
    {
      key: "user_name",
      label: "Customer",
      render: (val, row) => (
        <>
          <p className="font-semibold text-gray-800">{val || "Customer"}</p>
          <p className="text-xs text-gray-400">{row.user_email}</p>
        </>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (val) => (
        <span className="text-xs text-gray-600 capitalize">{val || "return"}</span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (val, row) => (
        <>
          <p className="text-gray-700">{val}</p>
          {row.description && (
            <p className="text-xs text-gray-400 max-w-[220px] truncate" title={row.description}>
              {row.description}
            </p>
          )}
        </>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => statusColor(val),
    },
    {
      key: "created_at",
      label: "Requested",
      render: (val) =>
        new Date(val).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {(row.status === "requested" || row.status === "under_review") && (
            <>
              <button
                onClick={() => setDecisionModal({ ...row, action: "approved" })}
                className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors"
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDecisionModal({ ...row, action: "rejected" })}
                className="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"
                title="Reject"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
          {row.status === "approved" && (
            <button
              onClick={() =>
                handleUpdate(row.id, "pickup_scheduled", "Pickup scheduled by admin")
              }
              className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              Schedule Pickup
            </button>
          )}
          {row.status === "pickup_scheduled" && (
            <button
              onClick={() =>
                handleUpdate(row.id, "completed", "Return completed and refund processed")
              }
              className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              Process Refund
            </button>
          )}
        </div>
      ),
    },
  ];

  const handlePageChange = (newPage, newSize) => {
    setPage(newPage);
    if (newSize) setPageSize(newSize);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Return Requests</h1>
        <p className="text-gray-500 text-sm">
          Review and manage all customer return and refund requests
        </p>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {RETURN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`px-4 py-2 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
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
      ) : returns.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="h-10 w-10 text-gray-400" />}
          title="No return requests"
          description="Customer return requests will appear here."
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <DataTable
            columns={columns}
            data={returns}
            loading={isLoading}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            manualPagination={true}
          />
        </div>
      )}

      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-2 capitalize flex items-center gap-2">
              <AlertCircle
                className={`h-5 w-5 ${decisionModal.action === "approved" ? "text-green-500" : "text-red-500"}`}
              />
              {decisionModal.action} Return Request
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Order #{decisionModal.order_number || decisionModal.order_id} —{" "}
              {decisionModal.product_name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Response Notes *
                </label>
                <textarea
                  rows={3}
                  placeholder={`Reason for ${decisionModal.action}...`}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDecisionModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleUpdate(decisionModal.id, decisionModal.action, adminNotes)
                  }
                  disabled={!adminNotes.trim() || updateStatusMutation.isPending}
                  className={`px-4 py-2 text-white rounded-lg text-sm font-semibold ${
                    decisionModal.action === "approved"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {updateStatusMutation.isPending
                    ? "Saving..."
                    : "Submit Decision"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
