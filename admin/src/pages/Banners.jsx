import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { toast } from "sonner";
import ImageUpload from "../components/ui/ImageUpload";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";
import {
  Plus,
  Trash2,
  Pencil,
  Link as LinkIcon,
  Eye,
  EyeOff,
} from "lucide-react";

export default function Banners() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    image: "",
    link: "",
    position: "hero",
    sort_order: "0",
  });

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const res = await api.get("/banners?all=1");
      return res.data.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      if (id) return api.put(`/banners/${id}`, payload);
      return api.post("/banners", payload);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success(vars.id ? "Banner updated successfully" : "Banner created successfully");
      resetForm();
    },
    onError: (err, vars) => {
      toast.error(vars?.id ? "Failed to update banner" : "Failed to create banner");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      return api.put(`/banners/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success("Banner status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success("Banner deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete banner");
    },
  });

  const resetForm = () => {
    setForm({
      title: "",
      subtitle: "",
      image: "",
      link: "",
      position: "hero",
      sort_order: "0",
    });
    setEditingBanner(null);
    setShowAddModal(false);
  };

  const openAdd = () => {
    setEditingBanner(null);
    setForm({
      title: "",
      subtitle: "",
      image: "",
      link: "",
      position: "hero",
      sort_order: "0",
    });
    setShowAddModal(true);
  };

  const openEdit = (banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      image: banner.image || "",
      link: banner.link || "",
      position: banner.position || "hero",
      sort_order: banner.sort_order != null ? String(banner.sort_order) : "0",
    });
    setShowAddModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      id: editingBanner?.id || null,
      payload: {
        ...form,
        sort_order: parseInt(form.sort_order),
      },
    });
  };

  const handleDelete = (banner) => {
    setDeleteTarget(banner);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Banner Management
          </h1>
          <p className="text-gray-500 text-sm">
            Upload and manage promotional slides for the customer homepage
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </button>
      </div>

      <DataTable
        columns={[
          {
            key: "image",
            label: "Preview",
            sortable: false,
            render: (_, row) => (
              <img
                src={row.image || "https://picsum.photos/seed/banner/600/200"}
                alt=""
                className="w-10 h-10 rounded-lg object-cover"
              />
            ),
          },
          {
            key: "title",
            label: "Title",
            render: (_, row) => (
              <span className="font-semibold text-gray-900">
                {row.title || "Untitled Banner"}
              </span>
            ),
          },
          {
            key: "subtitle",
            label: "Subtitle",
            render: (_, row) => (
              <span className="text-gray-500">{row.subtitle || "—"}</span>
            ),
          },
          {
            key: "position",
            label: "Position",
            render: (_, row) => (
              <span className="inline-block bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
                {row.position}
              </span>
            ),
          },
          {
            key: "link",
            label: "Link",
            sortable: false,
            render: (_, row) =>
              row.link ? (
                <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" /> {row.link}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              ),
          },
          {
            key: "sort_order",
            label: "Sort",
            render: (_, row) => (
              <span className="text-gray-600 text-sm">{row.sort_order}</span>
            ),
          },
          {
            key: "is_active",
            label: "Status",
            sortable: false,
            render: (_, row) => (
              <button
                onClick={() =>
                  toggleMutation.mutate({
                    id: row.id,
                    is_active: row.is_active ? 0 : 1,
                  })
                }
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                  row.is_active
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {row.is_active ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                {row.is_active ? "Active" : "Inactive"}
              </button>
            ),
          },
          {
            key: "id",
            label: "Actions",
            sortable: false,
            render: (_, row) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(row)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(row)}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={banners}
        loading={isLoading}
        emptyMessage="No banners found. Create your first banner to get started."
        enableSearch={true}
        enablePagination={false}
        enableExport={false}
        enableColumnVisibility={false}
      />

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4">
              {editingBanner ? "Edit Promo Banner" : "Add Promo Banner"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Banner Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mega Electronics Sale"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Min 50% Off on Top Brands"
                  value={form.subtitle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subtitle: e.target.value }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300"
                />
              </div>
              {!editingBanner && (
                <ImageUpload
                  label="Banner Image"
                  required
                  value={form.image}
                  uploadPath="banner"
                  onChange={(url) => setForm((f) => ({ ...f, image: url }))}
                />
              )}
              {editingBanner && (
                <p className="text-xs text-gray-400">
                  Image cannot be changed after creation — delete and re-create to replace the visual.
                </p>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Target Redirection Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. /products?category=electronics"
                  value={form.link}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, link: e.target.value }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Position *
                  </label>
                  <select
                    value={form.position}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, position: e.target.value }))
                    }
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300"
                  >
                    <option value="hero">Hero Carousel</option>
                    <option value="sidebar">Side Banners</option>
                    <option value="offer">Offer Banner Grid</option>
                    <option value="mid">Mid Banner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Sort Order *
                  </label>
                  <input
                    type="number"
                    required
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sort_order: e.target.value }))
                    }
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300"
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
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  {saveMutation.isPending
                    ? "Saving..."
                    : editingBanner
                      ? "Save Changes"
                      : "Add Banner"}
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
        title="Delete Banner"
        message={`Are you sure you want to delete "${deleteTarget?.title || 'this banner'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
