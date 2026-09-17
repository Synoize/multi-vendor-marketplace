import React, { useEffect, useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  ChevronDown,
  FileSpreadsheet,
} from 'lucide-react'
import { useProductStore } from '../../store/productStore'
import ConfirmDialog from '../ui/ConfirmDialog'
import VariantBulkImport from './VariantBulkImport'
import { VARIANT_KEYS, EMPTY_GROUP, EMPTY_ATTR, flattenGroup, regroupVariants } from '../../lib/variantUtils'

const inputClass =
  'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 transition-all'

const selectClass =
  'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 transition-all appearance-none bg-white'

export default function VariantManager({ productId, variants = [], productName }) {
  const queryClient = useQueryClient()
  const createVariant = useProductStore((s) => s.createVariant)
  const updateVariant = useProductStore((s) => s.updateVariant)
  const deleteVariant = useProductStore((s) => s.deleteVariant)

  const groups = useMemo(() => regroupVariants(variants), [variants])

  const [list, setList] = useState(groups)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_GROUP })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)

  useEffect(() => {
    setList(groups)
  }, [groups])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_GROUP, attributes: [] })
    setImageFile(null)
    setImagePreview('')
    setFormOpen(true)
  }

  const openEdit = (index) => {
    const g = list[index]
    setEditing({ index, serverRows: g._serverRows || [] })
    setForm({
      variant: { ...g.variant },
      attributes: g.attributes?.map((a) => ({ ...a })) || [],
      mrp: g.mrp ?? '',
      price: g.price ?? '',
      stock: g.stock ?? 0,
    })
    setImageFile(null)
    if (g.variant?.image && typeof g.variant.image === 'string') {
      setImagePreview(g.variant.image)
    } else {
      setImagePreview('')
    }
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
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
  }

  const buildPayload = (image) => ({
    variant: { key: form.variant.key, value: form.variant.value.trim(), image },
    attributes: form.attributes.filter((a) => a.key && a.value),
    mrp: form.mrp !== '' ? form.mrp : '',
    price: form.price !== '' ? form.price : '',
    stock: form.stock ?? 0,
  })

  const syncGroup = async (group, existingRowIds = []) => {
    const rows = flattenGroup(group)

    const existing = existingRowIds.length
      ? (variants || []).filter((v) => existingRowIds.includes(v.id))
      : []

    const sig = (attrs) => {
      const obj =
        typeof attrs === 'string' ? (() => { try { return JSON.parse(attrs); } catch { return {}; } })() : (attrs || {})
      return JSON.stringify(Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]])))
    }

    // A brand-new image applies to the whole group: wipe the group's rows and
    // recreate them with the uploaded file.
    if (imageFile) {
      for (const id of existingRowIds) {
        await deleteVariant(id).catch(() => {})
      }
      let uploadedUrl = null
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const fd = new FormData()
        fd.append('name', row.name)
        fd.append('price', row.price)
        fd.append('mrp', row.mrp)
        fd.append('stock', row.stock)
        fd.append('attributes', JSON.stringify(row.attributes))
        if (i === 0) {
          fd.append('images', imageFile)
        } else if (uploadedUrl) {
          fd.append('image', uploadedUrl)
        }
        const res = await createVariant(productId, fd)
        if (i === 0) {
          uploadedUrl = res?.data?.data?.image || res?.data?.image
        }
      }
      return
    }

    const existingBySig = new Map()
    for (const v of existing) existingBySig.set(sig(v.attributes), v)

    const created = []
    const updated = []

    for (const row of rows) {
      const s = sig(row.attributes)
      const match = existingBySig.get(s)
      if (match) {
        updated.push({ id: match.id, row, existingImage: match.image || null })
        existingBySig.delete(s)
      } else {
        created.push(row)
      }
    }

    const deleted = Array.from(existingBySig.values()).map((v) => v.id)

    for (const { id, row, existingImage } of updated) {
      const fd = new FormData()
      fd.append('name', row.name)
      fd.append('price', row.price)
      fd.append('mrp', row.mrp)
      fd.append('stock', row.stock)
      fd.append('attributes', JSON.stringify(row.attributes))
      fd.append('image', row.image || existingImage || '')
      await updateVariant(id, fd)
    }

    for (const row of created) {
      const fd = new FormData()
      fd.append('name', row.name)
      fd.append('price', row.price)
      fd.append('mrp', row.mrp)
      fd.append('stock', row.stock)
      fd.append('attributes', JSON.stringify(row.attributes))
      fd.append('image', row.image || '')
      await createVariant(productId, fd)
    }

    for (const id of deleted) {
      await deleteVariant(id).catch(() => {})
    }
  }

  const handleSave = async () => {
    if (!form.variant.key) {
      toast.error('Variant key is required')
      return
    }
    if (!form.variant.value.trim()) {
      toast.error('Variant value is required')
      return
    }

    setSaving(true)
    try {
      const image = imageFile ? null : form.variant.image
      const group = buildPayload(image)

      if (editing?.serverRows) {
        await syncGroup(group, editing.serverRows)
        toast.success('Variant updated')
      } else {
        const rows = flattenGroup(group)
        let uploadedUrl = null
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const fd = new FormData()
          fd.append('name', row.name)
          fd.append('price', row.price)
          fd.append('mrp', row.mrp)
          fd.append('stock', row.stock)
          fd.append('attributes', JSON.stringify(row.attributes))
          if (i === 0 && imageFile) {
            fd.append('images', imageFile)
          } else if (uploadedUrl) {
            fd.append('image', uploadedUrl)
          } else {
            fd.append('image', row.image || '')
          }
          const res = await createVariant(productId, fd)
          if (imageFile && i === 0) {
            uploadedUrl = res?.data?.data?.image || res?.data?.image
          }
        }
        toast.success('Variant created')
      }

      await queryClient.invalidateQueries({ queryKey: ['product', productId] })
      closeForm()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save variant')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const rowIds = deleteTarget._serverRows || []
      for (const id of rowIds) {
        await deleteVariant(id).catch(() => {})
      }
      toast.success('Variant removed')
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['product', productId] })
    } finally {
      setDeleting(false)
    }
  }

  const groupPreview = (g) => {
    const img = g.variant?.image
    if (typeof img === 'string') return img
    return ''
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            title="Import variants from an Excel file"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2874F0] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Variant
          </button>
        </div>
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
          {list.map((group, index) => {
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
                      <span className="text-sm font-semibold text-[#2874F0]">
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
                            <span className="text-[#2874F0] ml-1">₹{attr.price}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(index)}
                      className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-[#2874F0] transition-colors"
                      title="Edit variant"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(group)}
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
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={!saving ? closeForm : undefined}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editing ? 'Edit Variant' : 'Add Variant'}
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
                    <div className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#2874F0] rounded-xl p-4 text-center transition-colors">
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
                      onClick={() => { setImageFile(null); setImagePreview(''); updateVariantField('image', null); }}
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
                  <label className="text-sm font-medium text-gray-700">Attributes</label>
                  <button
                    type="button"
                    onClick={addAttr}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#2874F0] hover:text-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Attribute
                  </button>
                </div>

                {form.attributes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No attributes yet. Click "Add Attribute" to add sub-options.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.attributes.map((attr, index) => (
                      <div key={index} className="p-3 rounded-xl border border-gray-100 space-y-3">
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
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Save Changes' : 'Save Variant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Variant"
        description={`Are you sure you want to remove "${deleteTarget?.variant?.key}: ${deleteTarget?.variant?.value}"?`}
        confirmLabel="Remove"
        variant="danger"
      />

      <VariantBulkImport
        productId={productId}
        productName={productName}
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
      />
    </div>
  )
}
