import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, Search, Tag, ShieldCheck } from "lucide-react";
import { useAdmin } from "../../App";
import { PartBrand } from "../../models";
import {
  getPartBrands,
  savePartBrand,
  deletePartBrand,
} from "../../services/catalogService";

export default function PartBrandsScreen() {
  const { showToast } = useAdmin();
  const [brands, setBrands] = useState<PartBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<PartBrand | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logo: "",
    description: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const data = await getPartBrands();
      setBrands(data);
    } catch (err: any) {
      showToast(err.message || "Error loading part brands", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleOpenAdd = () => {
    setEditingBrand(null);
    setFormData({
      name: "",
      slug: "",
      logo: "",
      description: "",
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (brand: PartBrand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo || "",
      description: brand.description || "",
      isActive: brand.isActive !== false,
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
      slug: editingBrand ? prev.slug : slug,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Brand name is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await savePartBrand({
        id: editingBrand?.id,
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        logo: formData.logo.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive,
      });
      showToast(
        `Part Brand ${editingBrand ? "updated" : "created"} successfully`,
        "success",
      );
      setShowModal(false);
      fetchBrands();
    } catch (err: any) {
      showToast(err.message || "Error saving brand", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deletePartBrand(deletingId);
      showToast("Part brand deleted", "info");
      setDeletingId(null);
      fetchBrands();
    } catch (err: any) {
      showToast(err.message || "Failed to delete part brand", "error");
    }
  };

  const filtered = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase()) ||
      (b.description &&
        b.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Part Brands</h1>
            <p className="text-xs text-gray-500">
              Spare part manufacturers (e.g. Bosch, Valeo, Brembo, SKF, Denso)
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Part Brand</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search spare part brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
        <div className="text-xs font-medium text-gray-500">
          Showing {filtered.length} of {brands.length} brands
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading part brands...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-700">
              No Part Brands Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Add component manufacturers like Bosch, Brembo, Valeo, SKF, or
              MANN-FILTER.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-all cursor-pointer"
            >
              + Add Part Brand
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3.5 px-4">Brand</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-3">
                      {b.logo ? (
                        <img
                          src={b.logo}
                          alt={b.name}
                          className="w-8 h-8 rounded-lg object-contain bg-gray-50 border border-gray-200 p-1"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 font-bold flex items-center justify-center text-xs">
                          {b.name.charAt(0)}
                        </div>
                      )}
                      <span>{b.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                      {b.slug}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 max-w-xs truncate">
                      {b.description || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          b.isActive !== false
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {b.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          title="Edit"
                          className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(b.id)}
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
                  {editingBrand ? "Edit Part Brand" : "Add Part Brand"}
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
                    Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bosch, Brembo, Valeo"
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
                    placeholder="e.g. bosch"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Logo URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/bosch-logo.png"
                    value={formData.logo}
                    onChange={(e) =>
                      setFormData({ ...formData, logo: e.target.value })
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
                    placeholder="e.g. German multinational engineering and technology company..."
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
                      : editingBrand
                        ? "Update Brand"
                        : "Save Brand"}
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
                Delete Part Brand?
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Are you sure you want to delete this part brand? Products linked
                to it might lose manufacturer association.
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
