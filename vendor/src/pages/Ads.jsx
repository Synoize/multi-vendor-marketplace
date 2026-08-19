import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdStore } from "../store/adStore";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { Megaphone, Plus, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";

const columns = [
  {
    key: "name",
    label: "Campaign Name",
    sortable: true,
    render: (value) => (
      <span className="font-semibold text-gray-900">{value}</span>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (value) => (
      <span className="capitalize">{value}</span>
    ),
  },
  {
    key: "spent",
    label: "Budget Details",
    sortable: true,
    render: (_value, row) => {
      const progress = Math.min(
        100,
        Math.round((row.spent / row.total_budget) * 100),
      );
      return (
        <div className="space-y-1 w-48">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              Spent: ₹{parseFloat(row.spent).toFixed(0)}
            </span>
            <span className="text-gray-900 font-bold">
              Limit: ₹{parseFloat(row.total_budget).toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#FB641B] h-1.5"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    key: "impressions",
    label: "Impressions / Clicks",
    sortable: true,
    render: (_value, row) => (
      <div className="text-xs text-gray-600">
        <p>
          <span className="font-bold text-gray-900">{row.impressions}</span>{" "}
          Impressions
        </p>
        <p>
          <span className="font-bold text-gray-900">{row.clicks}</span>{" "}
          Clicks
        </p>
      </div>
    ),
  },
  {
    key: "ctr",
    label: "CTR",
    sortable: false,
    render: (_value, row) => {
      const ctr =
        row.impressions > 0
          ? ((row.clicks / row.impressions) * 100).toFixed(2)
          : "0.00";
      return (
        <span className="font-semibold text-[#2874F0]">{ctr}%</span>
      );
    },
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value} type="ad" />,
  },
  {
    key: "actions",
    label: "Actions",
    sortable: false,
    render: (_value, row, handleToggle) => (
      <div className="flex items-center justify-end gap-2">
        {(row.status === "active" || row.status === "paused") && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggle(row.id, row.status);
            }}
            className={`p-2 rounded-lg transition-colors text-xs font-semibold ${
              row.status === "active"
                ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                : "bg-green-50 text-green-600 hover:bg-green-100"
            }`}
            title={
              row.status === "active"
                ? "Pause Campaign"
                : "Resume Campaign"
            }
          >
            {row.status === "active" ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    ),
  },
];

export default function Ads() {
  const queryClient = useQueryClient();
  const fetchAds = useAdStore((state) => state.fetchAds);
  const toggleStatus = useAdStore((state) => state.toggleStatus);

  const { data = [], isLoading } = useQuery({
    queryKey: ["vendor-ads"],
    queryFn: () => fetchAds(),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, action }) => {
      return toggleStatus(id, action);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-ads"] });
      toast.success(
        `Campaign ${variables.action === "pause" ? "paused" : "resumed"} successfully`,
      );
    },
    onError: () => {
      toast.error("Failed to update campaign status");
    },
  });

  const handleToggle = (id, currentStatus) => {
    const action = currentStatus === "active" ? "pause" : "resume";
    toggleStatusMutation.mutate({ id, action });
  };

  const tableColumns = columns.map((col) => {
    if (col.key === "actions") {
      return {
        ...col,
        render: (value, row) => col.render(value, row, handleToggle),
      };
    }
    return col;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sponsored Product Campaigns</h1>
          <p className="text-sm text-secondary-800 mt-0.5">
            Boost visibility of your products with paid ads
          </p>
        </div>

        <Link
          to="/ads/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-opacity-90 text-white text-xs rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Create Campaign</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-10 w-10 text-gray-400" />}
          title="No campaigns yet"
          description="Promote your products and drive more sales by creating an ad campaign."
          actionText="Create Ad Campaign"
          onAction={() => (window.location.href = "/ads/create")}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <DataTable
            columns={tableColumns}
            data={data}
            loading={isLoading}
            emptyMessage="No campaigns found"
            enablePagination={false}
            enableSearch={false}
          />
        </div>
      )}
    </div>
  );
}
