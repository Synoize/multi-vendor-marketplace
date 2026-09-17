import React, { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Layers, Package, IndianRupee, Upload, ChevronDown } from 'lucide-react'
import { VARIANT_KEYS, EMPTY_GROUP, EMPTY_ATTR } from '../../lib/variantUtils'

const REF_PREFIX = 'variant-img-'

const inputClass =
  'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

const selectClass =
  'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all appearance-none bg-white'

const isRefObj = (v) =>
  v && typeof v === 'object' && v.ref && String(v.ref).startsWith(REF_PREFIX)

export default function VariantBuilder({ variants = [], onChange, onImageFiles }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_GROUP })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const fileMapRef = useRef({})

  const syncFiles = (map) => onImageFiles?.(map)

  const openAdd = () => {
    setEditingIndex(null)
    setForm({ ...EMPTY_GROUP, attributes: [] })
    setImageFile(null)
    setImagePreview('')
    setFormOpen(true)
  }

  const openEdit = (index) => {
    const g = variants[index]
    setEditingIndex(index)
    setForm({
      variant: { ...g.variant },
      attributes: g.attributes?.map((a) => ({ ...a })) || [],
      mrp: g.mrp ?? '',
      price: g.price ?? '',
      stock: g.stock ?? 0,
    })
    setImageFile(null)
    if (isRefObj(g.variant?.image) && fileMapRef.current[g.variant.image.ref]) {
      setImagePreview(fileMapRef.current[g.variant.image.ref].preview || '')
    } else if (g.variant?.image && typeof g.variant.image === 'string') {
      setImagePreview(g.variant.image)
    } else {
      setImagePreview('')
    }
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingIndex(null)
    setImageFile(null)
    setImagePreview('')
  }

  const updateVariantField = (field, value) =>
    setForm((f) => ({ ...f, variant: { ...f.variant, [field]: value } }))

  const setAttr = (index, field, value) =>
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }))

  const addAttr = () =>
    setForm((f) => ({ ...f, attributes: [...f.attributes, { ...EMPTY_ATTR }] }))

  const removeAttr = (index) =>
    setForm((f) => ({
      ...f,
      attributes: f.attributes.filter((_, i) => i !== index),
    }))

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview('')
    updateVariantField('image', null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.variant.key) {
      alert('Variant key is required')
      return
    }
    if (!form.variant.value.trim()) {
      alert('Variant value is required')
      return
    }

    let image = form.variant.image
    if (imageFile) {
      const ref = `${REF_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      fileMapRef.current = {
        ...fileMapRef.current,
        [ref]: { file: imageFile, preview: imagePreview || URL.createObjectURL(imageFile) },
      }
      syncFiles(fileMapRef.current)
      image = { ref }
    }

    const payload = {
      variant: { key: form.variant.key, value: form.variant.value.trim(), image },
      attributes: form.attributes.filter((a) => a.key && a.value),
      mrp: form.mrp !== '' ? form.mrp : '',
      price: form.price !== '' ? form.price : '',
      stock: form.stock ?? 0,
    }

    const next = [...variants]
    if (editingIndex != null) {
      next[editingIndex] = payload
    } else {
      next.push(payload)
    }
    onChange(next)
    closeForm()
  }

  const removeGroup = (index) => {
    const g = variants[index]
    if (isRefObj(g.variant?.image)) {
      const { [g.variant.image.ref]: _drop, ...rest } = fileMapRef.current
      fileMapRef.current = rest
      syncFiles(rest)
    }
    onChange(variants.filter((_, i) => i !== index))
  }

  const groupPreview = (g) => {
    const img = g.variant?.image
    if (typeof img === 'string') return img
    if (isRefObj(img)) return fileMapRef.current[img.ref]?.preview || ''
    return ''
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
          <Layers className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Product Variants</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Add variants with sub-options and individual pricing
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary bg-primary-50 hover:bg-primary/10 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Variant
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            No variants yet. Add variants like Color: Red with Size/Material options.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((group, index) => {
            const preview = groupPreview(group)
            return (
              <div
                key={index}
                className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {preview ? (
                    <img
                      src={preview}
                      alt={group.variant.value}
                      className="w-14 h-14 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {group.variant.key}: {group.variant.value}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-primary">
                        ₹{Number(group.price || 0).toLocaleString('en-IN')}
                      </span>
                      {group.mrp > group.price && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{Number(group.mrp).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    {group.attributes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {group.attributes.map((attr, ai) => (
                          <span
                            key={ai}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            {attr.key}: {attr.value}
                            <span className="text-primary ml-1">₹{attr.price}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(index)}
                      className="p-2 rounded-lg hover:bg-primary-50 text-gray-500 hover:text-primary transition-colors"
                      title="Edit variant"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGroup(index)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingIndex != null ? 'Edit Variant' : 'Add Variant'}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  Define a variant with sub-options and pricing
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

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Variant Key <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.variant.key}
                      onChange={(e) => updateVariantField('key', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select key</option>
                      {VARIANT_KEYS.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Variant Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.variant.value}
                    onChange={(e) => updateVariantField('value', e.target.value)}
                    placeholder="e.g., Red"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Variant Image
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Variant preview"
                      className="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                    />
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-primary rounded-xl p-4 text-center transition-colors">
                      <Upload className="w-5 h-5 text-gray-300" />
                      <span className="text-sm text-gray-500">
                        {imagePreview ? 'Change image' : 'Upload image'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={clearImage}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Attributes
                  </label>
                  <button
                    type="button"
                    onClick={addAttr}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Attribute
                  </button>
                </div>

                {form.attributes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No attributes yet. Click "Add Attribute" to add sub-options like Size, Material, etc.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.attributes.map((attr, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl border border-gray-100 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={attr.key}
                              onChange={(e) => setAttr(index, 'key', e.target.value)}
                              className={selectClass}
                            >
                              <option value="">Key</option>
                              {VARIANT_KEYS.filter((k) => k !== form.variant.key).map((k) => (
                                <option key={k} value={k}>{k}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                          <input
                            value={attr.value}
                            onChange={(e) => setAttr(index, 'value', e.target.value)}
                            placeholder="e.g., M"
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
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">MRP</label>
                            <div className="relative">
                              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={attr.mrp}
                                onChange={(e) => setAttr(index, 'mrp', e.target.value)}
                                placeholder="0"
                                className={`${inputClass} pl-8 text-xs py-2`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Price</label>
                            <div className="relative">
                              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={attr.price}
                                onChange={(e) => setAttr(index, 'price', e.target.value)}
                                placeholder="0"
                                className={`${inputClass} pl-8 text-xs py-2`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Stock</label>
                            <input
                              type="number"
                              min="0"
                              value={attr.stock}
                              onChange={(e) => setAttr(index, 'stock', e.target.value)}
                              placeholder="0"
                              className={`${inputClass} text-xs py-2`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Variant Default Pricing &amp; Stock
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">MRP</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.mrp}
                        onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))}
                        placeholder="0"
                        className={`${inputClass} pl-8`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Price</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        placeholder="0"
                        className={`${inputClass} pl-8`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-opacity-90 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {editingIndex != null ? 'Save Changes' : 'Save Variant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
