import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, Search, Car, Filter } from "lucide-react";
import { useAdmin } from "../../App";
import { VehicleCategory, VehicleBrand, VehicleModel } from "../../models";
import {
  getVehicleCategories,
  getVehicleBrands,
  getPaginatedVehicleModels,
  saveVehicleModel,
  deleteVehicleModel,
} from "../../services/catalogService";
import { DocumentSnapshot } from "firebase/firestore";

export default function VehicleModelsScreen() {
  const { showToast } = useAdmin();
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("all");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("all");

  // Pagination state (10 per page, cursor-based)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [firstDoc, setFirstDoc] = useState<DocumentSnapshot | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<VehicleModel | null>(null);
  const [formData, setFormData] = useState({
    vehicleCategoryId: "",
    vehicleBrandId: "",
    name: "",
    slug: "",
    image: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load categories and brands once for dropdown filters and modal
  useEffect(() => {
    Promise.all([getVehicleCategories(), getVehicleBrands()])
      .then(([catData, brandData]) => {
        setCategories(catData);
        setBrands(brandData);
      })
      .catch((err) => console.error("Failed to load filter metadata:", err));
  }, []);

  // Fetch paginated models from Firestore
  const fetchPage = async (
    direction: "first" | "next" | "prev" = "first",
    targetPage = 1,
    cursorOverride?: DocumentSnapshot | null
  ) => {
    try {
      setLoading(true);
      let cursor = cursorOverride;
      if (cursor === undefined) {
        if (direction === "next") cursor = lastDoc;
        else if (direction === "prev") cursor = firstDoc;
        else cursor = null;
      }

      const res = await getPaginatedVehicleModels({
        categoryId: selectedCatFilter,
        brandId: selectedBrandFilter,
        search: debouncedSearch,
        pageSize: 10,
        cursorDoc: cursor,
        direction,
      });

      setModels(res.items);
      setTotalCount(res.totalCount);
      setFirstDoc(res.firstDoc);
      setLastDoc(res.lastDoc);
      setCurrentPage(targetPage);
    } catch (err: any) {
      showToast(err.message || "Error loading vehicle models", "error");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch from page 1 whenever category filter, brand filter, or debounced search changes
  useEffect(() => {
    fetchPage("first", 1, null);
  }, [selectedCatFilter, selectedBrandFilter, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / 10) || 1;

  // Pagination navigation rules:
  // From page N, only go to N-1 (Prev), N+1 (Next), or 1 (Reset)
  const handleFirstPage = () => {
    if (currentPage === 1 || loading) return;
    fetchPage("first", 1, null);
  };

  const handlePrevPage = () => {
    if (currentPage <= 1 || loading || !firstDoc) return;
    fetchPage("prev", currentPage - 1, firstDoc);
  };

  const handleNextPage = () => {
    if (currentPage >= totalPages || loading || !lastDoc) return;
    fetchPage("next", currentPage + 1, lastDoc);
  };

  const handleOpenAdd = () => {
    setEditingModel(null);
    const firstCat = categories[0]?.id || "";
    const availableBrands = brands.filter(
      (b) => b.vehicleCategoryId === firstCat,
    );
    setFormData({
      vehicleCategoryId: firstCat,
      vehicleBrandId: availableBrands[0]?.id || "",
      name: "",
      slug: "",
      image: "",
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (model: VehicleModel) => {
    setEditingModel(model);
    setFormData({
      vehicleCategoryId: model.vehicleCategoryId,
      vehicleBrandId: model.vehicleBrandId,
      name: model.name,
      slug: model.slug,
      image: model.image || "",
      isActive: model.isActive !== false,
    });
    setShowModal(true);
  };

  const handleModalCategoryChange = (catId: string) => {
    const availableBrands = brands.filter((b) => b.vehicleCategoryId === catId);
    setFormData((prev) => ({
      ...prev,
      vehicleCategoryId: catId,
      vehicleBrandId: availableBrands[0]?.id || "",
    }));
  };

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-");
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingModel ? prev.slug : slug,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleCategoryId) {
      showToast("Please select a Vehicle Category", "error");
      return;
    }
    if (!formData.vehicleBrandId) {
      showToast("Please select a Vehicle Brand", "error");
      return;
    }
    if (!formData.name.trim()) {
      showToast("Model name is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const selectedCat = categories.find(
        (c) => c.id === formData.vehicleCategoryId,
      );
      const selectedBrand = brands.find(
        (b) => b.id === formData.vehicleBrandId,
      );
      await saveVehicleModel({
        id: editingModel?.id,
        vehicleCategoryId: formData.vehicleCategoryId,
        vehicleCategoryName: selectedCat?.name || "",
        vehicleBrandId: formData.vehicleBrandId,
        vehicleBrandName: selectedBrand?.name || "",
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        image: formData.image.trim(),
        isActive: formData.isActive,
      });
      showToast(
        `Vehicle Model ${editingModel ? "updated" : "created"} successfully`,
        "success",
      );
      setShowModal(false);
      fetchPage("first", 1, null);
    } catch (err: any) {
      showToast(err.message || "Error saving vehicle model", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteVehicleModel(deletingId);
      showToast("Vehicle model deleted", "info");
      setDeletingId(null);
      fetchPage("first", 1, null);
    } catch (err: any) {
      showToast(err.message || "Failed to delete vehicle model", "error");
    }
  };

  // Filtered brands for the modal cascading dropdown
  const modalAvailableBrands = brands.filter(
    (b) => b.vehicleCategoryId === formData.vehicleCategoryId,
  );

  // Filtered brands for the top filter bar
  const filterAvailableBrands =
    selectedCatFilter === "all"
      ? brands
      : brands.filter((b) => b.vehicleCategoryId === selectedCatFilter);

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900">Vehicle Models</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                Total: {totalCount}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Models by Brand (e.g. Swift, Baleno, Creta, i20, City, Scorpio)
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vehicle Model</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search directly from database by model name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
            <select
              value={selectedCatFilter}
              onChange={(e) => {
                setSelectedCatFilter(e.target.value);
                setSelectedBrandFilter("all");
              }}
              className="px-2.5 py-1.5 text-xs font-medium bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <span>Brand:</span>
            <select
              value={selectedBrandFilter}
              onChange={(e) => setSelectedBrandFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">All Brands ({filterAvailableBrands.length})</option>
              {filterAvailableBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading vehicle models...</p>
          </div>
        ) : models.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-700">
              No Vehicle Models Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Add models like Swift (Maruti), Creta (Hyundai), or City (Honda).
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-all cursor-pointer"
            >
              + Add Vehicle Model
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3.5 px-4">Model Name</th>
                  <th className="py-3.5 px-4">Brand</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {models.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-3">
                      {m.image ? (
                        <img
                          src={m.image}
                          alt={m.name}
                          className="w-8 h-8 rounded-lg object-cover bg-gray-50 border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 font-bold flex items-center justify-center text-xs">
                          {m.name.charAt(0)}
                        </div>
                      )}
                      <span>{m.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-800">
                      {m.vehicleBrandName ||
                        brands.find((b) => b.id === m.vehicleBrandId)?.name ||
                        "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-md text-gray-600 font-medium">
                        {m.vehicleCategoryName ||
                          categories.find((c) => c.id === m.vehicleCategoryId)
                            ?.name ||
                          "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                      {m.slug}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          m.isActive !== false
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {m.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          title="Edit"
                          className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(m.id)}
                          title="Delete"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-medium">
                Showing{" "}
                <span className="font-semibold text-gray-800">
                  {totalCount === 0 ? 0 : (currentPage - 1) * 10 + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-800">
                  {Math.min(currentPage * 10, totalCount)}
                </span>{" "}
                of <span className="font-semibold text-gray-800">{totalCount}</span> models
              </div>

              <div className="flex items-center gap-2">
                {/* Reset / Direct Jump to Page 1 */}
                <button
                  onClick={handleFirstPage}
                  disabled={currentPage === 1 || loading}
                  title="Direct Jump to Page 1"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    currentPage === 1 || loading
                      ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                      : "bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border-gray-200 hover:border-orange-200 shadow-xs cursor-pointer"
                  }`}
                >
                  « Page 1
                </button>

                {/* Previous Page (from first document) */}
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1 || loading || !firstDoc}
                  title="Previous Page (loads previous 10)"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    currentPage <= 1 || loading || !firstDoc
                      ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                      : "bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border-gray-200 hover:border-orange-200 shadow-xs cursor-pointer"
                  }`}
                >
                  ‹ Prev
                </button>

                {/* Current Page Badge */}
                <div className="px-3 py-1.5 text-xs font-bold bg-orange-500 text-white rounded-lg shadow-xs select-none">
                  Page {currentPage} of {totalPages}
                </div>

                {/* Next Page (from last document) */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || loading || !lastDoc}
                  title="Next Page (loads next 10)"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    currentPage >= totalPages || loading || !lastDoc
                      ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                      : "bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border-gray-200 hover:border-orange-200 shadow-xs cursor-pointer"
                  }`}
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {editingModel ? "Edit Vehicle Model" : "Add Vehicle Model"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 text-lg font-light leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vehicle Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.vehicleCategoryId}
                  onChange={(e) => handleModalCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="" disabled>
                    Select Category
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vehicle Brand <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.vehicleBrandId}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleBrandId: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="" disabled>
                    Select Brand
                  </option>
                  {modalAvailableBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {modalAvailableBrands.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No brands available for the selected category. Please create
                    a brand first!
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Model Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swift, Creta, City"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  placeholder="e.g. swift"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/swift.png"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.isActive ? "true" : "false"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isActive: e.target.value === "true",
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {submitting
                    ? "Saving..."
                    : editingModel
                      ? "Update Model"
                      : "Save Model"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Delete Vehicle Model?
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Are you sure you want to delete this model? Any variants tied to
              this model might be affected.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-md shadow-red-500/20 transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
