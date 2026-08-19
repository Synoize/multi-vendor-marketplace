import React, { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Loader2,
  Layers,
  Package,
  IndianRupee,
} from 'lucide-react'
import { useProductStore } from '../../store/productStore'
import ConfirmDialog from '../ui/ConfirmDialog'

const EMPTY_ATTRIBUTE = { key: '', value: '' }

const inputClass =
  'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 transition-all'

export default function VariantManager({ productId, variants = [] }) {
  const createVariant = useProductStore((state) => state.createVariant)
  const updateVariant = useProductStore((state) => state.updateVariant)
  const deleteVariant = useProductStore((state) => state.deleteVariant)

  const [list, setList] = useState(variants)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', mrp: '', stock: 0 })
  const [attributes, setAttributes] = useState([{ ...EMPTY_ATTRIBUTE }])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setList(variants)
  }, [variants])

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing?.id ? updateVariant(editing.id, payload) : createVariant(productId, payload),
    onSuccess: (res) => {
      const variant = res?.data || res
      if (editing?.id && variant?.id) {
        setList((prev) => prev.map((v) => (v.id === variant.id ? variant : v)))
      } else if (variant?.id) {
        setList((prev) => [...prev, variant])
      }
      toast.success(editing?.id ? 'Variant updated' : 'Variant created')
      closeForm()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save variant')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteVariant(id),
    onSuccess: (_, id) => {
      toast.success('Variant removed')
      setList((prev) => prev.filter((v) => v.id !== id))
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to remove variant')
    },
  })

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', price: '', mrp: '', stock: 0 })
    setAttributes([{ ...EMPTY_ATTRIBUTE }])
    setImageFile(null)
    setImagePreview('')
    setFormOpen(true)
  }

  const openEdit = (variant) => {
    setEditing(variant)
    setForm({
      name: variant.name || '',
      price: variant.price ?? '',
      mrp: variant.mrp ?? '',
      stock: variant.stock ?? 0,
    })
    const pairs = Object.entries(variant.attributes || {}).map(([key, value]) => ({
      key,
      value: String(value),
    }))
    setAttributes(pairs.length ? pairs : [{ ...EMPTY_ATTRIBUTE }])
    setImageFile(null)
    setImagePreview('')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setImageFile(null)
    setImagePreview('')
  }

  const setAttr = (index, field, value) =>
    setAttributes((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))

  const addAttr = () => setAttributes((prev) => [...prev, { ...EMPTY_ATTRIBUTE }])

  const removeAttr = (index) =>
    setAttributes((prev) =>
      prev.length === 1 ? [{ ...EMPTY_ATTRIBUTE }] : prev.filter((_, i) => i !== index)
    )

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Variant name is required')
      return
    }
    const payload = new FormData()
    payload.append('name', form.name.trim())
    if (form.price !== '') payload.append('price', form.price)
    if (form.mrp !== '') payload.append('mrp', form.mrp)
    payload.append('stock', form.stock ?? 0)
    const attrs = {}
    attributes.forEach((a) => {
      if (a.key.trim()) attrs[a.key.trim()] = a.value.trim()
    })
    payload.append('attributes', JSON.stringify(attrs))
    if (imageFile) {
      payload.append('images', imageFile)
    } else if (editing?.image) {
      payload.append('image', editing.image)
    }
    saveMutation.mutate(payload)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Layers className="w-4 h-4 text-[#2874F0]" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Variants</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Sizes, colors and other options for this product
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2874F0] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Variant
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            No variants yet. Add options like size and color.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((variant) => (
            <div
              key={variant.id}
              className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              {variant.image ? (
                <img
                  src={variant.image}
                  alt={variant.name}
                  className="w-12 h-12 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{variant.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-[#2874F0]">
                    ₹{Number(variant.price || 0).toLocaleString('en-IN')}
                  </span>
                  {variant.mrp > variant.price && (
                    <span className="text-xs text-gray-400 line-through">
                      ₹{Number(variant.mrp).toLocaleString('en-IN')}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      variant.stock === 0
                        ? 'bg-red-100 text-red-600'
                        : variant.stock < 5
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {variant.stock} in stock
                  </span>
                </div>
                {Object.keys(variant.attributes || {}).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {Object.entries(variant.attributes).map(([key, value]) => (
                      <span
                        key={key}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(variant)}
                  className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-[#2874F0] transition-colors"
                  title="Edit variant"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(variant)}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                  title="Remove variant"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Variant form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={!saveMutation.isPending ? closeForm : undefined}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editing?.id ? 'Edit Variant' : 'Add Variant'}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  Define an option for this product
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Variant Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Red / XL"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Attributes
                </label>
                <div className="space-y-2">
                  {attributes.map((attr, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={attr.key}
                        onChange={(e) => setAttr(index, 'key', e.target.value)}
                        placeholder="e.g., Color"
                        className={`${inputClass} flex-1`}
                      />
                      <input
                        value={attr.value}
                        onChange={(e) => setAttr(index, 'value', e.target.value)}
                        placeholder="e.g., Red"
                        className={`${inputClass} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => removeAttr(index)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove attribute"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAttr}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2874F0] hover:text-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add attribute
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Price (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="0.00"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    MRP (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.mrp}
                      onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))}
                      placeholder="0.00"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Variant Image
                </label>
                <div className="flex items-center gap-4">
                  {(imagePreview || editing?.image) && (
                    <img
                      src={imagePreview || editing.image}
                      alt="Variant preview"
                      className="w-16 h-16 rounded-xl object-cover border border-gray-100"
                    />
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#2874F0] rounded-xl p-4 text-center transition-colors">
                      <Upload className="w-5 h-5 text-gray-300" />
                      <span className="text-sm text-gray-500">Upload image</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  {editing?.image && !imageFile && (
                    <p className="text-xs text-gray-400">Current image kept</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saveMutation.isPending}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing?.id ? 'Save Changes' : 'Add Variant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Remove Variant"
        description={`Are you sure you want to remove "${deleteTarget?.name}"?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  )
}
