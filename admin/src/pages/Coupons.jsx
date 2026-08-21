import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";
import {
  Tag,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
  Download,
} from "lucide-react";

export default function Coupons() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    code: "",
    title: "",
    type: "fixed",
    discount_value: "",
    min_order_amount: "",
    max_discount: "",
    max_uses: "",
    max_uses_per_user: "1",
    valid_from: "",
    valid_to: "",
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await api.get("/coupons");
      return res.data.data?.items || res.data.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCoupon) {
        return api.put(`/coupons/${editingCoupon.id}`, payload);
      } else {
        return api.post("/coupons", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success(editingCoupon ? "Coupon updated" : "Coupon created");
      resetForm();
    },
    onError: () => {
      toast.error("Failed to save coupon");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon deleted");
    },
    onError: () => {
      toast.error("Failed to delete coupon");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/coupons/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to toggle status");
    },
  });

  const resetForm = () => {
    setForm({
      code: "",
      title: "",
      type: "fixed",
      discount_value: "",
      min_order_amount: "",
      max_discount: "",
      max_uses: "",
      max_uses_per_user: "1",
      valid_from: "",
      valid_to: "",
    });
    setEditingCoupon(null);
    setShowAddModal(false);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code || "",
      title: coupon.title || "",
      type: coupon.type || "fixed",
      discount_value: coupon.discount_value || "",
      min_order_amount: coupon.min_order_amount || "",
      max_discount: coupon.max_discount || "",
      max_uses: coupon.max_uses || "",
      max_uses_per_user: coupon.max_uses_per_user || "1",
      valid_from: coupon.valid_from ? coupon.valid_from.split("T")[0] : "",
      valid_to: coupon.valid_to ? coupon.valid_to.split("T")[0] : "",
    });
    setShowAddModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      code: form.code,
      title: form.title || form.code,
      type: form.type,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: form.min_order_amount
        ? parseFloat(form.min_order_amount)
        : null,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      max_uses_per_user: parseInt(form.max_uses_per_user) || 1,
      valid_from:
        form.valid_from ||
        new Date().toISOString().slice(0, 19).replace("T", " "),
      valid_to:
        form.valid_to ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 19)
          .replace("T", " "),
    });
  };

  const handleDelete = (coupon) => {
    setDeleteTarget(coupon);
  };

  const handleExport = (rows) => {
    const headers = [
      "Code",
      "Type",
      "Value",
      "Min Spend",
      "Uses",
      "Expiry",
      "Status",
    ];
    const csvRows = rows.map((row) => [
      row.code,
      row.type,
      row.type === "percentage"
        ? `${row.discount_value}%`
        : `₹${row.discount_value}`,
      `₹${row.min_order_amount || "—"}`,
      `${row.used_count || 0}${row.max_uses ? ` / ${row.max_uses}` : ""}`,
      row.valid_to
        ? new Date(row.valid_to).toLocaleDateString("en-IN")
        : "Never",
      row.is_active ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...csvRows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coupons.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: "code",
      label: "Coupon Code",
      render: (val) => (
        <span className="font-mono font-bold text-red-500 uppercase">
          {val}
        </span>
      ),
    },
    {
      key: "type",
      label: "Discount Type",
      render: (val) => <span className="capitalize">{val}</span>,
    },
    {
      key: "discount_value",
      label: "Value",
      render: (val, row) => (
        <span className="font-bold">
          {row.type === "percentage" ? `${val}%` : `₹${val}`}
        </span>
      ),
    },
    {
      key: "min_order_amount",
      label: "Min Spend",
      render: (val) => <span className="text-gray-500">₹{val || "—"}</span>,
    },
    {
      key: "id",
      label: "Uses",
      render: (val, row) => (
        <span className="text-xs text-gray-500">
          Used:{" "}
          <span className="font-bold text-gray-900">{row.used_count || 0}</span>
          {row.max_uses ? (
            <span className="text-gray-400"> / {row.max_uses}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "valid_to",
      label: "Expiry",
      render: (val) => (
        <span className="text-xs text-gray-500">
          {val ? new Date(val).toLocaleDateString("en-IN") : "Never"}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (val, row) => (
        <button onClick={() => toggleMutation.mutate(row.id)}>
          {val ? (
            <ToggleRight className="h-7 w-7 text-green-500" />
          ) : (
            <ToggleLeft className="h-7 w-7 text-gray-400" />
          )}
        </button>
      ),
    },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const inputClass =
    "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-red-300 focus:ring-2 focus:ring-red-50 focus:outline-none";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Coupon Management
          </h1>
          <p className="text-gray-500 text-sm">
            Create and configure platform promotional discount coupons
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 bg-primary hover:bg-opacity-90 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Coupon
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-10 w-10 text-gray-400" />}
          title="No coupons"
          description="Promotional discount coupons will appear here."
        />
      ) : (
        <DataTable
          columns={columns}
          data={coupons}
          loading={isLoading}
          emptyMessage="No coupons found"
          enableSearch
          enableExport
          enableColumnVisibility
          enablePagination
          renderTopToolbarCustomActions={({ data: tableData }) => (
            <button
              onClick={() => handleExport(tableData)}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          )}
        />
      )}

      {showAddModal && (
        <div className="fixed -top-6 h-screen inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-gray-900 text-lg mb-4">
              {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WELCOME100"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className={inputClass + " uppercase font-mono font-bold"}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Welcome Discount"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Discount Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="fixed">Fixed Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount_value: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={form.min_order_amount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        min_order_amount: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max Discount (₹)</label>
                  <input
                    type="number"
                    value={form.max_discount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, max_discount: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Max Total Uses</label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, max_uses: e.target.value }))
                    }
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max Uses Per User *</label>
                  <input
                    type="number"
                    required
                    value={form.max_uses_per_user}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        max_uses_per_user: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Valid From</label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_from: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Valid To</label>
                  <input
                    type="date"
                    value={form.valid_to}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_to: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        loading={deleteMutation.isPending}
        title="Delete Coupon"
        message={`Are you sure you want to delete coupon "${deleteTarget?.code}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
