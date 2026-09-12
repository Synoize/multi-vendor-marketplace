import { useState, useMemo } from "react";
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
  gst_rate: "18",
};

/**
 * Flatten a nested category tree (any depth) into a single list where every
 * entry carries its nesting depth, its ancestor names, and its parent node.
 */
const flattenTree = (nodes, depth = 0, ancestors = []) =>
  nodes.flatMap((node) => [
    {
      ...node,
      __depth: depth,
      __ancestors: ancestors,
      __parent: ancestors[ancestors.length - 1] || null,
      __path: [...ancestors, node.name].join(" > "),
    },
    ...flattenTree(node.children || [], depth + 1, [...ancestors, node.name]),
  ]);

const levelLabel = (depth) =>
  depth === 0 ? null : depth === 1 ? "Sub-category" : `Level ${depth + 1}`;

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

  const flatCategories = flattenTree(categories);

  // Category ids that must be hidden as a parent option: itself + its
  // descendants (prevents creating cycles).
  const selfAndDescendantIds = useMemo(() => {
    const ids = new Set();
    if (!form.id) return ids;
    const walk = (nodes) => {
      nodes.forEach((n) => {
        ids.add(String(n.id));
        walk(n.children || []);
      });
    };
    const node = categories.find((c) => String(c.id) === String(form.id));
    if (node) walk([node]);
    return ids;
  }, [categories, form.id]);

  const parentOptions = flatCategories.filter(
    (c) => !selfAndDescendantIds.has(String(c.id)),
  );

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
      gst_rate:
        cat.gst_rate != null ? String(cat.gst_rate) : "18",
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
      gst_rate: Math.min(
        Math.max(parseFloat(form.gst_rate) || 0, 0),
        100,
      ),
    });
  };

  const handleDelete = (cat) => {
    setDeleteTarget(cat);
  };

  const handleExport = (filteredData) => {
    const headers = ["Name", "Parent", "Slug", "GST %", "Sort Order", "Status"];
    const rows = filteredData.map((cat) => [
      cat.name,
      cat.__parent ? cat.__parent.name : "",
      cat.slug,
      cat.gst_rate != null ? `${Number(cat.gst_rate)}` : "18",
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

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (value, cat) => (
        <div
          className="flex items-center gap-2.5"
          style={{ paddingLeft: `${cat.__depth * 24}px` }}
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
          {cat.__depth > 0 && (
            <span
              className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded"
              title={cat.__path}
            >
              {levelLabel(cat.__depth)}
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
        <span className="text-gray-500" title={cat.__path}>
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
      key: "gst_rate",
      label: "GST",
      render: (value) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-50 text-primary px-2 py-1 rounded border border-primary-100">
          {value != null ? `${Number(value)}%` : "18%"}
        </span>
      ),
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
            Categories
          </h1>
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
          description="Add your first category."
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
                  <option key={c.id} value={c.id} title={c.__path}>
                    {`${"— ".repeat(c.__depth)}${c.name}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Nest at any depth
              </p>
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              GST Rate (%) *
            </label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.01"
              value={form.gst_rate}
              onChange={set("gst_rate")}
              className="w-full bg-secondary border rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-secondary-600 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Deducted from vendor payout
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUpload
              label="Icon (menus & home)"
              value={form.icon}
              uploadPath="category"
              onChange={(url) => setForm((f) => ({ ...f, icon: url }))}
            />

            <ImageUpload
              label="Image (thumbnails)"
              value={form.image}
              uploadPath="category"
              onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            />
          </div>

          <ImageUpload
            label="Banner (category page)"
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
              placeholder="Optional"
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
        message={`Deactivate "${deleteTarget?.name}"?`}
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
