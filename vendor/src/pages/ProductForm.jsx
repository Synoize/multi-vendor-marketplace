import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Upload,
  X,
  Tag,
  IndianRupee,
  Package,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Scale,
  Ruler,
  Video as VideoIcon,
  Link,
  Play,
  Layers,
  SquarePlus,
  Search,
  Check,
  Plus,
} from "lucide-react";
import { useProductStore } from "../store/productStore";
import { useVendorStore } from "../store/vendorStore";
import api from "../lib/axios";
import Spinner from "../components/ui/Spinner";
import VariantManager from "../components/product/VariantManager";
import VariantBuilder from "../components/product/VariantBuilder";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price: z.coerce.number().positive("Price must be a positive number"),
  mrp: z.coerce
    .number()
    .positive("MRP must be a positive number")
    .optional()
    .or(z.literal("")),
  cost_price: z.coerce.number().min(0).optional().or(z.literal("")),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  low_stock_threshold: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .or(z.literal("")),
  sku: z.string().optional(),
  category: z.string().min(1, "Please select a category"),
  brand_id: z.string().optional(),
  tags: z.string().optional(),
  weight: z.coerce.number().min(0).optional().or(z.literal("")),
  dim_length: z.coerce.number().min(0).optional().or(z.literal("")),
  dim_width: z.coerce.number().min(0).optional().or(z.literal("")),
  dim_height: z.coerce.number().min(0).optional().or(z.literal("")),
  is_returnable: z.boolean().optional(),
  return_window: z.coerce.number().int().min(0).optional(),
  return_type: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
  cod_available: z.boolean().optional(),
  video_url: z.string().optional().or(z.literal("")),
});

const detectVideoType = (url = "") => {
  const u = String(url || "")
    .trim()
    .toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  return "direct";
};

/**
 * Walk a nested category tree and return the path of category nodes from the
 * root down to the category whose id matches `targetId`. Returns null when not
 * found. Supports unlimited nesting depth.
 */
const findCategoryPath = (nodes, targetId, trail = []) => {
  for (const node of nodes || []) {
    const next = [...trail, node];
    if (String(node.id) === String(targetId)) return next;
    if (node.children?.length) {
      const found = findCategoryPath(node.children, targetId, next);
      if (found) return found;
    }
  }
  return null;
};

const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB

const formatFileSize = (bytes) => {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
};

function VideoPreview({ url }) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (u.includes("youtube.com") || u.includes("youtu.be")) {
    const id = u.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/,
    )?.[1];
    return id ? (
      <iframe
        src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}`}
        title="Video preview"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    ) : null;
  }
  if (u.includes("vimeo.com")) {
    const id = u.match(
      /(?:vimeo\.com|player\.vimeo\.com)\/(?:video\/)?(\d+)/,
    )?.[1];
    return id ? (
      <iframe
        src={`https://player.vimeo.com/video/${id}?autoplay=1&muted=1&controls=0&loop=1`}
        title="Video preview"
        allow="autoplay"
        allowFullScreen
        className="w-full h-full"
      />
    ) : null;
  }
  return (
    <video
      src={u}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className="w-full h-full"
    />
  );
}

function FormSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
            <Icon strokeWidth={1.5} className="w-4 h-4 text-primary" />
          </div>
        )}
        <h3 className="text-sm sm:text-base font-semibold text-secondary-950">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function FieldError({ error }) {
  if (!error) return null;
  return <p className="text-xs text-red-600 mt-1">{error.message}</p>;
}

const STEPS = [
  { key: "basic", label: "Basic Information", icon: FileText },
  { key: "catalog", label: "Category & Tags", icon: Tag },
  { key: "variants", label: "Variants", icon: Layers },
  { key: "additional", label: "Additional Information", icon: SquarePlus },
  { key: "seo", label: "SEO & Meta", icon: Search },
];

const STEP_FIELDS = {
  basic: ["name", "price", "mrp", "stock"],
  catalog: ["category", "brand_id", "tags"],
  variants: [],
  additional: [
    "description",
    "short_description",
    "sku",
    "cost_price",
    "low_stock_threshold",
    "weight",
    "dim_length",
    "dim_width",
    "dim_height",
    "is_returnable",
    "return_window",
    "return_type",
    "cod_available",
  ],
  seo: ["seo_title", "seo_description", "seo_keywords"],
};

const inputClass =
  "w-full px-4 py-2.5 text-xs border rounded-xl outline-none focus:border-secondary-600 transition-all";
const errorInputClass =
  "w-full px-4 py-2.5 text-xs border border-red-300 bg-red-50 rounded-xl outline-none focus:border-red-400 transition-all";

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fetchCategories = useProductStore((state) => state.fetchCategories);
  const createCategory = useProductStore((state) => state.createCategory);
  const fetchBrands = useProductStore((state) => state.fetchBrands);
  const fetchProduct = useProductStore((state) => state.fetchProduct);
  const fetchVendorProfile = useVendorStore((state) => state.fetchProfile);
  const createProduct = useProductStore((state) => state.createProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [videoMode, setVideoMode] = useState("upload"); // 'upload' | 'link'
  const [variants, setVariants] = useState([]);
  const [variantImageMap, setVariantImageMap] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [catLevels, setCatLevels] = useState([]);
  const selectedCat = catLevels[catLevels.length - 1];
  const [addOwnParentId, setAddOwnParentId] = useState(null);
  const [addOwnName, setAddOwnName] = useState("");
  const [addOwnSaving, setAddOwnSaving] = useState(false);
  const [addOwnError, setAddOwnError] = useState("");
  const [addOwnFile, setAddOwnFile] = useState(null);
  const [addOwnPreview, setAddOwnPreview] = useState("");
  const addOwnFileRef = useRef(null);

  const resetAddOwn = () => {
    setAddOwnParentId(null);
    setAddOwnName("");
    setAddOwnError("");
    setAddOwnFile(null);
    if (addOwnPreview) URL.revokeObjectURL(addOwnPreview);
    setAddOwnPreview("");
  };

  const handleAddOwnFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (addOwnPreview) URL.revokeObjectURL(addOwnPreview);
    setAddOwnFile(file);
    setAddOwnPreview(URL.createObjectURL(file));
  };

  const handleAddOwn = async (parentId) => {
    if (!addOwnName.trim() || addOwnSaving) return;
    setAddOwnSaving(true);
    setAddOwnError("");
    try {
      let imageUrl = "";
      if (addOwnFile) {
        const fd = new FormData();
        fd.append("images", addOwnFile);
        const up = await api.post("/upload/image/category", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        imageUrl = up.data?.data?.url || up.data?.url || "";
      }
      const res = await createCategory({
        name: addOwnName.trim(),
        parent_id: parentId,
        image: imageUrl || undefined,
      });
      const created = res.data?.data || res.data;
      if (created?.id) {
        setCatLevels((levels) => {
          const idx = levels.findIndex(
            (l) => String(l.id) === String(parentId),
          );
          return [...levels.slice(0, idx + 1), created];
        });
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      }
      resetAddOwn();
    } catch (err) {
      setAddOwnError(err?.response?.data?.message || "Could not add category");
      setAddOwnSaving(false);
    }
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      short_description: "",
      price: "",
      mrp: "",
      cost_price: "",
      stock: 0,
      low_stock_threshold: 5,
      sku: "",
      category: "",
      brand_id: "",
      tags: "",
      weight: "",
      dim_length: "",
      dim_width: "",
      dim_height: "",
      is_returnable: false,
      return_window: 7,
      return_type: "full_return",
      seo_title: "",
      seo_description: "",
      seo_keywords: "",
      cod_available: true,
      video_url: "",
    },
  });

  // Vendor profile (commission / GST rates) for the payout preview
  // MUST be declared before the pricing useMemo below.
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: () => fetchVendorProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const watchValues = watch();
  const isReturnable = watch("is_returnable");
  const videoUrlField = watchValues.video_url || "";

  // Payout preview — mirrors the server order maths (order.service.js):
  // customer price is tax-inclusive; commission & GST are deducted from payout.
  const pricing = useMemo(() => {
    const price = Number(watchValues.price) || 0;
    const mrp = Number(watchValues.mrp) || 0;
    const vendorRate = vendorProfile?.effective_commission_rate;
    const platformRate = vendorProfile?.platform_commission_rate;
    const commissionRate = Number(
      vendorRate != null && vendorRate !== ""
        ? vendorRate
        : platformRate != null && platformRate !== ""
          ? platformRate
          : 5,
    );
    const leaf = catLevels[catLevels.length - 1];
    const catGst = leaf?.gst_rate;
    const vendorGst = vendorProfile?.gst_rate;
    const toNum = (v) =>
      v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;
    const gstRate = toNum(catGst) ?? toNum(vendorGst) ?? 18;
    const commissionAmount = (price * commissionRate) / 100;
    const gstAmount = (price * gstRate) / 100;
    const payout = price - commissionAmount - gstAmount;
    const discount =
      mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
    return {
      price,
      mrp,
      commissionRate,
      commissionAmount,
      gstRate,
      gstAmount,
      payout,
      discount,
    };
  }, [watchValues.price, watchValues.mrp, vendorProfile, catLevels]);

  const inr = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Sync the hidden `category` form field with the most specific selected node.
  useEffect(() => {
    const leaf = catLevels[catLevels.length - 1];
    setValue("category", leaf ? String(leaf.id) : "");
  }, [catLevels, setValue]);

  // Restore the full category path when editing a product.
  useEffect(() => {
    if (!editingProduct?.category_id || !categories.length) return;
    const path = findCategoryPath(categories, editingProduct.category_id);
    if (path?.length) setCatLevels(path);
  }, [editingProduct, categories]);

  // Reset the category cascade whenever the form switches to another product.
  useEffect(() => {
    setCatLevels([]);
  }, [id]);

  // Fetch brands
  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: () => fetchBrands(),
  });
  const brands = Array.isArray(brandsData) ? brandsData : [];

  // Fetch product if editing
  // NOTE: React Query v5 ignores onSuccess/onError on useQuery, so the
  // prefill is applied via effects on the query result below.
  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: isEdit,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!product) return;
    setEditingProduct(product);
    reset({
      name: product.name || "",
      description: product.description || "",
      short_description: product.short_description || "",
      price: product.price || "",
      mrp: product.mrp || "",
      cost_price: product.cost_price || "",
      stock: product.stock ?? product.quantity ?? 0,
      low_stock_threshold: product.low_stock_threshold ?? 5,
      sku: product.sku || "",
      category: "",
      brand_id: product.brand_id || "",
      tags: Array.isArray(product.tags)
        ? product.tags.join(", ")
        : product.tags || "",
      weight: product.weight ?? "",
      dim_length: product.dimensions?.length ?? "",
      dim_width: product.dimensions?.width ?? "",
      dim_height: product.dimensions?.height ?? "",
      is_returnable:
        product.is_returnable === 1 || product.is_returnable === true,
      return_window: product.return_window || 7,
      return_type: product.return_type || "full_return",
      seo_title: product.seo_title || "",
      seo_description: product.seo_description || "",
      seo_keywords: product.seo_keywords || "",
      cod_available:
        product.is_cod_available === 0 || product.is_cod_available === false
          ? false
          : true,
      video_url: product.video_url || "",
    });
    if (product.images) setExistingImages(product.images);
    if (product.variants) setVariants(product.variants);
    setVideoFile(null);
    setVideoPreview("");
    setVideoMode(
      product.video_url && String(product.video_url).trim() ? "link" : "upload",
    );
  }, [product, reset]);

  useEffect(() => {
    if (productError) toast.error("Failed to load product details");
  }, [productError]);

  // Mutations
  const mutation = useMutation({
    mutationFn: (formData) => {
      if (isEdit) {
        return updateProduct(id, formData);
      } else {
        return createProduct(formData);
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? "Product updated successfully"
          : "Product created successfully",
      );
      queryClient.invalidateQueries(["vendor-products"]);
      navigate("/products");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to save product");
    },
  });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setNewImageFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeNewImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error(
        `Video file exceeds the 10MB limit (${formatFileSize(file.size)}). Please choose a smaller file.`,
      );
      e.target.value = "";
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setValue("video_url", "");
    e.target.value = "";
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview("");
    setValue("video_url", "");
  };

  const stepHasError = (key) =>
    (STEP_FIELDS[key] || []).some((field) => !!errors[field]);

  const stepDone = (key) => {
    const fields = STEP_FIELDS[key] || [];
    if (!fields.length || stepHasError(key)) return false;
    return fields.some((field) => {
      const v = watchValues[field];
      return (
        v !== undefined && v !== null && v !== "" && v !== 0 && v !== false
      );
    });
  };

  const goToStep = (index) => setActiveStep(index);

  const handleNext = async () => {
    const step = STEPS[activeStep];
    const ok = await trigger(STEP_FIELDS[step.key]);
    if (ok) setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onInvalid = (errs) => {
    const idx = STEPS.findIndex((s) =>
      (STEP_FIELDS[s.key] || []).some((f) => errs[f]),
    );
    if (idx >= 0) setActiveStep(idx);
  };

  const onSubmit = async (values) => {
    const formData = new FormData();
    const dims = {};
    if (values.dim_length !== "" && values.dim_length !== undefined)
      dims.length = values.dim_length;
    if (values.dim_width !== "" && values.dim_width !== undefined)
      dims.width = values.dim_width;
    if (values.dim_height !== "" && values.dim_height !== undefined)
      dims.height = values.dim_height;
    Object.entries(values).forEach(([key, value]) => {
      if (["dim_length", "dim_width", "dim_height", "video_url"].includes(key))
        return;
      if (value !== undefined && value !== "") {
        formData.append(key, value);
      }
    });
    formData.set("category", String(values.category || ""));
    if (Object.keys(dims).length) {
      formData.append("dimensions", JSON.stringify(dims));
    }
    if (values.tags) {
      const tagArray = values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      formData.delete("tags");
      tagArray.forEach((tag) => formData.append("tags[]", tag));
    }
    newImageFiles.forEach((file) => formData.append("images", file));
    if (isEdit) {
      formData.append("existing_images", JSON.stringify(existingImages));
    } else if (variants.length) {
      const files = [];
      const safeVariants = variants.map((v) => {
        if (v?.image && typeof v.image === "object" && v.image.ref) {
          const entry = variantImageMap[v.image.ref];
          if (entry?.file) {
            files.push(entry.file);
            return { ...v, image: "__VARIANT_IMAGE__" };
          }
          return { ...v, image: null };
        }
        return v;
      });
      formData.append("variants", JSON.stringify(safeVariants));
      files.forEach((file) => formData.append("variant_images", file));
    }
    if (videoFile) {
      formData.append("video", videoFile);
      formData.append("video_type", "direct");
    } else {
      formData.append("video_url", values.video_url || "");
      formData.append("video_type", detectVideoType(values.video_url));
    }
    mutation.mutate(formData);
  };

  if (isEdit && productLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/products")}
          className="p-2 rounded-xl bg-white border text-secondary-800 hover:bg-secondary transition-colors"
        >
          <ChevronLeft strokeWidth={1.5} className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div>
          <h1 className="text-sm sm:text-xl font-medium text-secondary-950">
            {isEdit ? "Edit Product" : "Add New Product"}
          </h1>
          <p className="text-xs text-secondary-800 mt-0.5 line-clamp-1">
            {isEdit
              ? "Update your product details below"
              : "Fill in the details to add a new product to your store"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-secondary-800 bg-white border rounded-xl hover:bg-secondary transition-colors"
        >
          <Eye strokeWidth={1.5} className="w-4 h-4" />
          <span className="hidden sm:block">
            {showPreview ? "Hide Preview" : "Preview"}
          </span>
        </button>
      </div>

      <div
        className={`xl:grid flex flex-col-reverse gap-6 ${showPreview ? "xl:grid-cols-3" : "grid-cols-1"}`}
      >
        <div className={`space-y-5 ${showPreview ? "xl:col-span-2" : ""}`}>
          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="space-y-5 lg:flex lg:items-start lg:gap-6"
          >
            {/* Step sidebar */}
            <nav className="lg:w-56 lg:shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border p-2 lg:p-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
                <p className="px-2 pt-1 pb-2 text-[11px] font-semibold text-secondary-700 uppercase tracking-wide hidden lg:block">
                  Sections
                </p>
                <ol className="flex lg:flex-col gap-1 lg:gap-0.5 overflow-x-auto lg:overflow-x-visible scrollbar-hide">
                  {STEPS.map((step, index) => (
                    <li key={step.key} className="flex-1 lg:flex-none">
                      <button
                        type="button"
                        onClick={() => goToStep(index)}
                        className={`flex items-center justify-center md:justify-start gap-2.5 w-full px-2.5 py-2 lg:py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                          activeStep === index
                            ? "bg-primary text-white shadow-sm"
                            : "text-secondary-900 hover:bg-secondary-50"
                        }`}
                      >
                        <step.icon
                          strokeWidth={1.5}
                          className="w-4 h-4 shrink-0"
                        />
                        <span className="truncate hidden md:block">
                          {step.label}
                        </span>
                        {stepHasError(step.key) ? (
                          <X
                            className={`hidden md:block w-3.5 h-3.5 ml-auto shrink-0 ${
                              activeStep === index
                                ? "text-red-200"
                                : "text-red-400"
                            }`}
                          />
                        ) : stepDone(step.key) ? (
                          <Check
                            className={`hidden md:block w-3.5 h-3.5 ml-auto shrink-0 ${
                              activeStep === index
                                ? "text-white"
                                : "text-emerald-500"
                            }`}
                          />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>

            <div className="flex-1 min-w-0 space-y-5">
              {/* Basic Info */}
              {activeStep === 0 && (
                <FormSection title="Basic Information" icon={FileText}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register("name")}
                        placeholder="e.g., Premium Cotton T-Shirt"
                        className={errors.name ? errorInputClass : inputClass}
                      />
                      <FieldError error={errors.name} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                          Selling Price (₹)
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            {...register("price")}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className={`pl-9 ${errors.price ? errorInputClass : inputClass}`}
                          />
                        </div>
                        <FieldError error={errors.price} />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                          MRP (₹)
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            {...register("mrp")}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className={`pl-9 ${errors.mrp ? errorInputClass : inputClass}`}
                          />
                        </div>
                        <FieldError error={errors.mrp} />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                          Stock <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            {...register("stock")}
                            type="number"
                            min="0"
                            placeholder="0"
                            className={`pl-9 ${errors.stock ? errorInputClass : inputClass}`}
                          />
                        </div>
                        <FieldError error={errors.stock} />
                      </div>
                    </div>
                  </div>
                </FormSection>
              )}

              {/* Category & Tags */}
              {activeStep === 1 && (
                <FormSection title="Category & Tags" icon={Tag}>
                  <div className="flex flex-col gap-4">
                    <div className="col-span-full min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        Category <span className="text-red-500">*</span>
                      </label>
                      {/* Breadcrumb */}
                      {catLevels.length > 0 && (
                        <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-hide pb-1">
                          {catLevels.map((category, index) => (
                            <React.Fragment key={category.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  setCatLevels(catLevels.slice(0, index + 1))
                                }
                                className={`shrink-0 text-xs whitespace-nowrap transition-colors ${index === catLevels.length - 1 ? "font-semibold text-primary" : "text-secondary-600 hover:text-primary"}`}
                              >
                                {category.name}
                              </button>
                              {index < catLevels.length - 1 && (
                                <ChevronRight className="h-3 w-3 shrink-0 text-secondary-400" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        {/* Category Browser */}
                        <div className="w-full min-w-0 overflow-x-auto scrollbar-hide">
                          <div className="flex min-w-max">
                            {Array.from({
                              length: Math.min(catLevels.length + 1, 6),
                            }).map((_, levelIndex) => {
                              const isDeepest =
                                levelIndex === catLevels.length &&
                                catLevels.length > 0;
                              const options =
                                levelIndex === 0
                                  ? categories
                                  : catLevels[levelIndex - 1]?.children || [];
                              if (!options.length && !isDeepest) return null;
                              const parent = catLevels[levelIndex - 1];
                              const parentId = parent
                                ? String(parent.id)
                                : null;
                              const selectedId = catLevels[levelIndex]?.id;
                              return (
                                <div
                                  key={levelIndex}
                                  className=" w-[200px] sm:w-[220px] md:w-[240px] shrink-0 "
                                >
                                  {/* Column Header */}
                                  <div className="sticky top-0 z-10 px-3 sm:px-4 py-2.5 sm:py-3 bg-white">
                                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-secondary-800">
                                      {levelIndex === 0
                                        ? "Categories"
                                        : isDeepest
                                          ? "Add own"
                                          : `Level ${levelIndex + 1}`}
                                    </p>
                                  </div>
                                  {/* Category Items */}
                                  <div className="h-[260px] sm:h-[320px] md:h-[360px] overflow-y-auto p-1.5 sm:p-2 scrollbar-thin ">
                                    {options.map((option) => {
                                      const isSelected =
                                        String(option.id) ===
                                        String(selectedId);
                                      const hasChildren =
                                        Array.isArray(option.children) &&
                                        option.children.length > 0;
                                      return (
                                        <button
                                          key={option.id}
                                          type="button"
                                          onClick={() => {
                                            setCatLevels([
                                              ...catLevels.slice(0, levelIndex),
                                              option,
                                            ]);
                                          }}
                                          className={`group relative flex max-w-[180px] w-full items-center justify-between gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 text-left text-xs sm:text-sm transition-colors rounded-md ${isSelected ? "bg-primary text-white font-medium" : "text-secondary-950 hover:text-primary hover:bg-secondary-50"} `}
                                        >
                                          <span className="min-w-0 truncate pr-1">
                                            {option.name}
                                          </span>
                                          {hasChildren && (
                                            <ChevronRight
                                              className={` h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${isSelected ? "text-white" : "text-secondary-400 group-hover:text-primary"} `}
                                            />
                                          )}
                                          {/* Selected Arrow */}
                                          {isSelected && (
                                            <span className=" absolute -right-2 sm:-right-3 top-0 h-full w-3 sm:w-4 bg-primary [clip-path:polygon(0_0,100%_50%,0_100%)] z-20 " />
                                          )}
                                        </button>
                                      );
                                    })}
                                    {/* Other — vendor's own subcategory */}
                                    {isDeepest && (
                                      <div className="mt-1 pt-1 border-t border-secondary-100">
                                        {addOwnParentId === parentId ? (
                                          <div className="px-1 py-1">
                                            <div className="relative">
                                              <input
                                                value={addOwnName}
                                                onChange={(e) =>
                                                  setAddOwnName(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter")
                                                    handleAddOwn(parentId);
                                                }}
                                                autoFocus
                                                placeholder="Type your own"
                                                className="w-full bg-white border border-primary/40 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                                              />
                                              {addOwnSaving && (
                                                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-primary" />
                                              )}
                                            </div>
                                            {/* PNG icon (no background) */}
                                            <div className="flex items-center gap-2 mt-2">
                                              <input
                                                ref={addOwnFileRef}
                                                type="file"
                                                accept="image/png"
                                                className="hidden"
                                                onChange={handleAddOwnFile}
                                                disabled={addOwnSaving}
                                              />
                                              <button
                                                type="button"
                                                disabled={addOwnSaving}
                                                onClick={() =>
                                                  addOwnFileRef.current?.click()
                                                }
                                                className="flex items-center gap-1.5 text-[11px] font-medium text-primary border border-primary/30 rounded-md px-2 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
                                              >
                                                <ImageIcon className="h-3.5 w-3.5" />
                                                {addOwnFile
                                                  ? "Change icon"
                                                  : "PNG icon (no background)"}
                                              </button>
                                              {addOwnPreview && (
                                                <img
                                                  src={addOwnPreview}
                                                  alt=""
                                                  className="h-7 w-7 object-contain rounded border"
                                                />
                                              )}
                                              {addOwnFile && !addOwnSaving && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (addOwnPreview)
                                                      URL.revokeObjectURL(
                                                        addOwnPreview,
                                                      );
                                                    setAddOwnFile(null);
                                                    setAddOwnPreview("");
                                                  }}
                                                  className="text-secondary-500 hover:text-red-500 transition-colors"
                                                >
                                                  <X className="h-3.5 w-3.5" />
                                                </button>
                                              )}
                                              {addOwnFile && !addOwnSaving && (
                                                <span className="min-w-0 truncate text-[10px] text-secondary-600">
                                                  {addOwnFile.name}
                                                </span>
                                              )}
                                            </div>
                                            {addOwnError && (
                                              <p className="text-[10px] text-red-600 mt-1">
                                                {addOwnError}
                                              </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1.5">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleAddOwn(parentId)
                                                }
                                                disabled={
                                                  !addOwnName.trim() ||
                                                  addOwnSaving
                                                }
                                                className="flex-1 text-xs font-medium bg-primary disabled:bg-primary/40 text-white rounded-md py-1.5 transition-colors"
                                              >
                                                {addOwnSaving
                                                  ? "Saving..."
                                                  : "Add"}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={resetAddOwn}
                                                className="text-xs text-secondary-600 px-2 py-1.5 hover:text-secondary-900"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAddOwnParentId(parentId);
                                              setAddOwnName("");
                                              setAddOwnError("");
                                            }}
                                            className="flex items-center gap-1.5 w-full px-2.5 py-2 text-left text-xs font-medium text-primary hover:bg-primary/5 rounded-md transition-colors"
                                          >
                                            <Plus className="h-3.5 w-3.5" /> Add
                                            Other
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Selected category image / icon — right column */}
                        {selectedCat && !selectedCat.children?.length && (
                          <div className="w-[200px] sm:w-[220px] md:w-[240px] shrink-0">
                            {/* Column Header */}
                            <div className="px-3 sm:px-4 py-2.5 sm:py-3">
                              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-secondary-800">
                                Selected
                              </p>
                            </div>
                            {/* Selected Category Preview */}
                            <div className="h-[280px] sm:h-[320px] md:h-[360px] bg-red-500 p-1.5 sm:p-2 scrollbar-thin flex flex-col">
                              <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-secondary-200 bg-secondary-50/60 p-4">
                                <div className="overflow-hidden">
                                  {selectedCat.image || selectedCat.icon ? (
                                    <img
                                      src={
                                        selectedCat.image || selectedCat.icon
                                      }
                                      alt={selectedCat.name}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center p-3 rounded-lg bg-primary/10 text-primary">
                                      <Tag
                                        strokeWidth={1.5}
                                        className="h-8 w-8"
                                      />
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm font-semibold text-secondary-950 text-center">
                                  {selectedCat.name}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <FieldError error={errors.category} />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        Brand
                      </label>
                      <select {...register("brand_id")} className={inputClass}>
                        <option value="">Select a brand (optional)</option>
                        {brands.map((brand) => (
                          <option
                            key={brand._id || brand.id}
                            value={brand._id || brand.id}
                          >
                            {brand.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        Tags
                        <span className="text-secondary-700 font-normal ml-1">
                          (comma-separated)
                        </span>
                      </label>
                      <input
                        {...register("tags")}
                        placeholder="e.g., cotton, casual, summer, men"
                        className={inputClass}
                      />
                      <p className="text-xs text-secondary-700 mt-2">
                        Tags help customers find your product
                      </p>
                    </div>
                  </div>
                </FormSection>
              )}

              {/* Description & Details */}
              {activeStep === 3 && (
                <FormSection title="Description & Details" icon={FileText}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        Description
                      </label>
                      <textarea
                        {...register("description")}
                        rows={4}
                        placeholder="Describe your product in detail…"
                        className={`resize-none ${errors.description ? errorInputClass : inputClass}`}
                      />
                      <FieldError error={errors.description} />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        Short Description
                      </label>
                      <textarea
                        {...register("short_description")}
                        rows={2}
                        placeholder="A brief one-line summary shown in listings"
                        className={`resize-none ${inputClass}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                          SKU
                        </label>
                        <input
                          {...register("sku")}
                          placeholder="e.g., TSHIRT-BLK-M"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                          Cost Price (₹)
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            {...register("cost_price")}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className={`pl-9 ${errors.cost_price ? errorInputClass : inputClass}`}
                          />
                        </div>
                        <FieldError error={errors.cost_price} />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                          Low Stock Alert (units)
                        </label>
                        <input
                          {...register("low_stock_threshold")}
                          type="number"
                          min="0"
                          placeholder="5"
                          className={
                            errors.low_stock_threshold
                              ? errorInputClass
                              : inputClass
                          }
                        />
                        <FieldError error={errors.low_stock_threshold} />
                      </div>
                    </div>
                  </div>
                </FormSection>
              )}

              {/* Packaging & Dimensions */}
              {activeStep === 3 && (
                <FormSection title="Packaging & Dimensions" icon={Scale}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        Weight (grams)
                      </label>
                      <div className="relative">
                        <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          {...register("weight")}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g., 250"
                          className={`pl-9 ${inputClass}`}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        Dimensions (cm)
                        <span className="text-secondary-700 font-normal ml-1">
                          L × W × H
                        </span>
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="relative">
                          <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-700" />
                          <input
                            {...register("dim_length")}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Length"
                            className={`pl-9 ${inputClass}`}
                          />
                        </div>
                        <div className="relative">
                          <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-700" />
                          <input
                            {...register("dim_width")}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Width"
                            className={`pl-9 ${inputClass}`}
                          />
                        </div>
                        <div className="relative">
                          <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-700" />
                          <input
                            {...register("dim_height")}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Height"
                            className={`pl-9 ${inputClass}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </FormSection>
              )}

              {/* Images & Video — shown in Basic Information */}
              {activeStep === 0 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormSection title="Product Images" icon={ImageIcon}>
                    <div>
                      {/* Existing images */}
                      {existingImages.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-medium text-secondary-800 uppercase tracking-wide mb-2">
                            Current Images
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {existingImages.map((image, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={image.url || image}
                                  alt={`Product ${index + 1}`}
                                  className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl object-cover border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeExistingImage(index)}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New image previews */}
                      {imagePreviews.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-medium text-secondary-700 uppercase tracking-wide mb-2">
                            New Images
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {imagePreviews.map((url, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={url}
                                  alt={`New ${index + 1}`}
                                  className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl object-cover border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeNewImage(index)}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upload zone */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed hover:border-secondary-700 rounded-xl p-8 text-center transition-colors group"
                      >
                        <Upload
                          strokeWidth={1.5}
                          className="w-8 h-8 text-secondary-700 group-hover:text-secondary-900 mx-auto mb-2 transition-colors"
                        />
                        <p className="text-xs sm:text-sm font-medium text-secondary-800 group-hover:text-secondary-900 transition-colors">
                          Click to upload images
                        </p>
                        <p className="text-[11px] sm:text-xs text-secondary-700 mt-1">
                          PNG, JPG, WEBP up to 5MB each
                        </p>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                  </FormSection>

                  {/* Product Video */}
                  <FormSection title="Product Video" icon={VideoIcon}>
                    <div>
                      {/* Mode toggle */}
                      <div className="flex items-center gap-2 mb-4 bg-secondary-50 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setVideoMode("upload");
                            setValue("video_url", "");
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                            videoMode === "upload"
                              ? "bg-white shadow-sm border border-secondary-200 text-primary"
                              : "text-secondary-900 hover:bg-secondary-100"
                          }`}
                        >
                          <Upload strokeWidth={1.5} className="w-4 h-4" />
                          Upload file
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVideoMode("link");
                            if (videoFile) {
                              if (videoPreview)
                                URL.revokeObjectURL(videoPreview);
                              setVideoFile(null);
                              setVideoPreview("");
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                            videoMode === "link"
                              ? "bg-white shadow-sm border border-secondary-200 text-primary"
                              : "text-secondary-900 hover:bg-secondary-100"
                          }`}
                        >
                          <Link strokeWidth={1.5} className="w-4 h-4" />
                          Paste link
                        </button>
                      </div>

                      {videoMode === "upload" ? (
                        <>
                          <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={handleVideoChange}
                          />

                          {/* Uploaded file preview */}
                          {videoPreview ? (
                            <div>
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border">
                                <video
                                  src={videoPreview}
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                  preload="metadata"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-secondary-800 truncate">
                                  {videoFile?.name}
                                  <span className="text-secondary-600 ml-1.5">
                                    ({formatFileSize(videoFile?.size)})
                                  </span>
                                </p>
                                <button
                                  type="button"
                                  onClick={removeVideo}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  Remove video
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => videoInputRef.current?.click()}
                              className="w-full border-2 border-dashed hover:border-secondary-700 rounded-xl p-6 text-center transition-colors group"
                            >
                              <VideoIcon
                                strokeWidth={1.5}
                                className="w-8 h-8 text-secondary-700 group-hover:text-secondary-900 mx-auto mb-2 transition-colors"
                              />
                              <p className="text-xs sm:text-sm font-medium text-secondary-800 group-hover:text-secondary-900 transition-colors">
                                Click to upload a video
                              </p>
                              <p className="text-[11px] sm:text-xs text-secondary-700 mt-1">
                                MP4, WebM, MOV up to 10MB
                              </p>
                            </button>
                          )}
                        </>
                      ) : (
                        <div>
                          <label className="text-xs font-medium text-secondary-800 mb-1.5 block">
                            Video link
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. https://www.youtube.com/watch?v=xxx"
                            {...register("video_url")}
                            className={inputClass}
                          />
                          <p className="text-[11px] text-secondary-700 mt-1.5">
                            Supports YouTube, Vimeo, and direct MP4/WebM video
                            URLs up to 10MB.
                          </p>
                          {videoUrlField && (
                            <div className="relative aspect-video mt-3 rounded-xl overflow-hidden bg-black border">
                              <VideoPreview url={watch("video_url")} />
                              {!watch("video_url")?.trim() && (
                                <div className="absolute inset-0 flex items-center justify-center text-secondary-400 text-xs">
                                  <Play className="w-6 h-6 mr-2" /> Video
                                  preview shown here
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </FormSection>
                </div>
              )}

              {/* Variants */}
              {activeStep === 2 &&
                (isEdit ? (
                  <VariantManager productId={id} variants={variants} />
                ) : (
                  <VariantBuilder
                    variants={variants}
                    onChange={setVariants}
                    onImageFiles={setVariantImageMap}
                  />
                ))}

              {/* Returns */}
              {activeStep === 3 && (
                <FormSection title="Return Policy" icon={Package}>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Controller
                        name="is_returnable"
                        control={control}
                        render={({ field }) => (
                          <div
                            onClick={() => field.onChange(!field.value)}
                            className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                              field.value ? "bg-[#2874F0]" : "bg-gray-200"
                            }`}
                          >
                            <span
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                field.value ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </div>
                        )}
                      />
                      <span className="text-xs sm:text-sm font-medium text-secondary-900">
                        Product is returnable
                      </span>
                    </label>

                    {isReturnable && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                            Return Window (days)
                          </label>
                          <input
                            {...register("return_window")}
                            type="number"
                            min="1"
                            max="90"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                            Return Type
                          </label>
                          <select
                            {...register("return_type")}
                            className={inputClass}
                          >
                            <option value="full_return">Full Return</option>
                            <option value="replacement_only">
                              Replacement Only
                            </option>
                            <option value="refund_only">Refund Only</option>
                            <option value="no_return">No Return</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </FormSection>
              )}

              {/* SEO */}
              {activeStep === 4 && (
                <FormSection title="SEO & Meta" icon={FileText}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        SEO Title
                      </label>
                      <input
                        {...register("seo_title")}
                        placeholder="SEO-friendly title…"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        SEO Description
                      </label>
                      <textarea
                        {...register("seo_description")}
                        rows={3}
                        placeholder="SEO meta description…"
                        className={`resize-none ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                        SEO Keywords
                        <span className="text-gray-400 font-normal ml-1">
                          (comma-separated)
                        </span>
                      </label>
                      <input
                        {...register("seo_keywords")}
                        placeholder="e.g., cotton t-shirt, summer wear, men clothing"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </FormSection>
              )}

              {/* COD */}
              {activeStep === 3 && (
                <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Controller
                      name="cod_available"
                      control={control}
                      render={({ field }) => (
                        <div
                          onClick={() => field.onChange(!field.value)}
                          className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                            field.value ? "bg-green-600" : "bg-secondary-500"
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              field.value ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </div>
                      )}
                    />
                    <div>
                      <span className="text-xs sm:text-sm font-medium text-secondary-900">
                        Cash on Delivery (COD) available
                      </span>
                      <p className="text-[10px] sm:text-xs text-secondary-700 mt-0.5">
                        Allow customers to pay cash on delivery
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Step nav + submit */}
              <div className="flex items-center justify-between gap-3 py-2 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  className="px-6 py-2.5 text-xs sm:text-sm font-medium text-secondary-900 bg-white border rounded-xl hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                    disabled={activeStep === 0}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs sm:text-sm font-medium text-secondary-900 bg-white border rounded-xl hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  {activeStep < STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-opacity-90 text-white text-xs sm:text-sm rounded-xl transition-colors shadow-sm"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting || mutation.isPending}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-opacity-90 text-white text-xs sm:text-sm rounded-xl transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {(isSubmitting || mutation.isPending) && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {isEdit ? "Update Product" : "Add Product"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border p-5 sm:sticky sm:top-24">
              <h3 className="text-xs sm:text-sm font-medium text-secondary-900 mb-4 pb-3 border-b">
                Product Preview
              </h3>
              {(existingImages[0] || imagePreviews[0]) && (
                <img
                  src={
                    imagePreviews[0] ||
                    existingImages[0]?.url ||
                    existingImages[0]
                  }
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-xl mb-4 border"
                />
              )}
              <div className="flex gap-3 overflow-x-auto scrollbar-hide mb-4">
                {Array.from({
                  length: Math.max(imagePreviews.length, existingImages.length),
                }).map((_, index) => {
                  const src =
                    imagePreviews[index] ||
                    existingImages[index]?.url ||
                    existingImages[index];

                  return (
                    src && (
                      <img
                        key={index}
                        src={src}
                        alt={`Preview ${index + 1}`}
                        className="h-14 w-14 flex-shrink-0 rounded-xl border object-cover"
                      />
                    )
                  );
                })}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-lg">
                  {watchValues.name || (
                    <span className="text-secondary-900">Product Name</span>
                  )}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-lg font-medium text-secondary-950">
                    {inr(pricing.price)}
                  </span>
                  {pricing.mrp > pricing.price && (
                    <span className="text-[11px] sm:text-xs text-secondary-700 line-through">
                      {inr(pricing.mrp)}
                    </span>
                  )}
                  {pricing.discount > 0 && (
                    <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {pricing.discount}% OFF
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-secondary-700">
                  Price shown to customers on the app
                </p>
                {watchValues.description && (
                  <p className="text-xs sm:text-sm text-secondary-800 line-clamp-3">
                    {watchValues.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {watchValues.cod_available && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                      COD Available
                    </span>
                  )}
                  {watchValues.is_returnable && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                      {watchValues.return_window}d Returns
                    </span>
                  )}
                  <span className="text-xs bg-green-100 text-green-600 px-2.5 py-1.5 rounded-full font-medium">
                    Stock: {watchValues.stock}
                  </span>
                </div>

                {/* Payout breakdown */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-[11px] font-semibold text-secondary-700 uppercase tracking-wide">
                    Your Payout (per unit)
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary-800">Customer pays</span>
                    <span className="font-medium text-secondary-950">
                      {inr(pricing.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary-800">
                      Platform commission ({pricing.commissionRate}%)
                    </span>
                    <span className="text-red-600 font-medium">
                      − {inr(pricing.commissionAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary-800">
                      GST ({pricing.gstRate}%)
                    </span>
                    <span className="text-red-600 font-medium">
                      − {inr(pricing.gstAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t">
                    <span className="font-semibold text-secondary-900">
                      You earn
                    </span>
                    <span
                      className={`font-bold ${
                        pricing.payout >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {inr(pricing.payout)}
                    </span>
                  </div>
                  {pricing.price > 0 && pricing.payout < 0 && (
                    <p className="text-[10px] text-red-600">
                      Payout is negative — raise the price or check the rates.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
