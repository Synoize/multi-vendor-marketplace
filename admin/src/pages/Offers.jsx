import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ImageUpload from "../components/ui/ImageUpload";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";
import {
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Gift,
  Percent,
  IndianRupee,
  Truck,
  Tag,
  Download,
} from "lucide-react";

const OFFER_TYPES = [
  { value: "bogo", label: "Buy One Get One (BOGO)", icon: Gift },
  { value: "percentage", label: "Percentage Off", icon: Percent },
  { value: "fixed", label: "Fixed Amount Off", icon: IndianRupee },
  { value: "free_shipping", label: "Free Shipping", icon: Truck },
];

const typeIcon = (type) => {
  const t = OFFER_TYPES.find((o) => o.value === type);
  return t ? t.icon : Tag;
};

export default function Offers() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "bogo",
    discount_value: "",
    discount_percent: "100",
    buy_quantity: "1",
    get_quantity: "1",
    max_discount: "",
    min_purchase_amount: "",
    min_item_quantity: "",
    applicable_to: "all",
    applicable_id: "",
    valid_from: "",
    valid_to: "",
    usage_limit: "",
    per_user_limit: "1",
    image: "",
    badge_text: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-offers", page, pageSize],
    queryFn: async () => {
      const res = await api.get(`/offers?page=${page}&limit=${pageSize}`);
      return {
        offers: res.data.data?.items || res.data.data || [],
        total: res.data.total || 0,
      };
    },
  });

  const offers = data?.offers || [];
  const total = data?.total || 0;

  const createMutation = useMutation({
    mutationFn: async (payload) => api.post("/offers", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      toast.success("Offer created");
      resetForm();
    },
    onError: () => toast.error("Failed to create offer"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => api.put(`/offers/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      toast.success("Offer updated");
      resetForm();
    },
    onError: () => toast.error("Failed to update offer"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id) => api.patch(`/offers/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      toast.success("Status updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/offers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      toast.success("Offer deleted");
    },
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      type: "bogo",
      discount_value: "",
      discount_percent: "100",
      buy_quantity: "1",
      get_quantity: "1",
      max_discount: "",
      min_purchase_amount: "",
      min_item_quantity: "",
      applicable_to: "all",
      applicable_id: "",
      valid_from: "",
      valid_to: "",
      usage_limit: "",
      per_user_limit: "1",
      image: "",
      badge_text: "",
    });
    setEditing(null);
    setShowModal(false);
  };

  const openEdit = (offer) => {
    setEditing(offer.id);
    setForm({
      title: offer.title || "",
      description: offer.description || "",
      type: offer.type || "bogo",
      discount_value: offer.discount_value || "",
      discount_percent: offer.discount_percent || "100",
      buy_quantity: offer.buy_quantity || "1",
      get_quantity: offer.get_quantity || "1",
      max_discount: offer.max_discount || "",
      min_purchase_amount: offer.min_purchase_amount || "",
      min_item_quantity: offer.min_item_quantity || "",
      applicable_to: offer.applicable_to || "all",
      applicable_id: offer.applicable_id || "",
      valid_from: offer.valid_from ? offer.valid_from.split("T")[0] : "",
      valid_to: offer.valid_to ? offer.valid_to.split("T")[0] : "",
      usage_limit: offer.usage_limit || "",
      per_user_limit: offer.per_user_limit || "1",
      image: offer.image || "",
      badge_text: offer.badge_text || "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      discount_value: form.discount_value
        ? parseFloat(form.discount_value)
        : null,
      discount_percent: form.discount_percent
        ? parseFloat(form.discount_percent)
        : null,
      buy_quantity: form.buy_quantity ? parseInt(form.buy_quantity) : null,
      get_quantity: form.get_quantity ? parseInt(form.get_quantity) : null,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      min_purchase_amount: form.min_purchase_amount
        ? parseFloat(form.min_purchase_amount)
        : null,
      min_item_quantity: form.min_item_quantity
        ? parseInt(form.min_item_quantity)
        : null,
      applicable_to: form.applicable_to,
      applicable_id: form.applicable_id || null,
      valid_from:
        form.valid_from ||
        new Date().toISOString().slice(0, 19).replace("T", " "),
      valid_to:
        form.valid_to ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 19)
          .replace("T", " "),
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      per_user_limit: parseInt(form.per_user_limit) || 1,
      image: form.image || null,
      badge_text: form.badge_text || null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (offer) => {
    setDeleteTarget(offer);
  };

  const formatType = (type) =>
    OFFER_TYPES.find((t) => t.value === type)?.label || type;
  const formatDates = (from, to) => {
    if (!from) return "—";
    const f = new Date(from).toLocaleDateString("en-IN");
    const t = new Date(to).toLocaleDateString("en-IN");
    return `${f} — ${t}`;
  };

  const handleExport = (rows) => {
    const headers = ["Offer", "Type", "Discount", "Validity", "Uses", "Status"];
    const csvRows = rows.map((offer) => {
      const discount =
        offer.type === "bogo"
          ? `Buy ${offer.buy_quantity} Get ${offer.get_quantity} ${offer.discount_percent < 100 ? `${offer.discount_percent}% Off` : "Free"}`
          : offer.type === "percentage"
            ? `${offer.discount_value}% Off${offer.max_discount ? ` (max ₹${offer.max_discount})` : ""}`
            : offer.type === "fixed"
              ? `₹${offer.discount_value} Off`
              : "Free Shipping";
      return [
        offer.title,
        formatType(offer.type),
        discount,
        formatDates(offer.valid_from, offer.valid_to),
        `${offer.used_count || 0}${offer.usage_limit ? ` / ${offer.usage_limit}` : ""}`,
        offer.is_active ? "Active" : "Inactive",
      ].join(",");
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "offers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: "title",
      label: "Offer",
      render: (_, row) => {
        const Icon = typeIcon(row.type);
        return (
          <div className="flex items-center gap-3">
            {row.image ? (
              <img
                src={row.image}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-gray-100"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Icon className="h-5 w-5 text-blue-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{row.title}</p>
              {row.badge_text && (
                <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-semibold">
                  {row.badge_text}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      label: "Type",
      render: (_, row) => (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg capitalize">
          {formatType(row.type)}
        </span>
      ),
    },
    {
      key: "discount_display",
      label: "Discount",
      render: (_, row) => (
        <span className="text-sm text-gray-900 font-semibold">
          {row.type === "bogo"
            ? `Buy ${row.buy_quantity} Get ${row.get_quantity} ${row.discount_percent < 100 ? `${row.discount_percent}% Off` : "Free"}`
            : row.type === "percentage"
              ? `${row.discount_value}% Off${row.max_discount ? ` (max ₹${row.max_discount})` : ""}`
              : row.type === "fixed"
                ? `₹${row.discount_value} Off`
                : "Free Shipping"}
        </span>
      ),
    },
    {
      key: "valid_from",
      label: "Validity",
      render: (_, row) => (
        <span className="text-xs text-gray-500">
          {formatDates(row.valid_from, row.valid_to)}
        </span>
      ),
    },
    {
      key: "used_count",
      label: "Uses",
      render: (_, row) => (
        <span className="text-xs text-gray-500">
          {row.used_count || 0}
          {row.usage_limit ? ` / ${row.usage_limit}` : ""}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (_, row) => (
        <button onClick={() => toggleMutation.mutate(row.id)}>
          {row.is_active ? (
            <Eye className="h-5 w-5 text-green-500" />
          ) : (
            <EyeOff className="h-5 w-5 text-gray-400" />
          )}
        </button>
      ),
    },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openEdit(row)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-colors"
          >
            <Edit3 className="h-4 w-4" />
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
            Offers & Promotions
          </h1>
          <p className="text-gray-500 text-sm">
            Create BOGO, percentage, fixed amount, and free shipping offers
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> New Offer
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          icon={<Gift className="h-10 w-10 text-gray-400" />}
          title="No offers"
          description="Create your first promotional offer."
        />
      ) : (
        <DataTable
          columns={columns}
          data={offers}
          loading={isLoading}
          emptyMessage="No offers found."
          enableSearch
          enableExport
          enableColumnVisibility
          enablePagination
          manualPagination
          page={page}
          pageSize={pageSize}
          onPageChange={(newPage, newPageSize) => {
            setPage(newPage);
            if (newPageSize !== pageSize) setPageSize(newPageSize);
          }}
          total={total}
          renderTopToolbarCustomActions={() => (
            <button
              onClick={() => handleExport(offers)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 text-lg mb-4">
              {editing ? "Edit Offer" : "Create New Offer"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Buy 1 Get 1 Free"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Badge Text</label>
                  <input
                    type="text"
                    placeholder="e.g. BOGO, SALE, OFFER"
                    value={form.badge_text}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, badge_text: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  placeholder="e.g. Buy one item and get the second item at 50% off"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className={inputClass}
                  rows={2}
                />
              </div>

              <div>
                <label className={labelClass}>Offer Type *</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className={inputClass}
                >
                  {OFFER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.type === "bogo" && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Buy Quantity *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={form.buy_quantity}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, buy_quantity: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Get Quantity *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={form.get_quantity}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, get_quantity: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Get Discount % *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={form.discount_percent}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          discount_percent: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {form.type === "percentage" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Discount % *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={form.discount_value}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          discount_value: e.target.value,
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
              )}

              {form.type === "fixed" && (
                <div>
                  <label className={labelClass}>Discount Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount_value: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              )}

              {form.type === "free_shipping" && (
                <div>
                  <label className={labelClass}>
                    Flat Shipping Discount (₹){" "}
                    <span className="text-gray-400 font-normal">
                      (default ₹40)
                    </span>
                  </label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount_value: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Min Purchase Amount (₹)</label>
                  <input
                    type="number"
                    value={form.min_purchase_amount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        min_purchase_amount: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Min Items Required</label>
                  <input
                    type="number"
                    value={form.min_item_quantity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        min_item_quantity: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Applies To</label>
                  <select
                    value={form.applicable_to}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, applicable_to: e.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="all">All Items</option>
                    <option value="category">Category</option>
                    <option value="product">Specific Product</option>
                    <option value="vendor">Specific Vendor</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    Applicable ID{" "}
                    <span className="text-gray-400 font-normal">
                      (category/product/vendor ID)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.applicable_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, applicable_id: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Valid From *</label>
                  <input
                    type="date"
                    required
                    value={form.valid_from}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_from: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Valid To *</label>
                  <input
                    type="date"
                    required
                    value={form.valid_to}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_to: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Total Usage Limit</label>
                  <input
                    type="number"
                    value={form.usage_limit}
                    placeholder="Unlimited"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, usage_limit: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Per User Limit *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.per_user_limit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, per_user_limit: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <ImageUpload
                label="Offer Banner Image"
                value={form.image}
                uploadPath="offer"
                onChange={(url) => setForm((f) => ({ ...f, image: url }))}
              />

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
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editing
                      ? "Update Offer"
                      : "Create Offer"}
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
        title="Delete Offer"
        message={`Are you sure you want to delete offer "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
