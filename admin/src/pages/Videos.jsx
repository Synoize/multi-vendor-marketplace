import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { toast } from "sonner";
import ImageUpload from "../components/ui/ImageUpload";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";
import { Plus, Trash2, Pencil, Video, Eye, EyeOff } from "lucide-react";

export default function Videos() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    title: "",
    url: "",
    thumbnail: "",
    sort_order: "0",
  });

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      const res = await api.get("/videos?all=1");
      return res.data.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      if (id) return api.put(`/videos/${id}`, payload);
      return api.post("/videos", payload);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      toast.success(vars.id ? "Video updated" : "Featured video added");
      resetForm();
    },
    onError: (err, vars) => {
      toast.error(vars?.id ? "Failed to update video" : "Failed to add video");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      return api.put(`/videos/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      toast.success("Video status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/videos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      toast.success("Video removed");
    },
    onError: () => {
      toast.error("Failed to remove video");
    },
  });

  const resetForm = () => {
    setForm({
      title: "",
      url: "",
      thumbnail: "",
      sort_order: "0",
    });
    setEditingVideo(null);
    setShowAddModal(false);
  };

  const openAdd = () => {
    setEditingVideo(null);
    setForm({
      title: "",
      url: "",
      thumbnail: "",
      sort_order: "0",
    });
    setShowAddModal(true);
  };

  const openEdit = (vid) => {
    setEditingVideo(vid);
    setForm({
      title: vid.title || "",
      url: vid.url || "",
      thumbnail: vid.thumbnail || "",
      sort_order: vid.sort_order != null ? String(vid.sort_order) : "0",
    });
    setShowAddModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      id: editingVideo?.id || null,
      payload: {
        ...form,
        sort_order: parseInt(form.sort_order),
      },
    });
  };

  const handleDelete = (vid) => {
    setDeleteTarget(vid);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Featured Videos</h1>
          <p className="text-gray-500 text-sm">
            Manage video clips for customer interactive shopping grids
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Video
        </button>
      </div>

      <DataTable
        columns={[
          {
            key: "thumbnail",
            label: "Thumbnail",
            sortable: false,
            render: (val, row) => (
              <img
                src={val || "https://picsum.photos/seed/video/300/200"}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
            ),
          },
          {
            key: "title",
            label: "Title",
            render: (val) => (
              <span className="font-semibold text-gray-900">{val || "Untitled Video"}</span>
            ),
          },
          {
            key: "url",
            label: "URL",
            sortable: false,
            render: (val) => (
              <span className="text-xs text-gray-400 truncate font-mono max-w-[200px] block">{val}</span>
            ),
          },
          {
            key: "sort_order",
            label: "Sort",
            render: (val) => <span>{val}</span>,
          },
          {
            key: "is_active",
            label: "Status",
            sortable: false,
            render: (val, row) => (
              <button
                onClick={() =>
                  toggleMutation.mutate({
                    id: row.id,
                    is_active: val ? 0 : 1,
                  })
                }
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                  val
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {val ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {val ? "Active" : "Inactive"}
              </button>
            ),
          },
          {
            key: "id",
            label: "Actions",
            sortable: false,
            render: (val, row) => (
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
        data={videos}
        loading={isLoading}
        emptyMessage="No videos found."
        enableSearch={true}
        enablePagination={false}
        enableExport={false}
        enableColumnVisibility={false}
      />

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4">
              {editingVideo ? "Edit Featured Video" : "Add Featured Video"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Video Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unboxing New Samsung S24 Ultra"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Video Link (YouTube/MP4) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://www.youtube.com/watch?v=xxx"
                  value={form.url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, url: e.target.value }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300"
                />
              </div>
              <ImageUpload
                label="Thumbnail Image"
                required
                value={form.thumbnail}
                uploadPath="video"
                onChange={(url) => setForm((f) => ({ ...f, thumbnail: url }))}
              />
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
                    : editingVideo
                      ? "Save Changes"
                      : "Add Video"}
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
        title="Remove Video"
        message={`Are you sure you want to remove "${deleteTarget?.title || 'this video'}"? This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
