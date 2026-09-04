import React, { useState } from 'react'
import { Plus, Pencil, Trash2, X, Layers, Package, IndianRupee } from 'lucide-react'

const EMPTY_ATTRIBUTE = { key: '', value: '' }

const inputClass =
  'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

export default function VariantBuilder({ variants = [], onChange }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', mrp: '', stock: 0 })
  const [attributes, setAttributes] = useState([{ ...EMPTY_ATTRIBUTE }])

  const openAdd = () => {
    setEditingIndex(null)
    setForm({ name: '', price: '', mrp: '', stock: 0 })
    setAttributes([{ ...EMPTY_ATTRIBUTE }])
    setFormOpen(true)
  }

  const openEdit = (index) => {
    const v = variants[index]
    setEditingIndex(index)
    setForm({
      name: v.name || '',
      price: v.price ?? '',
      mrp: v.mrp ?? '',
      stock: v.stock ?? 0,
    })
    const pairs = Object.entries(v.attributes || {}).map(([key, value]) => ({
      key,
      value: String(value),
    }))
    setAttributes(pairs.length ? pairs : [{ ...EMPTY_ATTRIBUTE }])
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingIndex(null)
  }

  const setAttr = (index, field, value) =>
    setAttributes((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))

  const addAttr = () => setAttributes((prev) => [...prev, { ...EMPTY_ATTRIBUTE }])

  const removeAttr = (index) =>
    setAttributes((prev) =>
      prev.length === 1 ? [{ ...EMPTY_ATTRIBUTE }] : prev.filter((_, i) => i !== index)
    )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('Variant name is required')
      return
    }
    const attrs = {}
    attributes.forEach((a) => {
      if (a.key.trim()) attrs[a.key.trim()] = a.value.trim()
    })
    const payload = {
      name: form.name.trim(),
      price: form.price !== '' ? form.price : null,
      mrp: form.mrp !== '' ? form.mrp : null,
      stock: form.stock ?? 0,
      attributes: attrs,
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

  const removeVariant = (index) =>
    onChange(variants.filter((_, i) => i !== index))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
          <Layers className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Variants</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Sizes, colors and other options saved with this product
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
            No variants yet. Add options like size and color.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {variant.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-primary">
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
                  onClick={() => openEdit(index)}
                  className="p-2 rounded-lg hover:bg-primary-50 text-gray-500 hover:text-primary transition-colors"
                  title="Edit variant"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
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

            <div className="space-y-4">
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
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
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
                  {editingIndex != null ? 'Save Changes' : 'Add Variant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
