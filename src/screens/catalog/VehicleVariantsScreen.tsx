import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Car,
  Filter,
  Calendar,
  Zap,
  Gauge,
} from "lucide-react";
import { useAdmin } from "../../App";
import {
  VehicleCategory,
  VehicleBrand,
  VehicleModel,
  VehicleVariant,
} from "../../models";
import {
  getVehicleCategories,
  getVehicleBrands,
  getVehicleModels,
  getPaginatedVehicleVariants,
  saveVehicleVariant,
  deleteVehicleVariant,
} from "../../services/catalogService";
import { DocumentSnapshot } from "firebase/firestore";

export default function VehicleVariantsScreen() {
  const { showToast } = useAdmin();
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [variants, setVariants] = useState<VehicleVariant[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("all");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("all");
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>("all");

  // Pagination state (10 per page, cursor-based)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [firstDoc, setFirstDoc] = useState<DocumentSnapshot | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VehicleVariant | null>(
    null,
  );
  const [formData, setFormData] = useState({
    vehicleCategoryId: "",
    vehicleBrandId: "",
    vehicleModelId: "",
    name: "",
    yearFrom: 2018,
    yearTo: 2024,
    fuelType: "Petrol" as VehicleVariant["fuelType"],
    engine: "1.2L",
    engineCode: "",
    transmission: "Manual" as VehicleVariant["transmission"],
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

  // Load categories, brands, and models once for dropdowns
  useEffect(() => {
    Promise.all([
      getVehicleCategories(),
      getVehicleBrands(),
      getVehicleModels(),
    ])
      .then(([catData, brandData, modelData]) => {
        setCategories(catData);
        setBrands(brandData);
        setModels(modelData);
      })
      .catch((err) => console.error("Failed to load filter metadata:", err));
  }, []);

  // Fetch paginated variants from Firestore
  const fetchPage = async (
    direction: "first" | "next" | "prev" = "first",
    targetPage = 1,
    cursorOverride?: DocumentSnapshot | null,
  ) => {
    try {
      setLoading(true);
      let cursor = cursorOverride;
      if (cursor === undefined) {
        if (direction === "next") cursor = lastDoc;
        else if (direction === "prev") cursor = firstDoc;
        else cursor = null;
      }

      const res = await getPaginatedVehicleVariants({
        categoryId: selectedCatFilter,
        brandId: selectedBrandFilter,
        modelId: selectedModelFilter,
        search: debouncedSearch,
        pageSize: 10,
        cursorDoc: cursor,
        direction,
      });

      setVariants(res.items);
      setTotalCount(res.totalCount);
      setFirstDoc(res.firstDoc);
      setLastDoc(res.lastDoc);
      setCurrentPage(targetPage);
    } catch (err: any) {
      showToast(err.message || "Error loading vehicle variants", "error");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch from page 1 whenever filters or debounced search change
  useEffect(() => {
    fetchPage("first", 1, null);
  }, [
    selectedCatFilter,
    selectedBrandFilter,
    selectedModelFilter,
    debouncedSearch,
  ]);

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
    setEditingVariant(null);
    const firstCat = categories[0]?.id || "";
    const availableBrands = brands.filter(
      (b) => b.vehicleCategoryId === firstCat,
    );
    const firstBrand = availableBrands[0]?.id || "";
    const availableModels = models.filter(
      (m) => m.vehicleBrandId === firstBrand,
    );
    const firstModel = availableModels[0]?.id || "";

    setFormData({
      vehicleCategoryId: firstCat,
      vehicleBrandId: firstBrand,
      vehicleModelId: firstModel,
      name: "",
      yearFrom: 2018,
      yearTo: new Date().getFullYear(),
      fuelType: "Petrol",
      engine: "1.2L",
      engineCode: "",
      transmission: "Manual",
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (v: VehicleVariant) => {
    setEditingVariant(v);
    setFormData({
      vehicleCategoryId: v.vehicleCategoryId,
      vehicleBrandId: v.vehicleBrandId,
      vehicleModelId: v.vehicleModelId,
      name: v.name,
      yearFrom: v.yearFrom,
      yearTo: v.yearTo,
      fuelType: v.fuelType,
      engine: v.engine || "",
      engineCode: v.engineCode || "",
      transmission: v.transmission,
      isActive: v.isActive !== false,
    });
    setShowModal(true);
  };

  const handleModalCategoryChange = (catId: string) => {
    const availableBrands = brands.filter((b) => b.vehicleCategoryId === catId);
    const firstBrand = availableBrands[0]?.id || "";
    const availableModels = models.filter(
      (m) => m.vehicleBrandId === firstBrand,
    );
    setFormData((prev) => ({
      ...prev,
      vehicleCategoryId: catId,
      vehicleBrandId: firstBrand,
      vehicleModelId: availableModels[0]?.id || "",
    }));
  };

  const handleModalBrandChange = (brandId: string) => {
    const availableModels = models.filter((m) => m.vehicleBrandId === brandId);
    setFormData((prev) => ({
      ...prev,
      vehicleBrandId: brandId,
      vehicleModelId: availableModels[0]?.id || "",
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.vehicleCategoryId ||
      !formData.vehicleBrandId ||
      !formData.vehicleModelId
    ) {
      showToast("Please select Category, Brand and Model", "error");
      return;
    }
    if (!formData.name.trim()) {
      showToast("Variant name is required", "error");
      return;
    }
    if (Number(formData.yearFrom) > Number(formData.yearTo)) {
      showToast("Year From cannot be greater than Year To", "error");
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
      const selectedModel = models.find(
        (m) => m.id === formData.vehicleModelId,
      );

      await saveVehicleVariant({
        id: editingVariant?.id,
        vehicleCategoryId: formData.vehicleCategoryId,
        vehicleCategoryName: selectedCat?.name || "",
        vehicleBrandId: formData.vehicleBrandId,
        vehicleBrandName: selectedBrand?.name || "",
        vehicleModelId: formData.vehicleModelId,
        vehicleModelName: selectedModel?.name || "",
        name: formData.name.trim(),
        yearFrom: Number(formData.yearFrom),
        yearTo: Number(formData.yearTo),
        fuelType: formData.fuelType,
        engine: formData.engine.trim(),
        engineCode: formData.engineCode.trim(),
        transmission: formData.transmission,
        isActive: formData.isActive,
      });

      showToast(
        `Vehicle Variant ${editingVariant ? "updated" : "created"} successfully`,
        "success",
      );
      setShowModal(false);
      fetchPage("first", 1, null);
    } catch (err: any) {
      showToast(err.message || "Error saving variant", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteVehicleVariant(deletingId);
      showToast("Vehicle variant deleted", "info");
      setDeletingId(null);
      fetchPage("first", 1, null);
    } catch (err: any) {
      showToast(err.message || "Failed to delete variant", "error");
    }
  };

  // Modal cascading lists
  const modalBrands = brands.filter(
    (b) => b.vehicleCategoryId === formData.vehicleCategoryId,
  );
  const modalModels = models.filter(
    (m) => m.vehicleBrandId === formData.vehicleBrandId,
  );

  // Top filter lists
  const filterBrands =
    selectedCatFilter === "all"
      ? brands
      : brands.filter((b) => b.vehicleCategoryId === selectedCatFilter);
  const filterModels =
    selectedBrandFilter === "all"
      ? selectedCatFilter === "all"
        ? models
        : models.filter((m) => m.vehicleCategoryId === selectedCatFilter)
      : models.filter((m) => m.vehicleBrandId === selectedBrandFilter);

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
              <h1 className="text-xl font-bold text-gray-900">
                Vehicle Variants
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                Total: {totalCount}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Trim levels, years, engines & transmissions (e.g. Swift ZXi
              2018–2023)
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vehicle Variant</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search directly from database by variant name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedCatFilter}
              onChange={(e) => {
                setSelectedCatFilter(e.target.value);
                setSelectedBrandFilter("all");
                setSelectedModelFilter("all");
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

          <select
            value={selectedBrandFilter}
            onChange={(e) => {
              setSelectedBrandFilter(e.target.value);
              setSelectedModelFilter("all");
            }}
            className="px-2.5 py-1.5 text-xs font-medium bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="all">All Brands ({filterBrands.length})</option>
            {filterBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedModelFilter}
            onChange={(e) => setSelectedModelFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="all">All Models ({filterModels.length})</option>
            {filterModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading vehicle variants...</p>
          </div>
        ) : variants.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-700">
              No Vehicle Variants Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Add specific trims with years and engine specifications (e.g.
              Swift ZXi 2018–2023 Petrol Manual).
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-all cursor-pointer"
            >
              + Add Vehicle Variant
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3.5 px-4">Variant</th>
                  <th className="py-3.5 px-4">Model & Brand</th>
                  <th className="py-3.5 px-4">Years</th>
                  <th className="py-3.5 px-4">Engine / Fuel</th>
                  <th className="py-3.5 px-4">Transmission</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      {v.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-gray-900">
                        {v.vehicleModelName ||
                          models.find((m) => m.id === v.vehicleModelId)?.name ||
                          "—"}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {v.vehicleBrandName ||
                          brands.find((b) => b.id === v.vehicleBrandId)?.name ||
                          "—"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-700">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-md">
                        {v.yearFrom}–{v.yearTo}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-gray-800">
                        {v.engine || "—"}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {v.fuelType}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                      {v.transmission}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          v.isActive !== false
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {v.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(v)}
                          title="Edit"
                          className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(v.id)}
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
                of{" "}
                <span className="font-semibold text-gray-800">
                  {totalCount}
                </span>{" "}
                variants
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
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 className="text-base font-bold text-gray-900">
                  {editingVariant
                    ? "Edit Vehicle Variant"
                    : "Add Vehicle Variant"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 text-lg font-light leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form
                onSubmit={handleSave}
                className="p-6 space-y-4 overflow-y-auto"
              >
                {/* Cascading selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.vehicleCategoryId}
                      onChange={(e) =>
                        handleModalCategoryChange(e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.vehicleBrandId}
                      onChange={(e) => handleModalBrandChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {modalBrands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.vehicleModelId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vehicleModelId: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {modalModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Variant Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Variant Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ZXi, VXi, SX(O), Sportz"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Year From - Year To */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Year From
                    </label>
                    <input
                      type="number"
                      min="1970"
                      max="2035"
                      value={formData.yearFrom}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          yearFrom: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Year To
                    </label>
                    <input
                      type="number"
                      min="1970"
                      max="2035"
                      value={formData.yearTo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          yearTo: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Engine & Engine Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Engine Displacement
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1.2L, 1.5L, 350cc"
                      value={formData.engine}
                      onChange={(e) =>
                        setFormData({ ...formData, engine: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Engine Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. K12M, D13A"
                      value={formData.engineCode}
                      onChange={(e) =>
                        setFormData({ ...formData, engineCode: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Fuel Type & Transmission */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Fuel Type
                    </label>
                    <select
                      value={formData.fuelType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fuelType: e.target.value as any,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Transmission
                    </label>
                    <select
                      value={formData.transmission}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          transmission: e.target.value as any,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="Manual">Manual</option>
                      <option value="Automatic">Automatic</option>
                      <option value="AMT">AMT</option>
                      <option value="CVT">CVT</option>
                      <option value="DCT">DCT</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
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
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
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
                      : editingVariant
                        ? "Update Variant"
                        : "Save Variant"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete Confirmation Modal */}
      {deletingId &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                Delete Vehicle Variant?
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Are you sure you want to delete this variant? Any product
                compatibility references linked to this variant may be removed.
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
          document.body,
        )}
    </div>
  );
}
