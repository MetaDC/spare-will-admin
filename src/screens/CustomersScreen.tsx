import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Users,
  Mail,
  Phone,
  Calendar,
  MessageCircle,
  ChevronRight,
  X,
  RotateCw,
} from "lucide-react";
import { QueryDocumentSnapshot } from "firebase/firestore";
import { useAdmin } from "../App";
import { UserProfile } from "../types";
import {
  fetchCustomersPaginated,
  searchCustomersInDb,
  formatInquiryDate,
} from "../services/adminService";

export default function CustomersScreen() {
  const { navigate } = useAdmin();
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Cursors map to allow direct Firestore pagination with limit(10)
  // Page 1 starts with null cursor
  const cursorsMap = useRef<Record<number, QueryDocumentSnapshot | null>>({
    1: null,
  });

  // Debounce search input to avoid redundant database reads
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Main loader from Firestore database
  const loadData = useCallback(
    async (pageToLoad: number, activeSearch: string) => {
      setLoading(true);
      try {
        if (activeSearch) {
          // Direct database search across fields
          const result = await searchCustomersInDb(activeSearch, pageSize);
          setCustomers(result.customers);
          setTotalCount(result.totalCount);
        } else {
          // Direct database pagination with limit(10)
          const cursor = cursorsMap.current[pageToLoad] ?? null;
          const result = await fetchCustomersPaginated({
            pageSize,
            cursor,
          });

          setCustomers(result.customers);
          setTotalCount(result.totalCount);

          // Save next page cursor if available
          if (result.lastDoc) {
            cursorsMap.current[pageToLoad + 1] = result.lastDoc;
          }
        }
      } catch (err) {
        console.error("Failed to load customers from database:", err);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  // Trigger data load when debounced search or page changes
  useEffect(() => {
    // When search changes, always reset to page 1
    if (debouncedSearch) {
      setCurrentPage(1);
      loadData(1, debouncedSearch);
    } else {
      loadData(currentPage, "");
    }
  }, [debouncedSearch, currentPage, loadData]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Next page handler — fetches next 10 directly from database
  const handleNextPage = () => {
    if (currentPage < totalPages && !loading) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Previous page handler — fetches previous 10 directly from database
  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Jump to first page
  const handleFirstPage = () => {
    if (currentPage !== 1 && !loading) {
      cursorsMap.current = { 1: null };
      setCurrentPage(1);
    }
  };

  // Refresh current view from database
  const handleRefresh = () => {
    if (debouncedSearch) {
      loadData(1, debouncedSearch);
    } else {
      cursorsMap.current = { 1: null };
      setCurrentPage(1);
      loadData(1, "");
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    cursorsMap.current = { 1: null };
    setCurrentPage(1);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900">Customers</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                Total: {totalCount}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Manage registered customers, view contact information and inquiry
              records
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh database records"
            className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-500" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Database Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search directly on database by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Page status feedback */}
        <div className="text-xs text-gray-500 font-medium">
          {debouncedSearch ? (
            <span>
              Database search for "<strong>{debouncedSearch}</strong>": Found{" "}
              {totalCount} matching {totalCount === 1 ? "customer" : "customers"}
            </span>
          ) : totalPages > 1 ? (
            <span>
              Page {currentPage} of {totalPages} (10 per page)
            </span>
          ) : (
            <span>Showing {customers.length} customer records</span>
          )}
        </div>
      </div>

      {/* Customer Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Fetching customers from database...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-700">
              No Customers Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              {debouncedSearch
                ? `No customer in the database matches "${debouncedSearch}".`
                : "Customer records will automatically appear as users register and log in."}
            </p>
            {debouncedSearch && (
              <button
                onClick={handleClearSearch}
                className="px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-all cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Joined / Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate("customer-detail", c.id)}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer group"
                  >
                    {/* Customer Info (Avatar, Name, Auth UID) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt={c.name}
                            className="w-9 h-9 rounded-full object-cover bg-gray-100 border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-600 font-bold text-xs flex items-center justify-center border border-orange-100 shrink-0">
                            {c.name
                              ? c.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "CU"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                            {c.name || "Unnamed Customer"}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            UID: {c.id ? `${c.id.substring(0, 10)}...` : "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {c.email || "—"}
                          </span>
                        </div>
                        {c.phone ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            No phone registered
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Joined Date (Timestamp) */}
                    <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatInquiryDate(c.createdAt)}</span>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {c.phone && (
                          <>
                            <a
                              href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Chat on WhatsApp"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                            <a
                              href={`tel:${c.phone}`}
                              title="Call Customer"
                              className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => navigate("customer-detail", c.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Direct Database Pagination Bar */}
            {!debouncedSearch && totalPages > 1 && (
              <div className="px-4 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                <span className="text-xs text-gray-500">
                  Showing 10 customers per page from database
                </span>
                <div className="flex items-center gap-1.5">
                  {/* Jump to Page 1 */}
                  <button
                    onClick={handleFirstPage}
                    disabled={currentPage === 1 || loading}
                    title="Direct Jump to Page 1"
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      currentPage === 1 || loading
                        ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                        : "bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border-gray-200 hover:border-orange-200 shadow-2xs cursor-pointer"
                    }`}
                  >
                    « Page 1
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      currentPage === 1 || loading
                        ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                        : "bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border-gray-200 hover:border-orange-200 shadow-2xs cursor-pointer"
                    }`}
                  >
                    ‹ Previous
                  </button>

                  {/* Current Page Indicator */}
                  <span className="px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg shadow-2xs">
                    Page {currentPage} of {totalPages}
                  </span>

                  {/* Next Page */}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || loading}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      currentPage >= totalPages || loading
                        ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                        : "bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border-gray-200 hover:border-orange-200 shadow-2xs cursor-pointer"
                    }`}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
