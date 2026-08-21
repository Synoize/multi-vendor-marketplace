import { useState, useRef } from "react";
import { Upload, Link, X, ImageIcon, Loader2 } from "lucide-react";
import api from "../../lib/axios";

export default function ImageUpload({
  value = "",
  onChange,
  label = "Image",
  required = false,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  uploadPath = "",
}) {
  const [mode, setMode] = useState(value ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState(value || "");
  const fileRef = useRef(null);

  const endpoint = uploadPath ? `/upload/image/${uploadPath}` : "/upload/image";

  const handleFile = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("images", file);
    setUploading(true);
    try {
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        onChange(url);
        setUrlInput(url);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (trimmed) onChange(trimmed);
  };

  const clearImage = () => {
    onChange("");
    setUrlInput("");
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="flex gap-1 mb-3">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            mode === "upload"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          }`}
        >
          <Upload className="w-3.5 h-3.5" /> Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            mode === "url"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          }`}
        >
          <Link className="w-3.5 h-3.5" /> Paste URL
        </button>
      </div>

      {mode === "upload" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-primary bg-primary-50"
              : "border-gray-200 hover:border-gray-300 bg-gray-50"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-gray-500">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-500">Click or drag image here</p>
              <p className="text-xs text-gray-400">JPEG, PNG, WebP, GIF</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            className="flex-1 border bg-secondary text-secondary-950 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary-600 transition-all font-mono"
          />
          {urlInput && (
            <button
              type="button"
              onClick={clearImage}
              className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {value && (
        <div className="relative mt-3 inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-24 rounded-xl border border-gray-200 object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
