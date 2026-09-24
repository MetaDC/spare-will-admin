import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Car,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  importVehicleDataset,
  DEFAULT_CATEGORY_NAME,
  VehicleImportProgress,
  VehicleImportResult,
  DATASET_PAGE_URL,
} from '../services/vehicleImportService';

interface VehicleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VehicleImportModal({
  isOpen,
  onClose,
  onSuccess,
}: VehicleImportModalProps) {
  const [categoryName] = useState(DEFAULT_CATEGORY_NAME);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<VehicleImportProgress | null>(null);
  const [result, setResult] = useState<VehicleImportResult | null>(null);

  if (!isOpen) return null;

  const handleStartImport = async () => {
    setIsImporting(true);
    setResult(null);

    const res = await importVehicleDataset({
      categoryName,
      limit: 0, // 0 = import all data without limit
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
                Import Indian Car Master Data
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  CarDekho & CarWale
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Populate all Indian car brands, models, and variants into Firestore
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100">
              <span className="text-[11px] font-medium text-gray-400 block mb-1">
                Target Vehicle Category
              </span>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-gray-800">{categoryName}</span>
                <span className="text-[10px] font-mono bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-md">
                  {result?.categoryId || 'Auto-generated ID'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100">
              <span className="text-[11px] font-medium text-gray-400 block mb-1">
                Dataset Scope
              </span>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-gray-800">All Master Data</span>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Complete Dataset
                </span>
              </div>
            </div>
          </div>

          {/* Database Specs Banner */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-blue-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Automated Schema & DateTime Guarantees</span>
            </div>
            <ul className="text-[11px] text-blue-700/90 list-disc list-inside space-y-0.5">
              <li>
                Auto-generated Firestore document IDs: Generated for every Brand, Model, and Variant document.
              </li>
              <li>
                Foreign keys <code className="bg-blue-100/60 px-1 py-0.5 rounded text-[10px]">vehicleCategoryId</code>, <code className="bg-blue-100/60 px-1 py-0.5 rounded text-[10px]">vehicleBrandId</code>, and <code className="bg-blue-100/60 px-1 py-0.5 rounded text-[10px]">vehicleModelId</code> are automatically populated with the generated doc IDs.
              </li>
              <li>
                <strong>Date & Time format:</strong> Stored as native Firestore <code className="bg-blue-100/60 px-1 py-0.5 rounded text-[10px]">Timestamp</code> in <code className="bg-blue-100/60 px-1 py-0.5 rounded text-[10px]">createdAt</code> and <code className="bg-blue-100/60 px-1 py-0.5 rounded text-[10px]">updatedAt</code>.
              </li>
            </ul>
          </div>

          {/* Progress / State View */}
          {isImporting && progress && (
            <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                  {progress.message}
                </span>
                <span className="font-bold text-orange-600">{progress.percent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {/* Live Count Pill Boxes */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-white rounded-lg p-2 border border-orange-100 shadow-2xs">
                  <span className="text-[10px] text-gray-400 block">Brands</span>
                  <span className="text-sm font-bold text-gray-800">{progress.brandsCount}</span>
                </div>
                <div className="bg-white rounded-lg p-2 border border-orange-100 shadow-2xs">
                  <span className="text-[10px] text-gray-400 block">Models</span>
                  <span className="text-sm font-bold text-gray-800">{progress.modelsCount}</span>
                </div>
                <div className="bg-white rounded-lg p-2 border border-orange-100 shadow-2xs">
                  <span className="text-[10px] text-gray-400 block">Variants</span>
                  <span className="text-sm font-bold text-gray-800">{progress.variantsCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Result View */}
          {result && (
            <div
              className={`p-4 rounded-xl border animate-fade-in ${
                result.success
                  ? 'bg-emerald-50/80 border-emerald-100 text-emerald-900'
                  : 'bg-red-50/80 border-red-100 text-red-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-bold">
                    {result.success ? 'Import Completed Successfully!' : 'Import Error'}
                  </h4>
                  <p className="text-[11px] opacity-90">
                    {result.success
                      ? `Added ${result.brandsCount} brands, ${result.modelsCount} models, and ${result.variantsCount} variants under '${result.categoryName}' category.`
                      : result.error || 'Something went wrong during vehicle dataset import.'}
                  </p>

                  {result.success && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-emerald-200/50 text-center">
                      <div className="bg-white/80 rounded-lg p-1.5 border border-emerald-200">
                        <span className="text-[10px] text-emerald-600 block">Brands Created</span>
                        <span className="text-sm font-bold text-emerald-900">{result.brandsCount}</span>
                      </div>
                      <div className="bg-white/80 rounded-lg p-1.5 border border-emerald-200">
                        <span className="text-[10px] text-emerald-600 block">Models Created</span>
                        <span className="text-sm font-bold text-emerald-900">{result.modelsCount}</span>
                      </div>
                      <div className="bg-white/80 rounded-lg p-1.5 border border-emerald-200">
                        <span className="text-[10px] text-emerald-600 block">Variants Created</span>
                        <span className="text-sm font-bold text-emerald-900">{result.variantsCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dataset Source Info */}
          <div className="text-[11px] text-gray-400 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="truncate max-w-[320px]">
              Source: <a href={DATASET_PAGE_URL} target="_blank" rel="noreferrer" className="text-orange-500 hover:underline">HuggingFace (bhavabhuthi/tco-india)</a>
            </span>
            <span>CC-BY-4.0 License</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/75 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>

          {!result?.success && (
            <button
              type="button"
              onClick={handleStartImport}
              disabled={isImporting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing All Vehicle Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Import (All Master Data)</span>
                </>
              )}
            </button>
          )}

          {result?.success && (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>Done</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
