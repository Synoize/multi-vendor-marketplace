import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import ImageUpload from "../components/ui/ImageUpload";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  BadgeCheck,
  Download,
} from "lucide-react";

const emptyForm = {
  id: null,
  name: "",
  logo: "",
  description: "",
};

export default function Brands() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const res = await api.get("/brands?all=1");
      return res.data.data || [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-brands"] });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const { id, ...body } = payload;
      if (id) return api.put(`/brands/${id}`, body);
      return api.post("/brands", body);
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast.success(vars.id ? "Brand updated" : "Brand created");
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: () => toast.error("Failed to save brand"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) =>
      api.put(`/brands/${id}`, { is_active: is_active ? 0 : 1 }),
    onSuccess: () => {
      invalidate();
      toast.success("Brand status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/brands/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Brand deactivated");
    },
    onError: () => toast.error("Failed to deactivate brand"),
  });

  const openAdd = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (brand) => {
    setForm({
      id: brand.id,
      name: brand.name || "",
      logo: brand.logo || "",
      description: brand.description || "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Brand name is required");
      return;
    }
    saveMutation.mutate(form);
  };

  const handleDelete = (brand) => {
    setDeleteTarget(brand);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleExport = () => {
    const headers = ["Brand", "Slug", "Products", "Status"];
    const rows = brands.map((b) => [
      b.name,
      b.slug,
      b.product_count ?? "",
      b.is_active ? "Active" : "Inactive",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brands.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: "name",
      label: "Brand",
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          {row.logo ? (
            <img
              src={row.logo}
              alt=""
              className="h-6 w-6 rounded-md object-cover border border-gray-200 flex-shrink-0"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="h-6 w-6 rounded-md border border-gray-200 flex items-center justify-center flex-shrink-0">
              <BadgeCheck className="h-4 w-4 text-red-500" />
            </div>
          )}
          <span className="font-medium text-gray-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: "slug",
      label: "Slug",
    },
    {
      key: "product_count",
      label: "Products",
      render: (value) => value ?? "\u2014",
    },
    {
      key: "is_active",
      label: "Status",
      render: (value) =>
        value ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200">
            Inactive
          </span>
        ),
    },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() =>
              toggleMutation.mutate({
                id: row.id,
                is_active: row.is_active,
              })
            }
            title={row.is_active ? "Deactivate" : "Activate"}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {row.is_active ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Brand Management
          </h1>
          <p className="text-gray-500 text-sm">
            Manage store brands — vendors pick brands from this list
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-primary hover:bg-opacity-90 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Brand
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : brands.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck className="h-10 w-10 text-gray-400" />}
          title="No brands"
          description="Create your first brand to start organizing products."
        />
      ) : (
        <DataTable
          columns={columns}
          data={brands}
          loading={isLoading}
          emptyMessage="No brands found"
          enableSearch
          enableExport
          enableColumnVisibility
          enablePagination
          renderTopToolbarCustomActions={() => (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
        />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={form.id ? "Edit Brand" : "Add Brand"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Brand Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apple"
              value={form.name}
              onChange={set("name")}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-red-300 focus:ring-2 focus:ring-red-50 focus:outline-none"
            />
          </div>

          <ImageUpload
            label="Brand Logo (Upload or Paste URL)"
            value={form.logo}
            uploadPath="brand"
            onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
          />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Short description of this brand"
              value={form.description}
              onChange={set("description")}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-red-300 focus:ring-2 focus:ring-red-50 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-opacity-90"
            >
              {saveMutation.isPending
                ? "Saving..."
                : form.id
                  ? "Save Changes"
                  : "Add Brand"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        loading={deleteMutation.isPending}
        title="Deactivate Brand"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"? It will no longer appear in vendor listings.`}
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
