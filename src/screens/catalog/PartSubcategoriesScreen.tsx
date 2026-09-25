import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  FolderTree,
  GitBranch,
  Filter,
} from "lucide-react";
import { useAdmin } from "../../App";
import { PartCategory, PartSubcategory } from "../../models";
import {
  getPartCategories,
  getPaginatedPartSubcategories,
  savePartSubcategory,
  deletePartSubcategory,
} from "../../services/catalogService";
import { DocumentSnapshot } from "firebase/firestore";

export default function PartSubcategoriesScreen() {
  const { showToast } = useAdmin();
  const [partCategories, setPartCategories] = useState<PartCategory[]>([]);
  const [subCategories, setSubCategories] = useState<PartSubcategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");

  // Pagination state (10 per page, cursor-based)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [firstDoc, setFirstDoc] = useState<DocumentSnapshot | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSubCat, setEditingSubCat] = useState<PartSubcategory | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    categoryId: "",
    image: "",
    description: "",
    isActive: true,
    sortOrder: 0,
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

  // Load categories once for dropdowns
  useEffect(() => {
    getPartCategories()
      .then(setPartCategories)
      .catch((err) => console.error("Failed to load part categories:", err));
  }, []);

  // Fetch paginated subcategories from Firestore
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

      const res = await getPaginatedPartSubcategories({
        categoryId: selectedCategoryFilter,
        search: debouncedSearch,
        pageSize: 10,
        cursorDoc: cursor,
        direction,
      });

      setSubCategories(res.items);
      setTotalCount(res.totalCount);
      setFirstDoc(res.firstDoc);
      setLastDoc(res.lastDoc);
      setCurrentPage(targetPage);
    } catch (err: any) {
      showToast(err.message || "Failed to load part subcategories", "error");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch from page 1 whenever category filter or debounced search changes
  useEffect(() => {
    fetchPage("first", 1, null);
  }, [selectedCategoryFilter, debouncedSearch]);

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
    setEditingSubCat(null);
    setFormData({
      name: "",
      slug: "",
      categoryId:
        partCategories.length > 0
          ? selectedCategoryFilter !== "all"
            ? selectedCategoryFilter
            : partCategories[0].id
          : "",
      image: "",
      description: "",
      isActive: true,
      sortOrder: totalCount + 1,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (subCat: PartSubcategory) => {
    setEditingSubCat(subCat);
    setFormData({
      name: subCat.name,
      slug: subCat.slug,
      categoryId: subCat.categoryId || "",
      image: subCat.image || "",
      description: subCat.description || "",
      isActive: subCat.isActive !== false,
      sortOrder: subCat.sortOrder || 0,
    });
    setShowModal(true);
  };

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-");
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingSubCat ? prev.slug : slug,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      showToast("Please select a Part Category", "error");
      return;
    }
    if (!formData.name.trim()) {
      showToast("Subcategory name is required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const selectedCat = partCategories.find(
        (c) => c.id === formData.categoryId,
      );
      await savePartSubcategory({
        id: editingSubCat?.id,
        categoryId: formData.categoryId,
        categoryName: selectedCat?.name || "",
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        image: formData.image.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 0,
      });
      showToast(
        `Part Subcategory ${editingSubCat ? "updated" : "created"} successfully`,
        "success",
      );
      setShowModal(false);
      fetchPage("first", 1, null);
    } catch (err: any) {
      showToast(err.message || "Error saving subcategory", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deletePartSubcategory(deletingId);
      showToast("Part subcategory deleted", "info");
      setDeletingId(null);
      fetchPage("first", 1, null);
    } catch (err: any) {
      showToast(err.message || "Failed to delete subcategory", "error");
    }
  };

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Part Subcategories
            </h1>
            <p className="text-xs text-gray-500">
              Manage subcategories under main Part Categories (e.g. Brakes
              &rarr; Brake Pads, Brake Discs)
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Part Subcategory</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subcategories (e.g. Brake Pads, Caliper)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          {/* Part Category Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-700"
            >
              <option value="all">
                All Part Categories ({partCategories.length})
              </option>
              {partCategories.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs font-medium text-gray-500 shrink-0">
          Showing {subCategories.length} of {totalCount} subcategories
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading part subcategories...</p>
          </div>
        ) : subCategories.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-700">
              No Part Subcategories Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              {partCategories.length === 0
                ? "Create a main Part Category first (e.g. Brakes), then add subcategories here."
                : "Create subcategories under a main Part Category (e.g. Brakes → Brake Pads, Brake Discs)."}
            </p>
            <button
              onClick={handleOpenAdd}
              disabled={partCategories.length === 0}
              className="px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-all cursor-pointer disabled:opacity-50"
            >
              + Add Subcategory
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3.5 px-4">Subcategory Name</th>
                  <th className="py-3.5 px-4">Part Category</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subCategories.map((subCat) => {
                  const catName =
                    subCat.categoryName ||
                    partCategories.find((c) => c.id === subCat.categoryId)
                      ?.name ||
                    "Unknown Category";
                  return (
                    <tr
                      key={subCat.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-mono text-xs">
                            ↳
                          </span>
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              {subCat.name}
                            </span>
                            {subCat.description && (
                              <span className="text-[11px] text-gray-400 line-clamp-1">
                                {subCat.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                          <FolderTree className="w-3 h-3" />
                          <span>{catName}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                        {subCat.slug}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            subCat.isActive !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}
                        >
                          {subCat.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(subCat)}
                            title="Edit Subcategory"
                            className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(subCat.id)}
                            title="Delete Subcategory"
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                subcategories
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
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-scale-in">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">
                  {editingSubCat
                    ? "Edit Part Subcategory"
                    : "Add Part Subcategory"}
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
                    Part Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="" disabled>
                      Select Part Category (e.g. Brakes)
                    </option>
                    {partCategories.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {partCategories.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      No part categories found. Please create a main Part
                      Category first (e.g. Brakes)!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subcategory Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Brake Pads, Brake Discs, Brake Shoes"
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
                    placeholder="e.g. brake-pads"
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
                    placeholder="https://example.com/subcategory-image.png"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description of this subcategory..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
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
                      : editingSubCat
                        ? "Update Subcategory"
                        : "Save Subcategory"}
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
                Delete Part Subcategory?
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Are you sure you want to delete this subcategory? Products
                categorized under it might lose subcategory reference.
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
