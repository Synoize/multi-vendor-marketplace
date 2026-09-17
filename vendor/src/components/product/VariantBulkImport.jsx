import React, { useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
} from "lucide-react";
import { useProductStore } from "../../store/productStore";

const ACCEPT = ".xlsx,.csv";
const MAX_SIZE = 10 * 1024 * 1024;

export default function VariantBulkImport({
  productId,
  productName,
  open,
  onClose,
  onImported,
}) {
  const queryClient = useQueryClient();
  const downloadVariantTemplate = useProductStore(
    (s) => s.downloadVariantTemplate,
  );
  const previewVariantImport = useProductStore((s) => s.previewVariantImport);
  const bulkImportVariants = useProductStore((s) => s.bulkImportVariants);
  const fileInputRef = useRef(null);
  const [stage, setStage] = useState("files"); // files | preview | importing | done
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const reset = () => {
    setStage("files");
    setReport(null);
    setImportResult(null);
    setPreviewing(false);
  };

  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDownload = async () => {
    try {
      const blob = await downloadVariantTemplate();
      const raw =
        blob instanceof Blob ? blob : new Blob([blob]);
      const url = URL.createObjectURL(raw);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Damini-Variant-Import-Template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template");
    }
  };

  const handleSelectFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.xlsx?|\.csv$/i.test(file.name)) {
      toast.error("Please upload an .xlsx or .csv file");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File is too large. Maximum size is 10 MB.");
      return;
    }

    setPreviewing(true);
    setStage("preview");
    try {
      const res = await previewVariantImport(productId, file);
      const r = res.data?.data;
      if (!r?.rows?.length) {
        setStage("files");
        toast.error("No data rows found in the uploaded file");
        return;
      }
      setReport(r);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to parse the file. Please check the format.",
      );
      setStage("files");
    } finally {
      setPreviewing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!report?.rows?.length) return;

    const validRows = report.rows
      .filter((r) => !r.errors?.length)
      .map((r) => ({
        rowNumber: r.rowNumber,
        name: r.name,
        sku: r.sku,
        price: r.price,
        mrp: r.mrp,
        stock: r.stock,
        image: r.image,
        attributes: r.attributes,
      }));

    if (!validRows.length) {
      toast.error("No valid rows to import");
      return;
    }

    setImporting(true);
    setStage("importing");
    try {
      const res = await bulkImportVariants(productId, validRows);
      const data = res.data?.data;
      setImportResult(data);
      setStage("done");
      toast.success(
        `Imported ${data?.imported ?? validRows.length} variant(s)`,
      );
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      onImported?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Import failed");
      setStage("preview");
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!importing ? onClose : undefined}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#2874F0]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                Bulk Variant Import
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                {productName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Stage: files — download template + upload */}
          {stage === "files" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-[#2874F0] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Download the import template
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Use the template to ensure the correct column format.
                      Fill one row per variant you want to import.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2874F0] bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Template
                  </button>
                </div>
              </div>

              {/* Upload drop zone */}
              <div
                onClick={() => !previewing && fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-gray-200 hover:border-[#2874F0] rounded-xl cursor-pointer transition-colors bg-gray-50/30"
              >
                {previewing ? (
                  <Loader2 className="w-8 h-8 text-[#2874F0] animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-300" />
                )}
                {previewing ? (
                  <p className="text-sm font-medium text-gray-600">
                    Validating file...
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">
                      Click to select your completed file
                    </p>
                    <p className="text-xs text-gray-400">
                      .xlsx or .csv &middot; Max 10 MB
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={handleSelectFile}
                  disabled={previewing}
                />
              </div>

              {/* Quick guide */}
              <div className="text-xs text-gray-400 space-y-1 px-1">
                <p className="font-medium text-gray-500">Quick guide:</p>
                <p>
                  &bull; Every variant must have at least one attribute (e.g.
                  Color, Size, Material).
                </p>
                <p>
                  &bull; Price and MRP are required. Price cannot be higher than
                  MRP.
                </p>
                <p>
                  &bull; SKU is optional &mdash; leave blank to auto-generate
                  unique codes.
                </p>
                <p>
                  &bull; Add your own extra attribute columns at the end (e.g.
                  "Fabric", "Pattern").
                </p>
              </div>
            </div>
          )}

          {/* Stage: preview */}
          {stage === "preview" && report && (
            <div className="space-y-5">
              {/* Summary badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {report.summary.total} row
                  {report.summary.total !== 1 ? "s" : ""} parsed
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {report.summary.valid} valid
                </span>
                {report.summary.errors > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {report.summary.errors} error
                    {report.summary.errors !== 1 ? "s" : ""}
                  </span>
                )}
                {report.summary.truncated && (
                  <span className="text-xs text-amber-600 font-medium">
                    Only the first 500 rows were processed.
                  </span>
                )}
              </div>

              {/* Error rows */}
              {report.summary.errors > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800 mb-2">
                    Rows with errors
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {report.rows
                      .filter((r) => r.errors?.length)
                      .map((r) => (
                        <div
                          key={r.rowNumber}
                          className="text-xs flex items-start gap-2"
                        >
                          <span className="shrink-0 text-red-600 font-semibold">
                            Row {r.rowNumber}
                          </span>
                          <span className="text-red-700">
                            {r.name ? `"${r.name}" — ` : ""}
                            {r.errors.join("; ")}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Valid rows */}
              {report.summary.valid > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Valid variants to import
                  </p>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {report.rows
                      .filter((r) => !r.errors?.length)
                      .slice(0, 50)
                      .map((r) => (
                        <div
                          key={r.rowNumber}
                          className="px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {r.name || (
                                  <span className="text-gray-400 italic">
                                    Auto-named
                                  </span>
                                )}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {Object.entries(r.attributes || {}).map(
                                  ([k, v]) => (
                                    <span
                                      key={k}
                                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                                    >
                                      {k}: {v}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-[#2874F0]">
                                ₹{Number(r.price).toLocaleString("en-IN")}
                              </p>
                              {r.mrp > r.price && (
                                <p className="text-xs text-gray-400 line-through">
                                  ₹{Number(r.mrp).toLocaleString("en-IN")}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-0.5">
                                Stock: {r.stock}
                              </p>
                              {r.sku && (
                                <p className="text-[10px] text-gray-400">
                                  SKU: {r.sku}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    {report.summary.valid > 50 && (
                      <div className="px-4 py-2 text-xs text-gray-400 text-center">
                        + {report.summary.valid - 50} more variant
                        {report.summary.valid - 50 !== 1 ? "s" : ""}...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All rows invalid */}
              {report.summary.valid === 0 && report.summary.errors > 0 && (
                <div className="text-center py-6">
                  <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    All rows have errors. Fix them in your spreadsheet and try
                    again.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stage: importing */}
          {stage === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-[#2874F0] animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-700">
                Importing variants...
              </p>
              <p className="text-xs text-gray-400 mt-1">
                This may take a moment for large files.
              </p>
            </div>
          )}

          {/* Stage: done */}
          {stage === "done" && importResult && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-1">
                Import Complete
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                {importResult.imported} variant
                {importResult.imported !== 1 ? "s" : ""} imported
                {importResult.skipped?.length
                  ? ` · ${importResult.skipped.length} skipped`
                  : ""}
              </p>
              {importResult.skipped?.length > 0 && (
                <div className="max-h-40 overflow-y-auto text-left rounded-xl border border-red-200 bg-red-50 p-4 mx-auto max-w-lg">
                  <p className="text-xs font-semibold text-red-800 mb-2">
                    Skipped rows
                  </p>
                  {importResult.skipped.map((s, i) => (
                    <div
                      key={i}
                      className="text-xs text-red-700 mb-1 flex items-start gap-1.5"
                    >
                      <span className="shrink-0 font-semibold">
                        Row {s.rowNumber || "?"}
                      </span>
                      <span>
                        {s.name ? `"${s.name}" ` : ""}
                        {s.errors?.join("; ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          {stage === "files" && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
          )}

          {stage === "preview" && report && (
            <>
              <button
                type="button"
                onClick={() => {
                  setReport(null);
                  setStage("files");
                }}
                disabled={importing}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Choose another file
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={report.summary.valid === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-4 h-4" />
                Import {report.summary.valid} variant
                {report.summary.valid !== 1 ? "s" : ""}
              </button>
            </>
          )}

          {stage === "importing" && (
            <span className="text-xs text-gray-400">
              Please wait...
            </span>
          )}

          {stage === "done" && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
