import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Filter, Eye, Edit2, Trash2, Package, ArrowUpDown,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Car
} from 'lucide-react';
import { useAdmin } from '../../App';
import { Product, PartCategory, PartBrand, VehicleCategory, VehicleBrand } from '../../models';
import {
  getAllProducts, softDeleteProduct, getPartCategories,
  getPartBrands, getVehicleCategories, getVehicleBrands
} from '../../services/catalogService';

interface Props {
  onAddProduct: () => void;
  onEditProduct: (id: string) => void;
  onViewProduct: (id: string) => void;
}

export default function ProductListScreen({ onAddProduct, onEditProduct, onViewProduct }: Props) {
  const { showToast } = useAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [brands, setBrands] = useState<PartBrand[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedVehCategory, setSelectedVehCategory] = useState('all');
  const [selectedVehBrand, setSelectedVehBrand] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'price-asc' | 'price-desc'>('newest');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Soft Delete state
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodData, catData, brandData, vCatData, vBrandData] = await Promise.all([
        getAllProducts(),
        getPartCategories(),
        getPartBrands(),
        getVehicleCategories(),
        getVehicleBrands()
      ]);
      setProducts(prodData);
      setCategories(catData);
      setBrands(brandData);
      setVehicleCategories(vCatData);
      setVehicleBrands(vBrandData);
    } catch (err: any) {
      showToast(err.message || 'Error loading product catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await softDeleteProduct(deletingProduct.id);
      showToast(`Product "${deletingProduct.name}" deleted successfully`, 'success');
      setDeletingProduct(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting product', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and Search logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search by Name, SKU, OEM Numbers, Cross Numbers
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.numbers?.some(n => n.number.toLowerCase().includes(q)) ||
        p.partBrandName?.toLowerCase().includes(q);

      // Category filter (match root category or subcategory)
      const matchCategory = selectedCategory === 'all' ||
        p.categoryId === selectedCategory ||
        p.subCategoryId === selectedCategory;

      // Part Brand filter
      const matchBrand = selectedBrand === 'all' || p.partBrandId === selectedBrand;

      // Status filter
      const matchStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && p.isActive !== false) ||
        (selectedStatus === 'inactive' && p.isActive === false);

      // Vehicle Category & Brand compatibility filter
      const matchVehCategory = selectedVehCategory === 'all' ||
        p.fitments?.some(f => f.vehicleCategoryId === selectedVehCategory);

      const matchVehBrand = selectedVehBrand === 'all' ||
        p.fitments?.some(f => f.vehicleBrandId === selectedVehBrand);

      return matchSearch && matchCategory && matchBrand && matchStatus && matchVehCategory && matchVehBrand;
    });
  }, [products, search, selectedCategory, selectedBrand, selectedStatus, selectedVehCategory, selectedVehBrand]);

  // Sort logic
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'newest') {
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => (a.salePrice || a.price || 0) - (b.salePrice || b.price || 0));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0));
    }
    return list;
  }, [filteredProducts, sortBy]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const paginatedProducts = sortedProducts.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory, selectedBrand, selectedStatus, selectedVehCategory, selectedVehBrand, sortBy]);

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Spare Parts Catalog</h1>
            <p className="text-xs text-gray-500">
              Manage automotive products, OEM numbers, dynamic specifications & vehicle compatibility
            </p>
          </div>
        </div>
        <button
          onClick={onAddProduct}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product name, SKU, OEM or part number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full md:w-auto px-3 py-2 text-xs font-medium bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
            >
              <option value="newest">Newest Added</option>
              <option value="oldest">Oldest Added</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Part Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 font-medium text-gray-700 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Part Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Part Brand Filter */}
          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 font-medium text-gray-700 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Part Brands</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Vehicle Category Filter */}
          <select
            value={selectedVehCategory}
            onChange={e => setSelectedVehCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 font-medium text-gray-700 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Vehicle Types</option>
            {vehicleCategories.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          {/* Vehicle Brand Filter */}
          <select
            value={selectedVehBrand}
            onChange={e => setSelectedVehBrand(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 font-medium text-gray-700 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Vehicle Brands</option>
            {vehicleBrands.map(vb => (
              <option key={vb.id} value={vb.id}>{vb.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            className="px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 font-medium text-gray-700 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {(search || selectedCategory !== 'all' || selectedBrand !== 'all' || selectedStatus !== 'all' || selectedVehCategory !== 'all' || selectedVehBrand !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedBrand('all');
                setSelectedStatus('all');
                setSelectedVehCategory('all');
                setSelectedVehBrand('all');
              }}
              className="ml-auto text-[11px] text-orange-600 hover:text-orange-700 font-semibold cursor-pointer underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-gray-400">
            <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Loading spare parts catalog...</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="py-24 text-center text-gray-400">
            <Package className="w-14 h-14 mx-auto mb-3 opacity-30 text-gray-500" />
            <h3 className="text-base font-bold text-gray-700">No Products Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
              {products.length === 0
                ? 'Your inventory is currently empty. Click below to add your first spare part with vehicle compatibility.'
                : 'No products match your search or filter criteria. Try adjusting your search term.'}
            </p>
            <button
              onClick={onAddProduct}
              className="px-5 py-2.5 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-all cursor-pointer shadow-md shadow-orange-500/20"
            >
              + Add Spare Part
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3.5 px-4 w-14">Image</th>
                  <th className="py-3.5 px-4">Product / SKU</th>
                  <th className="py-3.5 px-4">Part Brand</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Compatible Vehicles</th>
                  <th className="py-3.5 px-4">Price / Sale</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProducts.map(p => {
                  const fitmentCount = p.fitments?.length || 0;
                  const primaryImg = p.images?.[0] || '';
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Image */}
                      <td className="py-3.5 px-4">
                        {primaryImg ? (
                          <img
                            src={primaryImg}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover bg-gray-100 border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">
                            <Package className="w-5 h-5 opacity-60" />
                          </div>
                        )}
                      </td>

                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => onViewProduct(p.id)}
                          className="font-bold text-gray-900 hover:text-orange-600 transition-colors cursor-pointer line-clamp-1"
                        >
                          {p.name}
                        </div>
                        <div className="font-mono text-[11px] text-gray-400">
                          SKU: <span className="text-gray-600 font-semibold">{p.sku || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Part Brand */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-xs font-semibold">
                          {p.partBrandName || brands.find(b => b.id === p.partBrandId)?.name || '—'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-gray-800">
                          {p.categoryName || categories.find(c => c.id === p.categoryId)?.name || '—'}
                        </div>
                        {p.subCategoryName && (
                          <div className="text-[11px] text-gray-400">↳ {p.subCategoryName}</div>
                        )}
                      </td>

                      {/* Compatible Vehicles */}
                      <td className="py-3.5 px-4">
                        {fitmentCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                              <Car className="w-3.5 h-3.5" />
                              <span>{fitmentCount} {fitmentCount === 1 ? 'vehicle' : 'vehicles'}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Universal / None</span>
                        )}
                      </td>

                      {/* Pricing */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-bold text-gray-900">
                          ₹{(p.salePrice || p.price || 0).toLocaleString('en-IN')}
                        </div>
                        {p.salePrice && p.price > p.salePrice && (
                          <div className="text-[11px] text-gray-400 line-through">
                            ₹{p.price.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4 text-xs">
                        <span className={`font-semibold ${
                          (p.stock || 0) <= 5 ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {p.stock || 0} units
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {p.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewProduct(p.id)}
                            title="View Product"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditProduct(p.id)}
                            title="Edit Product"
                            className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(p)}
                            title="Delete Product"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Showing <strong className="text-gray-800">{sortedProducts.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-gray-800">{Math.min(page * pageSize, sortedProducts.length)}</strong> of{' '}
            <strong className="text-gray-800">{sortedProducts.length}</strong> spare parts
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-700 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingProduct && createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 p-6 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Delete Spare Part?</h3>
            <p className="text-xs text-gray-500 mb-4">
              Are you sure you want to delete <strong className="text-gray-800">"{deletingProduct.name}"</strong>?
              This item will be soft-deleted and removed from the active catalog.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingProduct(null)}
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
