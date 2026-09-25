import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Wrench,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  GitBranch,
} from "lucide-react";
import {
  importPartMasterDataset,
  PartImportProgress,
  PartImportResult,
  RAW_CATEGORIES,
  RAW_PART_BRANDS,
  RAW_SUBCATEGORIES_BY_CATEGORY,
} from "../services/partImportService";

interface PartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PartImportModal({
  isOpen,
  onClose,
  onSuccess,
}: PartImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<PartImportProgress | null>(null);
  const [result, setResult] = useState<PartImportResult | null>(null);

  if (!isOpen) return null;

  const totalSubcategories = Object.values(RAW_SUBCATEGORIES_BY_CATEGORY).reduce(
    (acc, arr) => acc + arr.length,
    0,
  );

  const handleStartImport = async () => {
    setIsImporting(true);
    setResult(null);

    const res = await importPartMasterDataset({
      onProgress: (p) => setProgress(p),
    });

    setIsImporting(false);
    setResult(res);

    if (res.success) {
      onSuccess();
    }
  };

  const handleClose = () => {
    if (isImporting) return;
    onClose();
  };

  const progressPercent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-orange-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Import Indian Car Spare-Parts Catalog
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Master Data
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Populate Part Categories, Subcategories, and Brands into Firestore
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100">
              <span className="text-[11px] font-medium text-gray-400 block mb-1">
                Categories
              </span>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-gray-900">
                  {RAW_CATEGORIES.length} Systems
                </span>
              </div>
            </div>

            <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100">
              <span className="text-[11px] font-medium text-gray-400 block mb-1">
                Subcategories
              </span>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-gray-900">
                  {totalSubcategories} Components
                </span>
              </div>
            </div>

            <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100">
              <span className="text-[11px] font-medium text-gray-400 block mb-1">
                Part Brands
              </span>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-gray-900">
                  {RAW_PART_BRANDS.length} Verified Brands
                </span>
              </div>
            </div>
          </div>

          {/* Safety & Quality Information Notice */}
          {!result && !isImporting && (
            <div className="space-y-3">
              <div className="rounded-xl p-4 bg-orange-500/5 border border-orange-500/15 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-orange-800">
                  <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Deduplication & Safety Rules</span>
                </div>
                <ul className="text-[12px] text-orange-950/80 space-y-1 pl-5 list-disc">
                  <li>
                    <strong>Safe to re-run:</strong> If a category, subcategory, or brand already exists, it is <strong>updated</strong>, never duplicated.
                  </li>
                  <li>
                    <strong>Strict Car Focus:</strong> Excludes bicycle, motorcycle, marine, and non-automotive parts.
                  </li>
                  <li>
                    <strong>Search Optimization:</strong> Computes small-caps normalized <code className="bg-orange-100/80 px-1 py-0.5 rounded text-[11px]">searchName</code> for instant search across all collections.
                  </li>
                  <li>
                    <strong>Vehicle Safety:</strong> Your vehicle collections (<code className="bg-orange-100/80 px-1 py-0.5 rounded text-[11px]">vehicle_categories</code>, <code className="bg-orange-100/80 px-1 py-0.5 rounded text-[11px]">vehicle_brands</code>, <code className="bg-orange-100/80 px-1 py-0.5 rounded text-[11px]">vehicle_models</code>, <code className="bg-orange-100/80 px-1 py-0.5 rounded text-[11px]">vehicle_variants</code>) are completely untouched.
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs text-gray-500 space-y-1">
                <span className="font-semibold text-gray-700 block">
                  Includes Leading Indian & Global Manufacturers:
                </span>
                <p className="line-clamp-2 text-[11px] text-gray-600">
                  Bosch, Denso, Valeo, Continental, ZF, Mahle, Schaeffler (LuK/INA/FAG), Brembo, Delphi, TRW, SKF, Gates, Uno Minda, Lumax, Lucas TVS, Subros, Gabriel, Rane, Purolator, Elofic, Sona Comstar, Talbros, Amaron, Exide, and more.
                </p>
              </div>
            </div>
          )}

          {/* Importing State */}
          {isImporting && (
            <div className="space-y-4 py-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  {progress?.message || "Importing Part Master records..."}
                </span>
                <span className="text-gray-400 font-mono text-[11px]">
                  {progressPercent}%
                </span>
              </div>

              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-gray-500">
                <div className={`p-2 rounded-lg border ${progress?.phase === 'categories' ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold' : 'border-gray-100 bg-gray-50'}`}>
                  1. Categories
                </div>
                <div className={`p-2 rounded-lg border ${progress?.phase === 'subcategories' ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold' : 'border-gray-100 bg-gray-50'}`}>
                  2. Subcategories
                </div>
                <div className={`p-2 rounded-lg border ${progress?.phase === 'brands' ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold' : 'border-gray-100 bg-gray-50'}`}>
                  3. Part Brands
                </div>
              </div>
            </div>
          )}

          {/* Success / Result State */}
          {result && (
            <div className="space-y-4 py-1">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  result.success
                    ? "bg-emerald-50/80 border-emerald-200"
                    : "bg-red-50/80 border-red-200"
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4
                    className={`text-sm font-bold ${
                      result.success ? "text-emerald-900" : "text-red-900"
                    }`}
                  >
                    {result.success
                      ? "Part Master Import Complete!"
                      : "Import encountered errors"}
                  </h4>
                  <p
                    className={`text-xs mt-0.5 ${
                      result.success ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {result.success
                      ? "All automotive categories, subcategories, and brands have been persisted into Firestore."
                      : "Check the details below for any issues."}
                  </p>
                </div>
              </div>

              {/* Statistics Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <span className="text-[11px] text-gray-500 block mb-1">Part Categories</span>
                  <div className="text-xs space-y-0.5">
                    <div className="text-emerald-600 font-bold">+{result.categoriesCreated} Created</div>
                    <div className="text-gray-500">{result.categoriesUpdated} Updated</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <span className="text-[11px] text-gray-500 block mb-1">Subcategories</span>
                  <div className="text-xs space-y-0.5">
                    <div className="text-emerald-600 font-bold">+{result.subcategoriesCreated} Created</div>
                    <div className="text-gray-500">{result.subcategoriesUpdated} Updated</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <span className="text-[11px] text-gray-500 block mb-1">Part Brands</span>
                  <div className="text-xs space-y-0.5">
                    <div className="text-emerald-600 font-bold">+{result.brandsCreated} Created</div>
                    <div className="text-gray-500">{result.brandsUpdated} Updated</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-[11px] text-gray-600 flex justify-between items-center">
                <span>Filtered non-car records:</span>
                <span className="font-semibold text-gray-800">
                  {result.bicycleCategoriesRemoved} Bicycle & {result.nonAutomotiveCategoriesRemoved} Non-automotive items excluded
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/60 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
          >
            {result ? "Close" : "Cancel"}
          </button>

          {!result ? (
            <button
              onClick={handleStartImport}
              disabled={isImporting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] rounded-xl shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start Part Master Import</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-md transition-all cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
