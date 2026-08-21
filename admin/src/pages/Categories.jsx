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
  FolderTree,
  Folder,
  Download,
} from "lucide-react";

const emptyForm = {
  id: null,
  name: "",
  parent_id: "",
  description: "",
  image: "",
  icon: "",
  banner: "",
  sort_order: "0",
};

export default function Categories() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await api.get("/categories?all=1");
      return res.data.data || [];
    },
  });

  const flatCategories = categories.flatMap((parent) => [
    parent,
    ...(parent.children || []).map((child) => ({
      ...child,
      __parent: parent,
    })),
  ]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const { id, ...body } = payload;
      if (id) return api.put(`/categories/${id}`, body);
      return api.post("/categories", body);
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast.success(vars.id ? "Category updated" : "Category created");
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: () => toast.error("Failed to save category"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) =>
      api.put(`/categories/${id}`, { is_active: is_active ? 0 : 1 }),
    onSuccess: () => {
      invalidate();
      toast.success("Category status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Category deactivated");
    },
    onError: () => toast.error("Failed to deactivate category"),
  });

  const openAdd = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setForm({
      id: cat.id,
      name: cat.name || "",
      parent_id: cat.parent_id ? String(cat.parent_id) : "",
      description: cat.description || "",
      image: cat.image || "",
      icon: cat.icon || "",
      banner: cat.banner || "",
      sort_order: cat.sort_order != null ? String(cat.sort_order) : "0",
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    saveMutation.mutate({
      ...form,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      sort_order: parseInt(form.sort_order || "0", 10) || 0,
    });
  };

  const handleDelete = (cat) => {
    setDeleteTarget(cat);
  };

  const handleExport = (filteredData) => {
    const headers = ["Name", "Parent", "Slug", "Sort Order", "Status"];
    const rows = filteredData.map((cat) => [
      cat.name,
      cat.__parent ? cat.__parent.name : "",
      cat.slug,
      cat.sort_order,
      cat.is_active ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "categories.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parentOptions = categories.filter((c) => c.id !== form.id);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (value, cat) => (
        <div
          className={`flex items-center gap-2.5 ${cat.__parent ? "pl-6" : ""}`}
        >
          {cat.image || cat.icon ? (
            <img
              src={cat.image || cat.icon}
              alt=""
              className="h-6 w-6 rounded-md object-cover border border-gray-200 flex-shrink-0"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : cat.__parent ? (
            <Folder className="h-4 w-4 text-gray-500" />
          ) : (
            <Folder className="h-4 w-4 text-red-500" />
          )}
          <span className="font-medium text-gray-900">{cat.name}</span>
          {cat.__parent && (
            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              Sub-category
            </span>
          )}
        </div>
      ),
    },
    {
      key: "parent",
      label: "Parent",
      sortable: false,
      render: (value, cat) => (
        <span className="text-gray-500">
          {cat.__parent ? cat.__parent.name : "—"}
        </span>
      ),
    },
    {
      key: "slug",
      label: "Slug",
      render: (value) => <span className="text-gray-500">{value}</span>,
    },
    {
      key: "sort_order",
      label: "Sort Order",
      render: (value) => <span className="text-gray-500">{value}</span>,
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
      render: (value, cat) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() =>
              toggleMutation.mutate({ id: cat.id, is_active: cat.is_active })
            }
            title={cat.is_active ? "Deactivate" : "Activate"}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {cat.is_active ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => openEdit(cat)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(cat)}
            className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderTopToolbarCustomActions = ({ data: tableData }) => (
    <button
      onClick={() => handleExport(tableData)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
    >
      <Download className="h-3.5 w-3.5" /> Export CSV
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Category Management
          </h1>
          <p className="text-gray-500 text-sm">
            Organize the store catalog — vendors pick categories from this list
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-primary hover:bg-opacity-90 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : flatCategories.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-10 w-10 text-gray-400" />}
          title="No categories"
          description="Create your first category to start organizing products."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={flatCategories}
            loading={isLoading}
            emptyMessage="No categories found"
            enableSearch
            enableExport
            enableColumnVisibility
            enablePagination
            renderTopToolbarCustomActions={renderTopToolbarCustomActions}
          />
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={form.id ? "Edit Category" : "Add Category"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Electronics"
              value={form.name}
              onChange={set("name")}
              className="w-full bg-secondary border rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-secondary-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Parent Category
              </label>
              <select
                value={form.parent_id}
                onChange={set("parent_id")}
                className="w-full bg-secondary border rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-secondary-600 outline-none"
              >
                <option value="">— None (Top level) —</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={set("sort_order")}
                className="w-full bg-secondary border rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-secondary-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUpload
              label="Category Icon (small — category menus & home)"
              value={form.icon}
              uploadPath="category"
              onChange={(url) => setForm((f) => ({ ...f, icon: url }))}
            />

            <ImageUpload
              label="Category Image (sub-category thumbnails)"
              value={form.image}
              uploadPath="category"
              onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            />
          </div>

          <ImageUpload
            label="Category Banner (shown when user clicks this category)"
            value={form.banner}
            uploadPath="banner"
            onChange={(url) => setForm((f) => ({ ...f, banner: url }))}
          />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Short description of this category"
              value={form.description}
              onChange={set("description")}
              className="w-full bg-secondary border rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-secondary-600 outline-none resize-none"
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
                  : "Add Category"}
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
        title="Deactivate Category"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"? It will no longer appear in vendor listings.`}
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
