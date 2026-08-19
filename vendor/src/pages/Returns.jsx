import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useReturnStore } from "../store/returnStore";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { Check, X, RotateCcw, AlertCircle } from "lucide-react";

const columns = [
  {
    key: "order_info",
    label: "Order Info",
    render: (_, req) => (
      <>
        <p className="font-bold text-gray-900">#{req.order_number}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Item ID: #{req.order_item_id}
        </p>
      </>
    ),
  },
  {
    key: "product",
    label: "Product Details",
    render: (_, req) => (
      <>
        <p className="font-medium truncate">{req.product_name}</p>
        {req.variant_name && (
          <p className="text-xs text-gray-500">{req.variant_name}</p>
        )}
      </>
    ),
  },
  {
    key: "reason",
    label: "Return Reason",
    render: (_, req) => (
      <>
        <p className="font-semibold text-gray-800">{req.reason}</p>
        {req.description && (
          <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>
        )}
      </>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (_, req) => <StatusBadge status={req.status} type="return" />,
  },
  {
    key: "created_at",
    label: "Request Date",
    sortable: true,
    render: (_, req) => (
      <span className="text-xs text-gray-500">
        {new Date(req.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  },
];

export default function Returns() {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [decisionModal, setDecisionModal] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");

  const queryClient = useQueryClient();
  const fetchReturns = useReturnStore((state) => state.fetchReturns);
  const updateStatus = useReturnStore((state) => state.updateStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-returns", activeTab, page, pageSize],
    queryFn: () => {
      const params = { page, limit: pageSize };
      if (activeTab !== "all") params.status = activeTab;
      return fetchReturns(params);
    },
  });

  const returns = data?.data || data?.returns || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ returnId, status, notes }) => {
      return updateStatus(returnId, status, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-returns"] });
      toast.success("Return request updated successfully");
      setDecisionModal(null);
      setAdminNotes("");
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to update return request",
      );
    },
  });

  const handleUpdate = (returnId, status, notes) => {
    updateStatusMutation.mutate({ returnId, status, notes });
  };

  const actionsColumn = {
    key: "actions",
    label: "Actions",
    render: (_, req) => (
      <div className="text-right">
        {req.status === "under_review" && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setDecisionModal({ ...req, action: "approved" })
              }
              className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <Check className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() =>
                setDecisionModal({ ...req, action: "rejected" })
              }
              className="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <X className="h-4 w-4" /> Reject
            </button>
          </div>
        )}
        {req.status === "approved" && (
          <button
            onClick={() =>
              handleUpdate(req.id, "pickup_scheduled", "Pickup scheduled by vendor")
            }
            className="bg-primary-50 text-primary hover:bg-opacity-90 px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            Schedule Pickup
          </button>
        )}
        {req.status === "pickup_scheduled" && (
          <button
            onClick={() =>
              handleUpdate(req.id, "completed", "Refund initiated and return completed")
            }
            className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            Process Refund
          </button>
        )}
      </div>
    ),
  };

  const allColumns = [...columns, actionsColumn];

  const handlePageChange = (newPage, newPageSize) => {
    setPage(newPage);
    if (newPageSize) setPageSize(newPageSize);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Return Requests</h1>
        <p className="text-gray-500 text-sm">
          Manage customer product returns and refunds
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {[
          { id: "all", label: "All Returns" },
          { id: "under_review", label: "Under Review" },
          { id: "approved", label: "Approved" },
          { id: "rejected", label: "Rejected" },
          { id: "pickup_scheduled", label: "Pickup Scheduled" },
          { id: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
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
            columns={allColumns}
            data={returns}
            loading={isLoading}
            emptyMessage="No return requests found."
            total={data?.total || 0}
            page={page}
            onPageChange={handlePageChange}
            manualPagination={true}
          />
        </div>
      )}

      {/* Decision Modal */}
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
              Order #{decisionModal.order_number} for product{" "}
              {decisionModal.product_name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Response Notes *
                </label>
                <textarea
                  required
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
                    handleUpdate(
                      decisionModal.id,
                      decisionModal.action,
                      adminNotes,
                    )
                  }
                  disabled={
                    !adminNotes.trim() || updateStatusMutation.isPending
                  }
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
