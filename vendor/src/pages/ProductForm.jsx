import React, { useEffect, useState, useRef } from "react";
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
  Loader2,
  Eye,
  Scale,
  Ruler,
  Layers,
} from "lucide-react";
import { useProductStore } from "../store/productStore";
import Spinner from "../components/ui/Spinner";
import VariantManager from "../components/product/VariantManager";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
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
  subcategory: z.string().optional(),
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
});

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
  const fetchCategories = useProductStore((state) => state.fetchCategories);
  const fetchBrands = useProductStore((state) => state.fetchBrands);
  const fetchProduct = useProductStore((state) => state.fetchProduct);
  const createProduct = useProductStore((state) => state.createProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [variants, setVariants] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
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
      subcategory: "",
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
    },
  });

  const watchValues = watch();
  const isReturnable = watch("is_returnable");

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const selectedCategoryId = watch("category");
  const selectedCategory = categories.find(
    (c) => String(c.id) === String(selectedCategoryId || ""),
  );
  const subcategories = selectedCategory?.children || [];

  useEffect(() => {
    if (!editingProduct?.category_id) return;
    const catId = String(editingProduct.category_id);
    const parent = categories.find((c) =>
      (c.children || []).some((s) => String(s.id) === catId),
    );
    if (parent) {
      setValue("category", String(parent.id));
      setValue("subcategory", catId);
    } else {
      setValue("category", catId);
      setValue("subcategory", "");
    }
  }, [editingProduct, categories, setValue]);

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
      subcategory: "",
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
    });
    if (product.images) setExistingImages(product.images);
    if (product.variants) setVariants(product.variants);
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
      if (["dim_length", "dim_width", "dim_height"].includes(key)) return;
      if (value !== undefined && value !== "") {
        formData.append(key, value);
      }
    });
    formData.set("category", String(values.subcategory || values.category));
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Basic Info */}
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
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                    Description <span className="text-red-500">*</span>
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
                      Selling Price (₹) <span className="text-red-500">*</span>
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

            {/* Category & Tags */}
            <FormSection title="Category & Tags" icon={Tag}>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCategoryId || ""}
                    onChange={(e) => {
                      setValue("category", e.target.value);
                      setValue("subcategory", "");
                    }}
                    className={errors.category ? errorInputClass : inputClass}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat._id || cat.id} value={cat._id || cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <FieldError error={errors.category} />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-900 mb-1.5">
                    Sub-category
                  </label>
                  <select
                    value={watch("subcategory") || ""}
                    onChange={(e) => setValue("subcategory", e.target.value)}
                    disabled={!selectedCategory || subcategories.length === 0}
                    className={
                      !selectedCategory || subcategories.length === 0
                        ? `${inputClass} cursor-not-allowed opacity-60`
                        : inputClass
                    }
                  >
                    <option value="">
                      {!selectedCategory
                        ? "Select a category first"
                        : subcategories.length === 0
                          ? "No subcategories"
                          : "Select a subcategory (optional)"}
                    </option>
                    {subcategories.map((sub) => (
                      <option key={sub._id || sub.id} value={sub._id || sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
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
                <div className="col-span-full">
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

            {/* Packaging & Dimensions */}
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

            {/* Images */}
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

            {/* Variants */}
            {isEdit ? (
              <VariantManager productId={id} variants={variants} />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Layers
                      strokeWidth={1.5}
                      className="w-4 h-4 text-primary"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-secondary-950">
                      Variants
                    </h3>
                    <p className="text-[10px] sm:text-xs text-secondary-700 mt-0.5">
                      Sizes, colors and other options for this product
                    </p>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-secondary-800 bg-secondary border rounded-xl p-4">
                  Save this product first, then you can add variants like size
                  and color from the edit page.
                </p>
              </div>
            )}

            {/* Returns */}
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

            {/* SEO */}
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

            {/* COD */}
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

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 py-2">
              <button
                type="button"
                onClick={() => navigate("/products")}
                className="px-6 py-2.5 text-xs sm:text-sm font-medium text-secondary-900 bg-white border rounded-xl hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
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
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-lg font-medium text-secondary-950">
                    ₹{watchValues.price || "0"}
                  </span>
                  {watchValues.mrp &&
                    Number(watchValues.mrp) > Number(watchValues.price) && (
                      <span className="text-[11px] sm:text-xs text-secondary-700 line-through">
                        ₹{watchValues.mrp}
                      </span>
                    )}
                </div>
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
