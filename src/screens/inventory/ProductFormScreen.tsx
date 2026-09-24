import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft, Plus, Trash2, Image, DollarSign, Package,
  Car, Shield, FileText, CheckCircle2, Star, Layers, Sparkles,
  Download, Upload, X, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import { useAdmin } from '../../App';
import {
  Product, ProductFitment, ProductSpecification, ProductNumber,
  PartCategory, PartSubcategory, PartBrand, VehicleCategory, VehicleBrand, VehicleModel, VehicleVariant
} from '../../models';
import {
  getPartCategories, getPartSubcategories, getPartBrands, getVehicleCategories,
  getVehicleBrands, getVehicleModels, getVehicleVariants,
  getProductById, saveProductWithRelations,
  downloadSampleExcel, parseExcelFile, importProductsFromExcel, ImportProgress
} from '../../services/catalogService';

interface Props {
  productId?: string | null; // If passed, edit mode; else create mode
  onCancel: () => void;
  onSaved: () => void;
}

export default function ProductFormScreen({ productId, onCancel, onSaved }: Props) {
  const { showToast } = useAdmin();
  const isEdit = Boolean(productId);

  // Master Data collections loaded from DB
  const [partCategories, setPartCategories] = useState<PartCategory[]>([]);
  const [partSubCategories, setPartSubCategories] = useState<PartSubcategory[]>([]);
  const [partBrands, setPartBrands] = useState<PartBrand[]>([]);
  const [vehCategories, setVehCategories] = useState<VehicleCategory[]>([]);
  const [vehBrands, setVehBrands] = useState<VehicleBrand[]>([]);
  const [vehModels, setVehModels] = useState<VehicleModel[]>([]);
  const [vehVariants, setVehVariants] = useState<VehicleVariant[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Import feature state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  // 1. Basic Information State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [slug, setSlug] = useState('');
  const [partBrandId, setPartBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');

  // 2. Images
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // 3. Pricing & Stock
  const [price, setPrice] = useState<number | ''>(2499);
  const [salePrice, setSalePrice] = useState<number | ''>(1999);
  const [taxPercentage, setTaxPercentage] = useState<number | ''>(18);
  const [stock, setStock] = useState<number | ''>(25);

  // 4. Product Details
  const [condition, setCondition] = useState<'New' | 'Refurbished' | 'Used'>('New');
  const [warranty, setWarranty] = useState('6 Months Warranty');
  const [position, setPosition] = useState('Front');
  const [side, setSide] = useState('Both');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // 5. Dynamic Specifications
  const [specifications, setSpecifications] = useState<ProductSpecification[]>([
    { name: 'Material', value: 'Ceramic' },
    { name: 'Thickness', value: '15 mm' }
  ]);

  // 6. OEM & Part Numbers
  const [numbers, setNumbers] = useState<ProductNumber[]>([
    { number: '', type: 'OEM', brand: '', notes: '' }
  ]);

  // 7. Vehicle Compatibility Fitments
  const [fitments, setFitments] = useState<ProductFitment[]>([]);

  // Fitment Selector Local State (Cascading)
  const [selVehCatId, setSelVehCatId] = useState('');
  const [selVehBrandId, setSelVehBrandId] = useState('');
  const [selVehModelId, setSelVehModelId] = useState('');
  const [selVehVariantId, setSelVehVariantId] = useState('');

  // Fetch all master data and product if editing
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoadingData(true);
        const [pCats, pSubs, pBrands, vCats, vBrands, vModels, vVariants] = await Promise.all([
          getPartCategories(),
          getPartSubcategories(),
          getPartBrands(),
          getVehicleCategories(),
          getVehicleBrands(),
          getVehicleModels(),
          getVehicleVariants()
        ]);

        setPartCategories(pCats);
        setPartSubCategories(pSubs);
        setPartBrands(pBrands);
        setVehCategories(vCats);
        setVehBrands(vBrands);
        setVehModels(vModels);
        setVehVariants(vVariants);

        // Set default vehicle category
        if (vCats.length > 0) {
          setSelVehCatId(vCats[0].id);
        }

        // If edit mode, load product details
        if (productId) {
          const prod = await getProductById(productId);
          if (prod) {
            setName(prod.name || '');
            setSku(prod.sku || '');
            setSlug(prod.slug || '');
            setPartBrandId(prod.partBrandId || '');
            setCategoryId(prod.categoryId || '');
            setSubCategoryId(prod.subCategoryId || '');
            setShortDescription(prod.shortDescription || '');
            setDescription(prod.description || '');
            setImages(prod.images || []);
            setPrice(prod.price || 0);
            setSalePrice(prod.salePrice || 0);
            setTaxPercentage(prod.taxPercentage || 0);
            setStock(prod.stock || 0);
            setCondition(prod.condition || 'New');
            setWarranty(prod.warranty || '');
            setPosition(prod.position || 'Front');
            setSide(prod.side || 'Both');
            setWeight(prod.weight || '');
            setDimensions(prod.dimensions || '');
            setIsActive(prod.isActive !== false);
            setIsFeatured(prod.isFeatured || false);
            setSpecifications(prod.specifications?.length ? prod.specifications : []);
            setNumbers(prod.numbers?.length ? prod.numbers : []);
            setFitments(prod.fitments?.length ? prod.fitments : []);
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Error loading catalog master data', 'error');
      } finally {
        setLoadingData(false);
      }
    };

    loadAll();
  }, [productId]);

  // Derived subcategories under selected category
  const selectedCategoryName = useMemo(() => {
    return partCategories.find((c: PartCategory) => c.id === categoryId)?.name || '';
  }, [partCategories, categoryId]);

  const availableSubCategories = useMemo(() => {
    if (!categoryId) return [];
    return partSubCategories.filter((sc: PartSubcategory) => sc.categoryId === categoryId);
  }, [partSubCategories, categoryId]);

  // Derived vehicle cascades for the fitment selector
  const availableVehBrands = vehBrands.filter(b => b.vehicleCategoryId === selVehCatId);
  const availableVehModels = vehModels.filter(m => m.vehicleBrandId === selVehBrandId);
  const availableVehVariants = vehVariants.filter(v => v.vehicleModelId === selVehModelId);

  // Keep first option selected when cascade parent changes
  useEffect(() => {
    if (availableVehBrands.length > 0 && !availableVehBrands.some(b => b.id === selVehBrandId)) {
      setSelVehBrandId(availableVehBrands[0].id);
    }
  }, [selVehCatId, availableVehBrands]);

  useEffect(() => {
    if (availableVehModels.length > 0 && !availableVehModels.some(m => m.id === selVehModelId)) {
      setSelVehModelId(availableVehModels[0].id);
    }
  }, [selVehBrandId, availableVehModels]);

  useEffect(() => {
    if (availableVehVariants.length > 0 && !availableVehVariants.some(v => v.id === selVehVariantId)) {
      setSelVehVariantId(availableVehVariants[0].id);
    }
  }, [selVehModelId, availableVehVariants]);

  // ── Excel Import handlers ──
  const handleDownloadSample = () => {
    downloadSampleExcel();
    showToast('Sample Excel downloading...', 'info');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input so same file can be re-selected
    e.target.value = '';

    setImporting(true);
    setImportProgress(null);
    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        showToast('No data rows found in the Excel file.', 'error');
        setImporting(false);
        return;
      }
      await importProductsFromExcel(rows, (p) => {
        setImportProgress({ ...p });
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to import Excel file', 'error');
      setImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setImporting(false);
    setImportProgress(null);
    // Reload master data after successful import
    onSaved();
  };

  // Auto-generate SKU
  const handleAutoGenerateSku = () => {
    const brand = partBrands.find(b => b.id === partBrandId)?.name || 'PART';
    const brandCode = brand.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    setSku(`${brandCode}-${random}`);
  };

  // Image helpers
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setImages(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages(prev => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
  };

  // Specification helpers
  const handleAddSpec = () => {
    setSpecifications(prev => [...prev, { name: '', value: '' }]);
  };

  const handleUpdateSpec = (index: number, field: 'name' | 'value', val: string) => {
    setSpecifications(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveSpec = (index: number) => {
    setSpecifications(prev => prev.filter((_, i) => i !== index));
  };

  // Number helpers
  const handleAddNumber = () => {
    setNumbers(prev => [...prev, { number: '', type: 'OEM', brand: '', notes: '' }]);
  };

  const handleUpdateNumber = (index: number, field: keyof ProductNumber, val: any) => {
    setNumbers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveNumber = (index: number) => {
    setNumbers(prev => prev.filter((_, i) => i !== index));
  };

  // Add Fitment from existing master data
  const handleAddFitment = () => {
    if (!selVehCatId || !selVehBrandId || !selVehModelId) {
      showToast('Please select Vehicle Category, Brand and Model', 'error');
      return;
    }

    const cat = vehCategories.find(c => c.id === selVehCatId);
    const brand = vehBrands.find(b => b.id === selVehBrandId);
    const model = vehModels.find(m => m.id === selVehModelId);
    const variant = vehVariants.find(v => v.id === selVehVariantId);

    // Duplicate check
    const isAlreadyAdded = fitments.some(
      f => f.vehicleModelId === selVehModelId &&
        (!selVehVariantId || f.vehicleVariantId === selVehVariantId)
    );

    if (isAlreadyAdded) {
      showToast('This vehicle fitment is already added to the list', 'error');
      return;
    }

    const newFitment: ProductFitment = {
      vehicleCategoryId: selVehCatId,
      vehicleCategoryName: cat?.name || '',
      vehicleBrandId: selVehBrandId,
      vehicleBrandName: brand?.name || '',
      vehicleModelId: selVehModelId,
      vehicleModelName: model?.name || '',
      vehicleVariantId: variant?.id || '',
      vehicleVariantName: variant?.name || 'All Variants',
      yearFrom: variant ? variant.yearFrom : 2018,
      yearTo: variant ? variant.yearTo : new Date().getFullYear(),
      fuelType: variant?.fuelType || 'Any',
      engine: variant?.engine || 'Standard',
      transmission: variant?.transmission || 'Standard'
    };

    setFitments(prev => [...prev, newFitment]);
    showToast(`Added ${brand?.name} ${model?.name} to compatible vehicles`, 'info');
  };

  const handleRemoveFitment = (index: number) => {
    setFitments(prev => prev.filter((_, i) => i !== index));
  };

  // Main Save / Submit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    if (!partBrandId) {
      showToast('Please select a Part Brand', 'error');
      return;
    }
    if (!categoryId) {
      showToast('Please select a Part Category', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const brand = partBrands.find(b => b.id === partBrandId);
      const cat = partCategories.find(c => c.id === categoryId);
      const subCat = partCategories.find(c => c.id === subCategoryId);

      const productData: Partial<Product> = {
        id: productId || undefined,
        name: name.trim(),
        sku: sku.trim() || `SKU-${Date.now()}`,
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        partBrandId,
        partBrandName: brand?.name || '',
        categoryId,
        categoryName: cat?.name || '',
        subCategoryId: subCategoryId || '',
        subCategoryName: subCat?.name || '',
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        images,
        price: Number(price) || 0,
        salePrice: Number(salePrice) || Number(price) || 0,
        taxPercentage: Number(taxPercentage) || 0,
        stock: Number(stock) || 0,
        condition,
        warranty: warranty.trim(),
        position,
        side,
        weight: weight.trim(),
        dimensions: dimensions.trim(),
        isActive,
        isFeatured
      };

      const validSpecs = specifications.filter(s => s.name.trim() && s.value.trim());
      const validNumbers = numbers.filter(n => n.number.trim());

      await saveProductWithRelations(productData, fitments, validSpecs, validNumbers);

      showToast(`Product "${name}" ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
      onSaved();
    } catch (err: any) {
      showToast(err.message || 'Error saving product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400">
        <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Loading catalog master data & specifications...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24 w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isEdit ? 'Edit Spare Part' : 'Add New Spare Part'}
            </h1>
            <p className="text-xs text-gray-500">
              Select existing master data, enter specifications, OEM numbers and assign compatible vehicles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Sample Excel Download */}
          <button
            type="button"
            onClick={handleDownloadSample}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Sample Excel
          </button>

          {/* Import from Excel */}
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Excel
          </button>

          <div className="w-px h-5 bg-gray-200" />

          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSaveProduct}
            className="px-5 py-2 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-60 cursor-pointer flex items-center gap-2"
          >
            {submitting ? 'Saving...' : isEdit ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </div>

      {/* Hidden file input for Excel import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Import Progress Modal */}
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                {importProgress?.done ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                )}
                <h2 className="text-sm font-bold text-gray-900">
                  {importProgress?.done ? 'Import Complete' : 'Importing from Excel...'}
                </h2>
              </div>
              {importProgress?.done && (
                <button
                  onClick={handleCloseImportModal}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Progress bar */}
              {importProgress && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium truncate max-w-[70%]">{importProgress.currentItem}</span>
                      <span className="text-gray-700 font-semibold shrink-0">
                        {importProgress.current} / {importProgress.total > 0 ? importProgress.total : '...'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                        style={{ width: importProgress.total > 0 ? `${Math.round((importProgress.current / importProgress.total) * 100)}%` : '10%' }}
                      />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="text-lg font-bold text-emerald-700">{importProgress.productsCreated}</div>
                      <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Products Created</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="text-lg font-bold text-blue-700">{importProgress.mastersCreated}</div>
                      <div className="text-[10px] text-blue-600 font-medium mt-0.5">Masters Created</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="text-lg font-bold text-gray-600">{importProgress.mastersSkipped}</div>
                      <div className="text-[10px] text-gray-500 font-medium mt-0.5">Already Existed</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {importProgress.errors.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {importProgress.errors.length} Error{importProgress.errors.length > 1 ? 's' : ''}
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {importProgress.errors.map((err, i) => (
                          <div key={i} className="text-[11px] text-red-700 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg">
                            <span className="font-semibold">Row {err.row}:</span> {err.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Done summary */}
                  {importProgress.done && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800">
                      <strong>✅ Import finished!</strong> {importProgress.productsCreated} product{importProgress.productsCreated !== 1 ? 's' : ''} created,{' '}
                      {importProgress.mastersCreated} master record{importProgress.mastersCreated !== 1 ? 's' : ''} added to database.
                      {importProgress.errors.length > 0 && (
                        <span className="text-amber-700"> {importProgress.errors.length} row{importProgress.errors.length > 1 ? 's' : ''} had errors and were skipped.</span>
                      )}
                    </div>
                  )}
                </>
              )}

              {!importProgress && (
                <div className="flex items-center justify-center py-6 gap-3 text-gray-500 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  Preparing import...
                </div>
              )}
            </div>

            {importProgress?.done && (
              <div className="px-6 pb-5 flex justify-end">
                <button
                  onClick={handleCloseImportModal}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Done & Refresh
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSaveProduct} className="space-y-6">
        {/* SECTION 1: BASIC INFORMATION */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
            <FileText className="w-4 h-4 text-orange-500" />
            <span>Section 1: Basic Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bosch Front Brake Pad Set"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (!isEdit && !slug) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }
                }}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  SKU (Stock Keeping Unit)
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateSku}
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-generate</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. BOS-BP-001"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Part Brand (Manufacturer) <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={partBrandId}
                onChange={e => setPartBrandId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              >
                <option value="" disabled>Select Existing Part Brand</option>
                {partBrands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Part Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={categoryId}
                onChange={e => {
                  setCategoryId(e.target.value);
                  setSubCategoryId('');
                }}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              >
                <option value="" disabled>Select Part Category</option>
                {partCategories.map((c: PartCategory) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Subcategory (Optional)
                </label>
                {categoryId && availableSubCategories.length > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {availableSubCategories.length} available
                  </span>
                )}
              </div>
              <select
                value={subCategoryId}
                onChange={e => setSubCategoryId(e.target.value)}
                disabled={!categoryId}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 disabled:opacity-50"
              >
                {!categoryId ? (
                  <option value="">Select Part Category first</option>
                ) : availableSubCategories.length === 0 ? (
                  <option value="">None / No subcategories defined</option>
                ) : (
                  <>
                    <option value="">Select Subcategory (or General)</option>
                    {availableSubCategories.map((sc: PartSubcategory) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </>
                )}
              </select>
              {categoryId && availableSubCategories.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  No subcategories found under {selectedCategoryName}. You can add them under Part Masters &rarr; Part Subcategories.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Short Description</label>
              <input
                type="text"
                placeholder="Key summary / highlights in one sentence..."
                value={shortDescription}
                onChange={e => setShortDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Description</label>
              <textarea
                rows={3}
                placeholder="Detailed information, features, fitting notes, materials..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PRODUCT IMAGES */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
            <Image className="w-4 h-4 text-orange-500" />
            <span>Section 2: Product Images</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="Paste Image URL (e.g. https://...)"
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              className="flex-1 px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
            />
            <button
              type="button"
              onClick={handleAddImage}
              className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded-xl hover:bg-gray-900 transition-all cursor-pointer"
            >
              Add Image
            </button>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                  <img src={img} alt="Product" className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-md shadow-xs">
                      Primary
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        title="Set as Primary"
                        className="p-1 bg-white/90 rounded-lg text-gray-800 hover:bg-white text-xs cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      title="Remove"
                      className="p-1 bg-red-600/90 rounded-lg text-white hover:bg-red-600 text-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: PRICING & INVENTORY */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
            <DollarSign className="w-4 h-4 text-orange-500" />
            <span>Section 3: Pricing & Inventory</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                MRP / Base Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sale Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={salePrice}
                onChange={e => setSalePrice(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 font-semibold text-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tax Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={taxPercentage}
                onChange={e => setTaxPercentage(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={e => setStock(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: PRODUCT DETAILS */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
            <Shield className="w-4 h-4 text-orange-500" />
            <span>Section 4: Product Specifications & Placement</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Condition</label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              >
                <option value="New">New</option>
                <option value="Refurbished">Refurbished</option>
                <option value="Used">Used</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Warranty</label>
              <input
                type="text"
                placeholder="e.g. 1 Year"
                value={warranty}
                onChange={e => setWarranty(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Position</label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              >
                <option value="Front">Front</option>
                <option value="Rear">Rear</option>
                <option value="Universal">Universal</option>
                <option value="Front & Rear">Front & Rear</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Side</label>
              <select
                value={side}
                onChange={e => setSide(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              >
                <option value="Both">Both (Left & Right)</option>
                <option value="Left">Left</option>
                <option value="Right">Right</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Weight</label>
              <input
                type="text"
                placeholder="e.g. 1.2 kg"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Dimensions</label>
              <input
                type="text"
                placeholder="e.g. 110x45x15mm"
                value={dimensions}
                onChange={e => setDimensions(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: DYNAMIC SPECIFICATIONS */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Layers className="w-4 h-4 text-orange-500" />
              <span>Section 5: Dynamic Specifications</span>
            </div>
            <button
              type="button"
              onClick={handleAddSpec}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Specification</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {specifications.map((spec, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Specification Name (e.g. Material, Length, Thickness)"
                  value={spec.name}
                  onChange={e => handleUpdateSpec(idx, 'name', e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. Ceramic, 110 mm, 15 mm)"
                  value={spec.value}
                  onChange={e => handleUpdateSpec(idx, 'value', e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSpec(idx)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 6: OEM & CROSS-REFERENCE NUMBERS */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Package className="w-4 h-4 text-orange-500" />
              <span>Section 6: OEM & Cross-Reference Numbers</span>
            </div>
            <button
              type="button"
              onClick={handleAddNumber}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Number</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {numbers.map((num, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Part Number (e.g. 55810M68P00)"
                  value={num.number}
                  onChange={e => handleUpdateNumber(idx, 'number', e.target.value)}
                  className="w-full sm:flex-1 px-3 py-1.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 font-mono"
                />
                <select
                  value={num.type}
                  onChange={e => handleUpdateNumber(idx, 'type', e.target.value)}
                  className="w-full sm:w-36 px-2.5 py-1.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="OEM">OEM Number</option>
                  <option value="Part Number">Part Number</option>
                  <option value="Cross Reference">Cross Reference</option>
                </select>
                <input
                  type="text"
                  placeholder="Brand / Manufacturer"
                  value={num.brand || ''}
                  onChange={e => handleUpdateNumber(idx, 'brand', e.target.value)}
                  className="w-full sm:w-40 px-3 py-1.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveNumber(idx)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 7: VEHICLE COMPATIBILITY (FITMENTS) */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Car className="w-4 h-4 text-orange-500" />
              <span>Section 7: Compatible Vehicles (Product Fitments)</span>
            </div>
            <span className="text-xs text-gray-500">
              {fitments.length} {fitments.length === 1 ? 'vehicle added' : 'vehicles added'}
            </span>
          </div>

          <div className="bg-orange-50/40 p-4 rounded-xl border border-orange-100 space-y-3">
            <div className="text-xs font-bold text-gray-800">
              Select Existing Master Data to Add Compatibility:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Vehicle Category</label>
                <select
                  value={selVehCatId}
                  onChange={e => setSelVehCatId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-orange-500"
                >
                  {vehCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Vehicle Brand</label>
                <select
                  value={selVehBrandId}
                  onChange={e => setSelVehBrandId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-orange-500"
                >
                  {availableVehBrands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Model</label>
                <select
                  value={selVehModelId}
                  onChange={e => setSelVehModelId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-orange-500"
                >
                  {availableVehModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Variant / Trim</label>
                <select
                  value={selVehVariantId}
                  onChange={e => setSelVehVariantId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-orange-500"
                >
                  {availableVehVariants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.yearFrom}–{v.yearTo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddFitment}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Compatible Vehicle</span>
              </button>
            </div>
          </div>

          {/* Fitment Cards List */}
          {fitments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {fitments.map((fit, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="text-orange-600">{fit.vehicleBrandName}</span>
                      <span>{fit.vehicleModelName}</span>
                      <span className="text-gray-500 font-medium">({fit.vehicleVariantName})</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Years: <strong className="text-gray-700">{fit.yearFrom}–{fit.yearTo}</strong> • Fuel: {fit.fuelType || 'Any'} • {fit.engine || ''} • {fit.transmission || ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFitment(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-xs italic">
              No vehicle compatibility added yet. Select a vehicle above and click "+ Add Compatible Vehicle".
            </div>
          )}
        </div>

        {/* SECTION 8: STATUS & PUBLISHING */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-orange-500 rounded-md border-gray-300 focus:ring-orange-500"
              />
              <span>Active in Catalog</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={e => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-orange-500 rounded-md border-gray-300 focus:ring-orange-500"
              />
              <span>Featured Product</span>
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-60 cursor-pointer text-center"
            >
              {submitting ? 'Saving...' : isEdit ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
