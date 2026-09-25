import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  MessageCircle,
  Phone,
  ChevronRight,
  ChevronDown,
  FileText,
  Car,
  Clock,
  Wrench,
  X,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useAdmin } from "../App";
import StatusBadge from "../components/StatusBadge";
import { Inquiry, InquiryStatus, PartItem } from "../types";
import {
  subscribeToInquiriesByStatus,
  formatInquiryDate,
} from "../services/adminService";

const STATUS_OPTIONS: (InquiryStatus | "All")[] = [
  "New",
  "Reviewing",
  "Price Sent",
  "Completed",
  "Cancelled",
  "All",
];

export default function InquiriesScreen() {
  const { navigate } = useAdmin();

  // Search input & selected status (Default: "New")
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "All">(
    "New",
  );

  // Inquiries fetched from Firestore
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded card tracking on mobile view
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Real-time subscription to Firestore
  useEffect(() => {
    setLoading(true);
    const isSearching = Boolean(search.trim());
    const queryStatus = isSearching ? "All" : statusFilter;

    const unsub = subscribeToInquiriesByStatus(
      queryStatus,
      (items) => {
        setInquiries(items);
        setLoading(false);
      },
      (err) => {
        console.warn("Failed to fetch inquiries for status:", queryStatus, err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [statusFilter, Boolean(search.trim())]);

  // Global search filtering across customer, phone, vehicle, ID and parts
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      return inquiries;
    }

    return inquiries.filter((inq) => {
      const seqId = (inq.inquireId || inq.InquireID || "").toLowerCase();
      const idMatch = inq.id.toLowerCase().includes(q) || seqId.includes(q);
      const customerMatch =
        inq.contact?.fullName?.toLowerCase().includes(q) ||
        inq.contact?.mobileNumber?.includes(q);
      const vehicleMatch =
        inq.vehicle?.make?.toLowerCase().includes(q) ||
        inq.vehicle?.model?.toLowerCase().includes(q) ||
        inq.vehicle?.variantName?.toLowerCase().includes(q);
      const partsMatch = (inq.parts || []).some((p) =>
        p.name.toLowerCase().includes(q),
      );

      return idMatch || customerMatch || vehicleMatch || partsMatch;
    });
  }, [inquiries, search]);

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Paginated inquiries slice
  const paginatedInquiries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (newStatus: InquiryStatus | "All") => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleWhatsApp = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    const clean = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${clean}`, "_blank");
  };

  const handleCall = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    window.open(`tel:${phone}`, "_self");
  };

  const getCustomerInitials = (name: string) => {
    const parts = (name || "").trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name || "").slice(0, 2).toUpperCase() || "CU";
  };

  const getPartPrice = (p: PartItem): number => {
    if (p.partTypePrices) {
      const prices: number[] = Object.values(p.partTypePrices)
        .map((v) => Number(v))
        .filter((v) => !isNaN(v) && v > 0);
      if (prices.length > 0) return Math.min(...prices);
    }
    return p.price || 0;
  };

  const isPartPriced = (p: PartItem): boolean => {
    if (
      p.partTypePrices &&
      Object.values(p.partTypePrices).some((v) => Number(v) > 0)
    ) {
      return true;
    }
    return Boolean(p.price && p.price > 0);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Header — Title & Total Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900">Inquiries</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                Total: {totalCount}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Manage customer inquiries, quotation workflow and WhatsApp quotes
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        {/* Search input with global scope */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search globally by customer, phone, vehicle, ID or part..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="w-full sm:w-auto shrink-0 flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 hidden sm:inline">
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) =>
              handleStatusFilterChange(e.target.value as InquiryStatus | "All")
            }
            className="w-full sm:w-44 px-3 py-2 text-sm font-semibold bg-gray-50 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer transition-all"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "All" ? "All Inquiries" : opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global search feedback indicator */}
      {search.trim() && (
        <div className="text-xs text-slate-500 font-medium flex items-center justify-between px-1">
          <span>
            Global search across all statuses: Found{" "}
            <strong className="text-slate-900">{filtered.length}</strong>{" "}
            matching {filtered.length === 1 ? "inquiry" : "inquiries"}
          </span>
          <button
            onClick={() => {
              setSearch("");
              setCurrentPage(1);
            }}
            className="text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center justify-center text-gray-400">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading inquiries...</p>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 mx-auto mb-3 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-800 text-base">
            No inquiries found
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            {search.trim()
              ? `No inquiries match "${search}". Try searching by another keyword.`
              : `There are currently no inquiries with status "${statusFilter}".`}
          </p>
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="mt-4 px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-all cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ======================================================== */}
          {/* 1. DESKTOP VIEW: Clean, full-featured Table format       */}
          {/* ======================================================== */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 text-xs uppercase font-medium">
                  <tr>
                    <th className="py-3.5 px-4">Inquiry ID</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4 text-center">Parts Count</th>
                    <th className="py-3.5 px-4">Quote / Pricing</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedInquiries.map((inq) => {
                    const displayId =
                      inq.inquireId ||
                      inq.InquireID ||
                      (inq.id.startsWith("#") ? inq.id : `#${inq.id}`);

                    const totalPrice = (inq.parts || []).reduce(
                      (sum, p) => sum + getPartPrice(p) * (p.quantity || 1),
                      0,
                    );
                    const pricedCount = (inq.parts || []).filter(
                      isPartPriced,
                    ).length;

                    return (
                      <tr
                        key={inq.id}
                        onClick={() => navigate("inquiry-detail", inq.id)}
                        className="hover:bg-orange-50/30 transition-colors cursor-pointer group"
                      >
                        {/* Inquiry ID */}
                        <td className="py-3.5 px-4 align-top">
                          <span className="font-mono font-black text-orange-600 bg-orange-50 border border-orange-200/80 text-xs px-2.5 py-1 rounded-lg tracking-wide inline-block shadow-2xs">
                            {displayId}
                          </span>
                        </td>

                        {/* Date (Separate column) */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span className="text-xs text-gray-600 font-medium flex items-center gap-1.5 pt-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {formatInquiryDate(inq.createdAt)}
                          </span>
                        </td>

                        {/* Customer Info (Name and Phone only — no avatar, no chat/call icons) */}
                        <td className="py-3.5 px-4 align-top">
                          <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate max-w-[160px]">
                            {inq.contact?.fullName || "Valued Customer"}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {inq.contact?.mobileNumber || "—"}
                          </p>
                        </td>

                        {/* Vehicle Info */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2">
                            <Car className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate max-w-[180px]">
                                {inq.vehicle?.year
                                  ? `${inq.vehicle.year} `
                                  : ""}
                                {inq.vehicle?.make} {inq.vehicle?.model}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                                {[
                                  inq.vehicle?.variantName,
                                  inq.vehicle?.engine,
                                  inq.vehicle?.transmission,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Standard trim"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Requested Parts Count (Only count 1, 2, 3...) */}
                        <td className="py-3.5 px-4 align-top text-center">
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg inline-block">
                            {inq.parts?.length || 0}{" "}
                            {inq.parts?.length === 1 ? "Part" : "Parts"}
                          </span>
                        </td>

                        {/* Pricing / Quote */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          {totalPrice > 0 ? (
                            <div>
                              <p className="font-mono font-bold text-slate-900 text-sm">
                                ₹{totalPrice.toLocaleString()}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                {pricedCount}/{inq.parts.length} priced
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md inline-block">
                                Pricing Pending
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-top text-center">
                          <StatusBadge status={inq.status} />
                        </td>

                        {/* Action Buttons */}
                        <td
                          className="py-3.5 px-4 align-top text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate("inquiry-detail", inq.id)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <span>
                                {inq.status === "Completed" ||
                                inq.status === "Cancelled"
                                  ? "View"
                                  : "Quote"}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. MOBILE VIEW: Compact Listview Tile Cards with Dropdown */}
          {/* ======================================================== */}
          <div className="block md:hidden space-y-3">
            {paginatedInquiries.map((inq) => {
              const displayId =
                inq.inquireId ||
                inq.InquireID ||
                (inq.id.startsWith("#") ? inq.id : `#${inq.id}`);

              const totalPrice = (inq.parts || []).reduce(
                (sum, p) => sum + getPartPrice(p) * (p.quantity || 1),
                0,
              );
              const pricedCount = (inq.parts || []).filter(isPartPriced).length;
              const isExpanded = Boolean(expandedIds[inq.id]);

              return (
                <div
                  key={inq.id}
                  onClick={() => navigate("inquiry-detail", inq.id)}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-orange-300 transition-all cursor-pointer overflow-hidden"
                >
                  {/* Top essential Tile Row */}
                  <div className="p-4 space-y-3">
                    {/* Header: ID, Date & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-orange-600 bg-orange-50 border border-orange-200/80 text-xs px-2.5 py-0.5 rounded-lg">
                          {displayId}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatInquiryDate(inq.createdAt)}
                        </span>
                      </div>
                      <StatusBadge status={inq.status} />
                    </div>

                    {/* Customer & Vehicle Essential Info */}
                    <div className="flex items-start justify-between gap-3 pt-0.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                          {getCustomerInitials(inq.contact?.fullName || "")}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {inq.contact?.fullName || "Valued Customer"}
                          </h3>
                          <p className="text-xs text-slate-500 font-mono">
                            {inq.contact?.mobileNumber}
                          </p>
                        </div>
                      </div>

                      {/* Quick direct WhatsApp on mobile */}
                      <button
                        type="button"
                        title="Chat on WhatsApp"
                        onClick={(e) =>
                          handleWhatsApp(e, inq.contact?.mobileNumber || "")
                        }
                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Vehicle pill */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                      <Car className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="font-semibold truncate">
                        {inq.vehicle?.year ? `${inq.vehicle.year} ` : ""}
                        {inq.vehicle?.make} {inq.vehicle?.model}
                      </span>
                    </div>

                    {/* Tile Bottom Summary Bar + Drop Arrow Toggle */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">
                          {inq.parts?.length || 0} parts
                        </span>
                        <span className="text-slate-300">•</span>
                        {totalPrice > 0 ? (
                          <span className="font-bold text-orange-600 font-mono">
                            ₹{totalPrice.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">
                            Pending quote
                          </span>
                        )}
                      </div>

                      {/* Drop open arrow ("air the card drop open") */}
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(e, inq.id)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                          isExpanded
                            ? "bg-orange-50 border-orange-200 text-orange-600"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                        title="Expand details"
                      >
                        <span>{isExpanded ? "Hide" : "Details"}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Accordion Dropped Details section */}
                  {isExpanded && (
                    <div
                      className="bg-slate-50/80 border-t border-slate-200/90 p-4 space-y-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Vehicle Full Specs */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Vehicle Specifications
                        </span>
                        <div className="text-xs text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                          <p className="font-bold">
                            {inq.vehicle?.year ? `${inq.vehicle.year} ` : ""}
                            {inq.vehicle?.make} {inq.vehicle?.model}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {[
                              inq.vehicle?.variantName,
                              inq.vehicle?.engine,
                              inq.vehicle?.fuelType,
                              inq.vehicle?.transmission,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Standard trim"}
                          </p>
                          {inq.vehicle?.vin && (
                            <p className="text-[10px] text-slate-400 font-mono pt-0.5">
                              VIN: {inq.vehicle.vin}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Requested Parts List with Types & Prices */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Requested Parts ({inq.parts?.length || 0})
                          </span>
                          {pricedCount > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              {pricedCount} of {inq.parts?.length || 0} priced
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {(inq.parts || []).map((part, pIdx) => {
                            const partPrices = part.partTypePrices
                              ? Object.entries(part.partTypePrices).filter(
                                  ([_, val]) => Number(val) > 0,
                                )
                              : [];

                            return (
                              <div
                                key={part.id || pIdx}
                                className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-900">
                                    {pIdx + 1}. {part.name}
                                  </span>
                                  <span className="font-mono text-slate-500 font-bold text-[11px]">
                                    ×{part.quantity || 1}
                                  </span>
                                </div>

                                {/* Part types & prices */}
                                {partPrices.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {partPrices.map(([typeName, price]) => (
                                      <span
                                        key={typeName}
                                        className="text-[10px] bg-orange-50 border border-orange-200 text-orange-800 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1"
                                      >
                                        <span className="font-bold">
                                          {typeName}:
                                        </span>
                                        <span className="text-emerald-700 font-bold font-mono">
                                          ₹{Number(price).toLocaleString()}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                ) : part.partTypes &&
                                  part.partTypes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {part.partTypes.map((t) => (
                                      <span
                                        key={t}
                                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Contact & Open Actions Bar */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) =>
                            handleWhatsApp(e, inq.contact?.mobileNumber || "")
                          }
                          className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) =>
                            handleCall(e, inq.contact?.mobileNumber || "")
                          }
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-600" />
                          <span>Call</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate("inquiry-detail", inq.id)}
                          className="flex-1 py-2 bg-[#fb7800] hover:bg-[#e06c00] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* 3. PAGINATION CONTROLS (Only when totalPages > 1)        */}
          {/* ======================================================== */}
          {totalPages > 1 && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-800">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-800">
                  {Math.min(currentPage * pageSize, totalCount)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-800">
                  {totalCount}
                </span>{" "}
                inquiries
              </div>

              <div className="flex items-center gap-2">
                {/* Reset / Direct Jump to Page 1 */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || loading}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    currentPage === 1 || loading
                      ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                      : "bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border-gray-200 hover:border-orange-200 shadow-xs cursor-pointer"
                  }`}
                >
                  « Page 1
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1 || loading}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    currentPage === 1 || loading
                      ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                      : "bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border-gray-200 hover:border-orange-200 shadow-xs cursor-pointer"
                  }`}
                >
                  ‹ Previous
                </button>

                {/* Current Page Pill */}
                <span className="px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg shadow-xs">
                  Page {currentPage} of {totalPages}
                </span>

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage >= totalPages || loading}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    currentPage >= totalPages || loading
                      ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                      : "bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border-gray-200 hover:border-orange-200 shadow-xs cursor-pointer"
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
  );
}
