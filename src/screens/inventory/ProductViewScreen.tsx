import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Edit2, Trash2, Package, Car, Shield,
  Layers, CheckCircle2, XCircle, AlertTriangle, Tag, Calendar
} from 'lucide-react';
import { useAdmin } from '../../App';
import { Product } from '../../models';
import { getProductById, softDeleteProduct } from '../../services/catalogService';

interface Props {
  productId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
}

export default function ProductViewScreen({ productId, onBack, onEdit }: Props) {
  const { showToast } = useAdmin();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Soft delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProductById(productId);
        setProduct(data);
      } catch (err: any) {
        showToast(err.message || 'Error loading product details', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleDelete = async () => {
    if (!product) return;
    setIsDeleting(true);
    try {
      await softDeleteProduct(product.id);
      showToast('Product soft-deleted successfully', 'success');
      setShowDeleteModal(false);
      onBack();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400">
        <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-12 text-center text-gray-500">
        <p className="text-base font-semibold">Product not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const primaryImg = product.images?.[activeImageIndex] || product.images?.[0] || '';

  return (
    <div className="p-6 space-y-6 pb-24 w-full">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                product.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {product.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              SKU: <span className="font-mono text-gray-700 font-semibold">{product.sku || 'N/A'}</span> • Brand: <span className="text-gray-800 font-semibold">{product.partBrandName || '—'}</span> • Category: <span className="text-gray-800 font-semibold">{product.categoryName || '—'}{product.subCategoryName ? ` → ${product.subCategoryName}` : ''}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onEdit(product.id)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Product</span>
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Images & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Images */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="aspect-square rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
            {primaryImg ? (
              <img src={primaryImg} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <Package className="w-16 h-16 text-gray-300" />
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                    idx === activeImageIndex ? 'border-orange-500' : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Key Specs & Pricing */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            {/* Price & Stock Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Selling Price</div>
                <div className="text-2xl font-black text-gray-900">
                  ₹{(product.salePrice || product.price || 0).toLocaleString('en-IN')}
                </div>
                {product.salePrice && product.price > product.salePrice && (
                  <div className="text-xs text-gray-400 line-through">
                    MRP: ₹{product.price.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <div className="border-l border-orange-200/60 pl-4">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tax (GST)</div>
                <div className="text-lg font-bold text-gray-800">{product.taxPercentage || 0}%</div>
              </div>

              <div className="border-l border-orange-200/60 pl-4">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Stock Available</div>
                <div className={`text-lg font-bold ${
                  (product.stock || 0) <= 5 ? 'text-red-600' : 'text-emerald-700'
                }`}>
                  {product.stock || 0} Units
                </div>
              </div>

              <div className="border-l border-orange-200/60 pl-4">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Condition</div>
                <div className="text-lg font-bold text-gray-800">{product.condition || 'New'}</div>
              </div>
            </div>

            {/* Category & Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block mb-1">Part Category</span>
                <strong className="text-gray-800 font-semibold">{product.categoryName || '—'}</strong>
                {product.subCategoryName && (
                  <span className="block text-[11px] text-orange-600">↳ {product.subCategoryName}</span>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block mb-1">Placement Position</span>
                <strong className="text-gray-800 font-semibold">{product.position || '—'}</strong>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block mb-1">Side</span>
                <strong className="text-gray-800 font-semibold">{product.side || '—'}</strong>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block mb-1">Warranty</span>
                <strong className="text-gray-800 font-semibold">{product.warranty || 'None'}</strong>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-gray-700 mb-1">Description</h4>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50/70 p-3.5 rounded-xl">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Specifications & OEM Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Specifications */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2.5">
            <Layers className="w-4 h-4 text-orange-500" />
            <span>Product Specifications</span>
          </div>

          {product.specifications && product.specifications.length > 0 ? (
            <div className="divide-y divide-gray-100 text-xs">
              {product.specifications.map((s, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">{s.name}</span>
                  <strong className="text-gray-900 font-semibold">{s.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-4 italic text-center">No custom specifications added.</p>
          )}
        </div>

        {/* OEM & Cross-Reference Numbers */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2.5">
            <Tag className="w-4 h-4 text-orange-500" />
            <span>OEM & Part Numbers</span>
          </div>

          {product.numbers && product.numbers.length > 0 ? (
            <div className="divide-y divide-gray-100 text-xs">
              {product.numbers.map((n, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-gray-900">{n.number}</span>
                    {n.brand && <span className="ml-2 text-[11px] text-gray-500">({n.brand})</span>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                    n.type === 'OEM' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {n.type}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-4 italic text-center">No OEM or part numbers added.</p>
          )}
        </div>
      </div>

      {/* Compatible Vehicles (Product Fitments) */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Car className="w-4 h-4 text-orange-500" />
            <span>Compatible Vehicles ({product.fitments?.length || 0})</span>
          </div>
          <span className="text-xs text-gray-500">
            This part fits the following vehicles
          </span>
        </div>

        {product.fitments && product.fitments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Vehicle Brand</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Variant / Trim</th>
                  <th className="py-2.5 px-3">Years</th>
                  <th className="py-2.5 px-3">Engine</th>
                  <th className="py-2.5 px-3">Fuel</th>
                  <th className="py-2.5 px-3">Transmission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {product.fitments.map((fit, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      {fit.vehicleBrandName}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-800">
                      {fit.vehicleModelName}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">
                      {fit.vehicleVariantName || 'All Trims'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-gray-800">
                      {fit.yearFrom}–{fit.yearTo}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{fit.engine || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-600">{fit.fuelType || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-600">{fit.transmission || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-xs italic">
            No vehicle compatibility assigned to this spare part.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 p-6 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Delete Product?</h3>
            <p className="text-xs text-gray-500 mb-4">
              Are you sure you want to delete <strong className="text-gray-800">"{product.name}"</strong>?
              This product will be soft-deleted.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-md shadow-red-500/20 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
