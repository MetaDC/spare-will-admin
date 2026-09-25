import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  ChevronRight,
  User,
  Mail,
  Calendar,
  Clock,
  Car,
  FileText,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import { useAdmin } from "../App";
import { UserProfile, Inquiry, PartItem } from "../types";
import {
  getCustomerById,
  getCustomerInquiries,
  formatInquiryDate,
} from "../services/adminService";
import StatusBadge from "../components/StatusBadge";

export default function CustomerDetailScreen() {
  const { activeCustomerId, goBack, navigate } = useAdmin();
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [custInquiries, setCustInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!activeCustomerId) return;
    setLoading(true);
    Promise.all([
      getCustomerById(activeCustomerId),
      getCustomerInquiries(activeCustomerId),
    ])
      .then(([cust, inqs]) => {
        setCustomer(cust);
        setCustInquiries(inqs);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load customer details:", err);
        setLoading(false);
      });
  }, [activeCustomerId]);

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

  const filteredInquiries = useMemo(() => {
    if (!search.trim()) return custInquiries;
    const q = search.toLowerCase().trim();
    return custInquiries.filter((inq) => {
      const idMatch =
        (inq.id && inq.id.toLowerCase().includes(q)) ||
        (inq.inquireId && inq.inquireId.toLowerCase().includes(q)) ||
        (inq.InquireID && inq.InquireID.toLowerCase().includes(q));
      const vehicleMatch =
        (inq.vehicle?.make && inq.vehicle.make.toLowerCase().includes(q)) ||
        (inq.vehicle?.model && inq.vehicle.model.toLowerCase().includes(q)) ||
        (inq.vehicle?.variantName &&
          inq.vehicle.variantName.toLowerCase().includes(q));
      const statusMatch = inq.status && inq.status.toLowerCase().includes(q);
      const partsMatch = (inq.parts || []).some((p) =>
        p.name?.toLowerCase().includes(q),
      );
      return idMatch || vehicleMatch || statusMatch || partsMatch;
    });
  }, [custInquiries, search]);

  // Aggregate stats
  const totalInquiriesCount = custInquiries.length;
  const completedCount = custInquiries.filter(
    (i) => i.status === "Completed",
  ).length;
  const pendingCount = custInquiries.filter(
    (i) => i.status !== "Completed" && i.status !== "Cancelled",
  ).length;

  const totalQuotedValue = useMemo(() => {
    return custInquiries.reduce((total, inq) => {
      const inqTotal = (inq.parts || []).reduce(
        (sum, p) => sum + getPartPrice(p) * (p.quantity || 1),
        0,
      );
      return total + inqTotal;
    }, 0);
  }, [custInquiries]);

  if (loading) {
    return (
      <div className="p-6 w-full flex flex-col items-center justify-center py-24 text-gray-400">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading customer profile...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 max-w-xl mx-auto py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 mx-auto mb-3 flex items-center justify-center">
          <User className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-gray-800 text-base">
          Customer Not Found
        </h3>
        <p className="text-gray-500 text-xs sm:text-sm mt-1 mb-4">
          The requested customer could not be found or has been removed.
        </p>
        <button
          onClick={goBack}
          className="px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>
      </div>
    );
  }

  const initials = customer.name
    ? customer.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "CU";

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Top Navigation Bar with Back & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-bold"
            title="Back to Customers"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-gray-900 truncate max-w-[240px] sm:max-w-md">
                  {customer.name || "Customer Profile"}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-600 rounded-full border border-orange-100 shrink-0">
                  {totalInquiriesCount}{" "}
                  {totalInquiriesCount === 1 ? "Inquiry" : "Inquiries"}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Customer account details and complete inquiry quotation history
              </p>
            </div>
          </div>
        </div>

        {/* Quick Contact Actions */}
        {customer.phone && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() =>
                window.open(
                  `https://wa.me/${customer.phone.replace(/\D/g, "")}`,
                  "_blank",
                )
              }
              className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => window.open(`tel:${customer.phone}`, "_self")}
              className="px-3.5 py-2 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Phone className="w-4 h-4 text-sky-600" />
              <span>Call</span>
            </button>
          </div>
        )}
      </div>

      {/* Customer Info Overview & Stats Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {customer.avatar ? (
            <img
              src={customer.avatar}
              alt={customer.name}
              className="w-16 h-16 rounded-2xl object-cover bg-gray-100 border border-gray-200 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 font-extrabold text-xl flex items-center justify-center border border-orange-100 shrink-0">
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {customer.name || "Unnamed Customer"}
              </h2>
              <span className="font-mono text-[11px] text-gray-400 bg-gray-50 border border-gray-200/80 px-2 py-0.5 rounded-md">
                UID: {customer.id ? `${customer.id.substring(0, 12)}...` : "—"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-600">
              {customer.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate max-w-[240px]">
                    {customer.email}
                  </span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="font-mono">{customer.phone}</span>
                </div>
              )}
              {customer.createdAt && (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>Joined {formatInquiryDate(customer.createdAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Total Inquiries
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-gray-900 font-mono">
                {totalInquiriesCount}
              </span>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                {completedCount} Done
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Total Quoted Value
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-gray-900 font-mono">
                {totalQuotedValue > 0
                  ? `₹${totalQuotedValue.toLocaleString()}`
                  : "₹0"}
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {pendingCount} Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiry History Section Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-0">
        {/* Section Header with Search Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">
                Inquiry History
              </h2>
              <p className="text-[11px] text-gray-500">
                All vehicle parts requests submitted by this customer
              </p>
            </div>
          </div>

          {/* Quick Filter Search inside Inquiry History */}
          {custInquiries.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by vehicle, ID, part..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Inquiries Content */}
        {custInquiries.length === 0 ? (
          <div className="py-16 text-center text-gray-400 px-4">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-700">
              No Inquiries Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              This customer hasn't submitted any vehicle spare part inquiries
              yet.
            </p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="py-12 text-center text-gray-400 px-4">
            <p className="text-xs text-gray-500">
              No inquiries match "{search}".
            </p>
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-xs font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 text-xs uppercase font-medium">
                  <tr>
                    <th className="py-3.5 px-4">Inquiry ID</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4 text-center">Parts</th>
                    <th className="py-3.5 px-4">Quote / Pricing</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInquiries.map((inq) => {
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

                        {/* Date */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span className="text-xs text-gray-600 font-medium flex items-center gap-1.5 pt-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {formatInquiryDate(inq.createdAt)}
                          </span>
                        </td>

                        {/* Vehicle Info */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2">
                            <Car className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate max-w-[200px]">
                                {inq.vehicle?.year
                                  ? `${inq.vehicle.year} `
                                  : ""}
                                {inq.vehicle?.make} {inq.vehicle?.model}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate max-w-[200px]">
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

                        {/* Parts Count */}
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

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 align-top text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => navigate("inquiry-detail", inq.id)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <span>
                              {inq.status === "Completed" ||
                              inq.status === "Cancelled"
                                ? "View"
                                : "Quote"}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-gray-100">
              {filteredInquiries.map((inq) => {
                const displayId =
                  inq.inquireId ||
                  inq.InquireID ||
                  (inq.id.startsWith("#") ? inq.id : `#${inq.id}`);

                const totalPrice = (inq.parts || []).reduce(
                  (sum, p) => sum + getPartPrice(p) * (p.quantity || 1),
                  0,
                );

                return (
                  <div
                    key={inq.id}
                    onClick={() => navigate("inquiry-detail", inq.id)}
                    className="p-4 hover:bg-gray-50/60 active:bg-gray-100/60 transition-colors cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200 text-xs px-2 py-0.5 rounded-lg">
                        {displayId}
                      </span>
                      <StatusBadge status={inq.status} />
                    </div>

                    <div className="flex items-start gap-2">
                      <Car className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {inq.vehicle?.year ? `${inq.vehicle.year} ` : ""}
                          {inq.vehicle?.make} {inq.vehicle?.model}
                        </p>
                        <p className="text-xs text-gray-500">
                          {inq.parts?.length || 0}{" "}
                          {inq.parts?.length === 1 ? "Part" : "Parts"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatInquiryDate(inq.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        {totalPrice > 0 ? (
                          <span className="font-mono font-bold text-gray-900">
                            ₹{totalPrice.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                            Pending
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
