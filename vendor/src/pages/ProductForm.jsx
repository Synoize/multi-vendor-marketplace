import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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
} from 'lucide-react'
import api from '../lib/axios'
import Spinner from '../components/ui/Spinner'

const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.coerce.number().positive('Price must be a positive number'),
  mrp: z.coerce.number().positive('MRP must be a positive number').optional().or(z.literal('')),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  sku: z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  tags: z.string().optional(),
  is_returnable: z.boolean().optional(),
  return_window: z.coerce.number().int().min(0).optional(),
  return_type: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  cod_available: z.boolean().optional(),
})

function FormSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#2874F0]" />
          </div>
        )}
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function FieldError({ error }) {
  if (!error) return null
  return <p className="text-xs text-red-600 mt-1">{error.message}</p>
}

const inputClass =
  'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 transition-all'
const errorInputClass =
  'w-full px-4 py-2.5 text-sm border border-red-300 bg-red-50 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all'

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [existingImages, setExistingImages] = useState([])
  const [newImageFiles, setNewImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [showPreview, setShowPreview] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      mrp: '',
      stock: 0,
      sku: '',
      category: '',
      tags: '',
      is_returnable: false,
      return_window: 7,
      return_type: 'replace',
      seo_title: '',
      seo_description: '',
      cod_available: true,
    },
  })

  const watchValues = watch()
  const isReturnable = watch('is_returnable')

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories')
      return data?.data || data?.categories || data || []
    },
  })
  const categories = Array.isArray(categoriesData) ? categoriesData : []

  // Fetch product if editing
  const { isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${id}`)
      return data?.data || data?.product || data
    },
    enabled: isEdit,
    onSuccess: (product) => {
      reset({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        mrp: product.mrp || '',
        stock: product.stock ?? product.quantity ?? 0,
        sku: product.sku || '',
        category: product.category?._id || product.category || '',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.tags || '',
        is_returnable: product.is_returnable || false,
        return_window: product.return_window || 7,
        return_type: product.return_type || 'replace',
        seo_title: product.seo_title || '',
        seo_description: product.seo_description || '',
        cod_available: product.cod_available ?? true,
      })
      if (product.images) setExistingImages(product.images)
    },
    onError: () => {
      toast.error('Failed to load product details')
    },
  })

  // Mutations
  const mutation = useMutation({
    mutationFn: async (formData) => {
      if (isEdit) {
        return api.put(`/products/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        return api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully')
      queryClient.invalidateQueries(['vendor-products'])
      navigate('/products')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save product')
    },
  })

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setNewImageFiles((prev) => [...prev, ...files])
    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const removeNewImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index])
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (values) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        formData.append(key, value)
      }
    })
    if (values.tags) {
      const tagArray = values.tags.split(',').map((t) => t.trim()).filter(Boolean)
      formData.delete('tags')
      tagArray.forEach((tag) => formData.append('tags[]', tag))
    }
    newImageFiles.forEach((file) => formData.append('images', file))
    if (isEdit && existingImages.length > 0) {
      formData.append('existing_images', JSON.stringify(existingImages))
    }
    mutation.mutate(formData)
  }

  if (isEdit && productLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/products')}
          className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit
              ? 'Update your product details below'
              : 'Fill in the details to add a new product to your store'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'}`}>
        <div className={`space-y-5 ${showPreview ? 'xl:col-span-2' : ''}`}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Basic Info */}
            <FormSection title="Basic Information" icon={FileText}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    placeholder="e.g., Premium Cotton T-Shirt"
                    className={errors.name ? errorInputClass : inputClass}
                  />
                  <FieldError error={errors.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    placeholder="Describe your product in detail…"
                    className={`resize-none ${errors.description ? errorInputClass : inputClass}`}
                  />
                  <FieldError error={errors.description} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...register('price')}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className={`pl-9 ${errors.price ? errorInputClass : inputClass}`}
                      />
                    </div>
                    <FieldError error={errors.price} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      MRP (₹)
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...register('mrp')}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className={`pl-9 ${errors.mrp ? errorInputClass : inputClass}`}
                      />
                    </div>
                    <FieldError error={errors.mrp} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Stock <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...register('stock')}
                        type="number"
                        min="0"
                        placeholder="0"
                        className={`pl-9 ${errors.stock ? errorInputClass : inputClass}`}
                      />
                    </div>
                    <FieldError error={errors.stock} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      SKU
                    </label>
                    <input
                      {...register('sku')}
                      placeholder="e.g., TSHIRT-BLK-M"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Category & Tags */}
            <FormSection title="Category & Tags" icon={Tag}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('category')}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tags
                    <span className="text-gray-400 font-normal ml-1">(comma-separated)</span>
                  </label>
                  <input
                    {...register('tags')}
                    placeholder="e.g., cotton, casual, summer, men"
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Tags help customers find your product
                  </p>
                </div>
              </div>
            </FormSection>

            {/* Images */}
            <FormSection title="Product Images" icon={ImageIcon}>
              <div>
                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Current Images
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {existingImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Product ${index + 1}`}
                            className="w-20 h-20 rounded-xl object-cover border border-gray-200"
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
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      New Images
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {imagePreviews.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`New ${index + 1}`}
                            className="w-20 h-20 rounded-xl object-cover border border-blue-200"
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
                  className="w-full border-2 border-dashed border-gray-200 hover:border-[#2874F0] rounded-xl p-8 text-center transition-colors group"
                >
                  <Upload className="w-8 h-8 text-gray-300 group-hover:text-[#2874F0] mx-auto mb-2 transition-colors" />
                  <p className="text-sm font-medium text-gray-500 group-hover:text-[#2874F0] transition-colors">
                    Click to upload images
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB each</p>
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
                          field.value ? 'bg-[#2874F0]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            field.value ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    )}
                  />
                  <span className="text-sm font-medium text-gray-700">Product is returnable</span>
                </label>

                {isReturnable && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Return Window (days)
                      </label>
                      <input
                        {...register('return_window')}
                        type="number"
                        min="1"
                        max="90"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Return Type
                      </label>
                      <select {...register('return_type')} className={inputClass}>
                        <option value="replace">Replace</option>
                        <option value="refund">Refund</option>
                        <option value="both">Both</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    SEO Title
                  </label>
                  <input {...register('seo_title')} placeholder="SEO-friendly title…" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    SEO Description
                  </label>
                  <textarea
                    {...register('seo_description')}
                    rows={3}
                    placeholder="SEO meta description…"
                    className={`resize-none ${inputClass}`}
                  />
                </div>
              </div>
            </FormSection>

            {/* COD */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <Controller
                  name="cod_available"
                  control={control}
                  render={({ field }) => (
                    <div
                      onClick={() => field.onChange(!field.value)}
                      className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                        field.value ? 'bg-[#2874F0]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          field.value ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  )}
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Cash on Delivery (COD) available</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Allow customers to pay cash on delivery
                  </p>
                </div>
              </label>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 py-2">
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-blue-300/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {(isSubmitting || mutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isEdit ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-24">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
                Product Preview
              </h3>
              {(existingImages[0] || imagePreviews[0]) && (
                <img
                  src={imagePreviews[0] || existingImages[0]}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-xl mb-4 border border-gray-100"
                />
              )}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 text-base">
                  {watchValues.name || <span className="text-gray-300">Product Name</span>}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#2874F0]">
                    ₹{watchValues.price || '0'}
                  </span>
                  {watchValues.mrp && Number(watchValues.mrp) > Number(watchValues.price) && (
                    <span className="text-sm text-gray-400 line-through">
                      ₹{watchValues.mrp}
                    </span>
                  )}
                </div>
                {watchValues.description && (
                  <p className="text-sm text-gray-500 line-clamp-3">{watchValues.description}</p>
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
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                    Stock: {watchValues.stock}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
