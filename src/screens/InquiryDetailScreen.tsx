import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Save,
  Package,
  Send,
  Car,
  User,
  Tag,
  Plus,
  Check,
  Copy,
  Clock,
  Wrench,
  Trash2,
  ExternalLink,
  Mail,
  AlertCircle,
  Sparkles,
  TrendingUp,
  FileText,
  DollarSign,
  ChevronDown,
  X,
} from "lucide-react";
import { useAdmin } from "../App";
import StatusBadge from "../components/StatusBadge";
import {
  Inquiry,
  InquiryStatus,
  PartItem,
  PartAvailability,
  PartType,
} from "../types";
import {
  updateInquiryStatus,
  updateInquiryParts,
  formatInquiryDate,
  subscribeToInquiryById,
} from "../services/adminService";
import { getPartBrands } from "../services/catalogService";
import { PartBrand } from "../models";

const STATUSES: InquiryStatus[] = [
  "New",
  "Reviewing",
  "Price Sent",
  "Completed",
  "Cancelled",
];

const AVAILABILITY_OPTIONS: PartAvailability[] = [
  "Available",
  "Not Available",
  "Alternative Available",
  "Need Confirmation",
];

const PART_TYPE_OPTIONS: PartType[] = ["Aftermarket", "Genuine", "New", "OEM"];

const PRESET_PART_TYPES = ["Aftermarket", "Genuine", "New", "OEM"];

export default function InquiryDetailScreen() {
  const {
    inquiries,
    activeInquiryId,
    goBack,
    showToast,
    setting,
    currentUser,
  } = useAdmin();

  const [detailInquiry, setDetailInquiry] = useState<Inquiry | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  useEffect(() => {
    if (!activeInquiryId) {
      setLoadingDoc(false);
      return;
    }
    const found = inquiries.find((i) => i.id === activeInquiryId);
    if (found) {
      setDetailInquiry(found);
      setLoadingDoc(false);
    }
    const unsub = subscribeToInquiryById(activeInquiryId, (inq) => {
      setDetailInquiry(inq);
      setLoadingDoc(false);
    });
    return () => unsub();
  }, [activeInquiryId]);

  const inquiry =
    detailInquiry || inquiries.find((i) => i.id === activeInquiryId);

  const [savingStatus, setSavingStatus] = useState<InquiryStatus | null>(null);
  const [savingParts, setSavingParts] = useState(false);
  const [localParts, setLocalParts] = useState<PartItem[] | null>(null);
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [catalogBrands, setCatalogBrands] = useState<PartBrand[]>([]);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedVin, setCopiedVin] = useState(false);
  const [customTypeInputs, setCustomTypeInputs] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    getPartBrands()
      .then((b) => setCatalogBrands(b.filter((x) => x.isActive !== false)))
      .catch((err) => console.warn("Failed to load part brands:", err));
  }, []);

  if (loadingDoc && !inquiry) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Loading inquiry details...</p>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 mx-auto mb-4 flex items-center justify-center">
          <FileText className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Inquiry not found</h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          This inquiry may have been archived or removed from the system.
        </p>
        <button
          onClick={goBack}
          className="mt-5 px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
        >
          ← Return to Inquiries
        </button>
      </div>
    );
  }

  const parts: PartItem[] = localParts ?? inquiry.parts;

  const handleCopy = (text: string, type: "id" | "vin") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      showToast("Inquiry ID copied", "info");
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedVin(true);
      showToast("VIN copied", "info");
      setTimeout(() => setCopiedVin(false), 2000);
    }
  };

  const handleStatusChange = async (newStatus: InquiryStatus) => {
    if (inquiry.status === newStatus) return;
    setSavingStatus(newStatus);
    try {
      const adminActor = {
        uid: currentUser?.uid || "admin",
        displayName: currentUser?.displayName || currentUser?.email || "Admin",
        email: currentUser?.email || undefined,
      };
      await updateInquiryStatus(
        inquiry.id,
        newStatus,
        inquiry.statusHistory,
        adminActor,
      );
      showToast(`Status changed to "${newStatus}"`, "success");
    } catch (e: any) {
      showToast(e.message || "Failed to update status", "error");
    } finally {
      setSavingStatus(null);
    }
  };

  const updatePart = (idx: number, field: keyof PartItem, value: any) => {
    const updated = parts.map((p, i) =>
      i === idx ? { ...p, [field]: value } : p,
    );
    setLocalParts(updated);
  };

  const handleSelectBrand = (idx: number, brandName: string) => {
    const matched = catalogBrands.find(
      (b) => b.name.toLowerCase() === brandName.toLowerCase(),
    );
    const updated = parts.map((p, i) => {
      if (i !== idx) return p;
      return {
        ...p,
        brandId: matched?.id || "",
        brandName: brandName,
      };
    });
    setLocalParts(updated);
  };

  const handleAddCustomPart = () => {
    const name = newPartName.trim();
    if (!name) return;
    const newPart: PartItem = {
      id: "part_" + Date.now() + Math.random().toString(36).substring(2, 5),
      name,
      quantity: 1,
      availability: "Available",
    };
    setLocalParts([...parts, newPart]);
    setNewPartName("");
    setShowAddPart(false);
  };

  const handleRemovePart = (idx: number) => {
    const updated = parts.filter((_, i) => i !== idx);
    setLocalParts(updated);
    showToast("Part removed from quotation", "info");
  };

  const handleTogglePartType = (idx: number, typeName: string) => {
    const updated = parts.map((p, i) => {
      if (i !== idx) return p;
      const currentTypes = p.partTypes || [];
      const currentPrices = { ...(p.partTypePrices || {}) };
      let newTypes: string[];

      if (currentTypes.includes(typeName)) {
        newTypes = currentTypes.filter((t) => t !== typeName);
        delete currentPrices[typeName];
      } else {
        newTypes = [...currentTypes, typeName];
        if (currentPrices[typeName] === undefined) {
          currentPrices[typeName] = 0;
        }
      }

      return {
        ...p,
        partTypes: newTypes,
        partTypePrices: currentPrices,
      };
    });
    setLocalParts(updated);
  };

  const handleAddCustomType = (idx: number) => {
    const customName = (customTypeInputs[idx] || "").trim();
    if (!customName) return;

    const part = parts[idx];
    const currentTypes = part?.partTypes || [];
    if (
      currentTypes.some((t) => t.toLowerCase() === customName.toLowerCase())
    ) {
      showToast(`Type "${customName}" already added`, "info");
      setCustomTypeInputs((prev) => ({ ...prev, [idx]: "" }));
      return;
    }

    const updated = parts.map((p, i) => {
      if (i !== idx) return p;
      const newTypes = [...(p.partTypes || []), customName];
      const newPrices = { ...(p.partTypePrices || {}), [customName]: 0 };
      return {
        ...p,
        partTypes: newTypes,
        partTypePrices: newPrices,
      };
    });
    setLocalParts(updated);
    setCustomTypeInputs((prev) => ({ ...prev, [idx]: "" }));
  };

  const handleUpdateTypePrice = (
    idx: number,
    typeName: string,
    price: number,
  ) => {
    const updated = parts.map((p, i) => {
      if (i !== idx) return p;
      return {
        ...p,
        partTypePrices: {
          ...(p.partTypePrices || {}),
          [typeName]: price,
        },
      };
    });
    setLocalParts(updated);
  };

  const handleWhatsApp = () => {
    const clean = inquiry.contact.mobileNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${clean}`, "_blank");
  };

  const handleSaveOnly = async () => {
    setSavingParts(true);
    try {
      await updateInquiryParts(inquiry.id, parts);
      setLocalParts(null);
      showToast("Inquiry saved successfully", "success");
      if (inquiry.status === "New") {
        const adminActor = {
          uid: currentUser?.uid || "admin",
          displayName:
            currentUser?.displayName || currentUser?.email || "Admin",
          email: currentUser?.email || undefined,
        };
        await updateInquiryStatus(
          inquiry.id,
          "Reviewing",
          inquiry.statusHistory,
          adminActor,
        );
      }
    } catch (e: any) {
      showToast(e.message || "Failed to update inquiry", "error");
    } finally {
      setSavingParts(false);
    }
  };

  const getPartPrimaryPrice = (p: PartItem): number => {
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

  const handleWhatsAppQuote = async () => {
    const pricedParts = parts.filter(isPartPriced);
    if (pricedParts.length === 0) {
      showToast(
        "Please specify a price for at least one part before generating a quote",
        "error",
      );
      return;
    }

    if (localParts) {
      setSavingParts(true);
      try {
        await updateInquiryParts(inquiry.id, localParts);
        setLocalParts(null);
      } catch (e: any) {
        showToast(e.message || "Failed to save parts", "error");
        setSavingParts(false);
        return;
      }
      setSavingParts(false);
    }

    if (inquiry.status !== "Price Sent") {
      setSavingStatus("Price Sent");
      try {
        const adminActor = {
          uid: currentUser?.uid || "admin",
          displayName:
            currentUser?.displayName || currentUser?.email || "Admin",
          email: currentUser?.email || undefined,
        };
        await updateInquiryStatus(
          inquiry.id,
          "Price Sent",
          inquiry.statusHistory,
          adminActor,
          "Quotation sent via WhatsApp",
        );
      } catch (e: any) {
        showToast(e.message || "Failed to update status", "error");
      }
      setSavingStatus(null);
    }

    const vehTitle = [
      inquiry.vehicle.year,
      inquiry.vehicle.make,
      inquiry.vehicle.model,
      inquiry.vehicle.variantName,
    ]
      .filter(Boolean)
      .join(" ");

    const bName = setting?.businessName || "Spare Will";
    const displayId =
      inquiry.inquireId || inquiry.InquireID
        ? (inquiry.inquireId || inquiry.InquireID)!
        : inquiry.id.startsWith("#")
          ? inquiry.id
          : `#${inquiry.id}`;

    let greeting = "";
    if (setting?.defaultGreetingMsg) {
      greeting = setting.defaultGreetingMsg
        .replace("{name}", inquiry.contact.fullName)
        .replace("{id}", `*${displayId}*`)
        .replace("{vehicle}", `*${vehTitle}*`);
      if (!greeting.endsWith("\n\n")) {
        greeting += "\n\n";
      }
    } else {
      greeting = `Hello ${inquiry.contact.fullName},\nRegarding your ${bName} inquiry *${displayId}* for *${vehTitle}*:\n\n`;
    }

    const partsMsg = pricedParts
      .map((p, idx) => {
        let line = `${idx + 1}. *${p.name}* (Qty: ${p.quantity})`;
        const details = [];
        if (p.brandName) details.push(`Brand: *${p.brandName}*`);
        if (p.availability) details.push(`Status: ${p.availability}`);
        if (details.length > 0) {
          line += `\n   ${details.join(" | ")}`;
        }

        // Output all selected part types and their respective quoted prices
        if (p.partTypes && p.partTypes.length > 0) {
          const typeLines = p.partTypes
            .map((type) => {
              const price = p.partTypePrices?.[type];
              return price && price > 0
                ? `   • ${type}: *₹${price.toLocaleString()}*`
                : `   • ${type}: *(Price on request)*`;
            })
            .join("\n");
          line += `\n${typeLines}`;
        } else if (p.price && p.price > 0) {
          line += `\n   • Price: *₹${p.price.toLocaleString()}*`;
        }

        if (p.adminNote) {
          line += `\n   Note: _${p.adminNote}_`;
        }
        return line;
      })
      .join("\n\n");

    const totalLine = `\n\n*Total Estimated Quote:* ₹${totalPrice.toLocaleString()}`;
    const footer = `\n\nPlease let us know if you would like to proceed with this order.\n\nThank you,\n*${bName}*`;
    const msg = encodeURIComponent(greeting + partsMsg + totalLine + footer);
    const clean = inquiry.contact.mobileNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
  };

  const totalPrice = parts.reduce(
    (sum, p) => sum + getPartPrimaryPrice(p) * (p.quantity || 1),
    0,
  );
  const totalCost = parts.reduce(
    (sum, p) => sum + (p.costPrice || 0) * (p.quantity || 1),
    0,
  );
  const totalProfit = totalPrice - totalCost;

  const displayId =
    inquiry.inquireId ||
    inquiry.InquireID ||
    (inquiry.id.startsWith("#") ? inquiry.id : `#${inquiry.id}`);

  const getCustomerInitials = (name: string) => {
    const p = name.trim().split(" ");
    if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase() || "CU";
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col pb-36">
      {/* Sticky Top Action Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              title="Return to Inquiries"
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-orange-600 bg-orange-50 border border-orange-200 text-xs sm:text-sm px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {displayId}
                </span>

                <button
                  type="button"
                  onClick={() => handleCopy(displayId, "id")}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                  title="Copy Inquire ID"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <span className="text-xs text-slate-400 hidden sm:inline">
                  • {formatInquiryDate(inquiry.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick status dropdown + Save draft indicator */}
          <div className="flex items-center gap-2.5">
            {localParts && (
              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg animate-pulse hidden sm:inline">
                Unsaved changes
              </span>
            )}

            <div className="relative flex items-center">
              {savingStatus !== null && (
                <div className="absolute -left-5 w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              )}
              <select
                value={inquiry.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as InquiryStatus)
                }
                disabled={savingStatus !== null}
                className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none text-slate-800 shadow-2xs focus:border-orange-500 cursor-pointer disabled:opacity-50"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="px-4 sm:px-8 pt-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Customer & Vehicle 2-Column Command Center */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Customer Profile */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Customer Details
                </span>
                <StatusBadge status={inquiry.status} size="sm" />
              </div>

              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {getCustomerInitials(inquiry.contact.fullName)}
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                    {inquiry.contact.fullName}
                  </h2>
                  <p className="text-xs sm:text-sm font-mono text-slate-600 mt-0.5">
                    {inquiry.contact.mobileNumber}
                  </p>
                  {inquiry.contact.email && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {inquiry.contact.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Contact Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open(`tel:${inquiry.contact.mobileNumber}`, "_self")
                }
                className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Phone className="w-4 h-4" />
                Direct Call
              </button>
            </div>
          </div>

          {/* Card 2: Vehicle Specs */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-orange-500" />
                  Vehicle Specification
                </span>
                {inquiry.vehicle.vin && (
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                    <span className="font-mono text-[10px] text-slate-500">
                      VIN: {inquiry.vehicle.vin}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(inquiry.vehicle.vin || "", "vin")
                      }
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {copiedVin ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3.5 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 font-bold flex items-center justify-center shrink-0">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                    {inquiry.vehicle.year ? `${inquiry.vehicle.year} ` : ""}
                    {inquiry.vehicle.make} {inquiry.vehicle.model}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {inquiry.vehicle.variantName ||
                      "Standard Trim Specification"}
                  </p>
                </div>
              </div>

              {/* Specs Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {inquiry.vehicle.engine && (
                  <span className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/80">
                    Engine: <strong>{inquiry.vehicle.engine}</strong>
                  </span>
                )}
                {inquiry.vehicle.transmission && (
                  <span className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/80">
                    Trans: <strong>{inquiry.vehicle.transmission}</strong>
                  </span>
                )}
                {inquiry.vehicle.fuelType && (
                  <span className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/80">
                    Fuel: <strong>{inquiry.vehicle.fuelType}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 mt-2">
              Automated compatibility check based on OEM vehicle parameters.
            </div>
          </div>
        </div>

        {/* Customer Notes (if provided) */}
        {inquiry.additionalNotes && (
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-3xl p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider mb-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Customer Notes / Instructions
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed italic">
              "{inquiry.additionalNotes}"
            </p>
          </div>
        )}

        {/* Requested Parts & Quotation Editor Workspace */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                Requested Parts & Quotation Workspace
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set brand availability, OEM numbers, cost prices, and quotation
                prices.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                {parts.length} {parts.length === 1 ? "Item" : "Items"}
              </span>
              <button
                type="button"
                onClick={() => setShowAddPart(true)}
                className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Part
              </button>
            </div>
          </div>

          {/* Parts Card List */}
          <div className="space-y-4">
            {parts.map((part, idx) => {
              const prices: number[] = part.partTypePrices
                ? Object.values(part.partTypePrices)
                    .map((v) => Number(v))
                    .filter((v) => !isNaN(v) && v > 0)
                : [];
              const unitPrice =
                prices.length > 0 ? Math.min(...prices) : part.price || 0;
              const unitCost = part.costPrice || 0;
              const qty = part.quantity || 1;
              const lineTotal = unitPrice * qty;
              const lineProfit = (unitPrice - unitCost) * qty;

              return (
                <div
                  key={part.id || idx}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4 relative group"
                >
                  {/* Top Bar: Part Name, Category, Availability & Delete */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                          {part.name}
                        </h3>
                        {part.categoryName && (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">
                            {part.categoryName}
                          </span>
                        )}
                        {part.partTypes && part.partTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {part.partTypes.map((t) => (
                              <span
                                key={t}
                                className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md inline-block"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {part.spec && part.spec !== part.categoryName && (
                          <span className="text-[11px] text-slate-500 ml-2">
                            • {part.spec}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {/* Availability Selector */}
                      <select
                        value={part.availability || "Available"}
                        onChange={(e) =>
                          updatePart(
                            idx,
                            "availability",
                            e.target.value as PartAvailability,
                          )
                        }
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer shadow-2xs transition-all ${
                          part.availability === "Available"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : part.availability === "Not Available"
                              ? "bg-rose-50 border-rose-200 text-rose-700"
                              : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}
                      >
                        {AVAILABILITY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>

                      {/* Remove Part Button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePart(idx)}
                        title="Remove part"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Brand & OEM / Part Number Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Brand / Manufacturer
                      </label>
                      <input
                        type="text"
                        list={`brands-list-${idx}`}
                        value={part.brandName || ""}
                        onChange={(e) => handleSelectBrand(idx, e.target.value)}
                        placeholder="e.g. Bosch, Brembo, OE Genuine..."
                        className="w-full px-3 py-2 bg-slate-50/70 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                      />
                      <datalist id={`brands-list-${idx}`}>
                        {catalogBrands.map((b) => (
                          <option key={b.id} value={b.name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Part Number / OEM Code
                      </label>
                      <input
                        type="text"
                        value={part.partNumber || ""}
                        onChange={(e) =>
                          updatePart(idx, "partNumber", e.target.value)
                        }
                        placeholder="e.g. 0986AB1234"
                        className="w-full px-3 py-2 bg-slate-50/70 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Internal Cost & Quantity Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Unit Cost (₹){" "}
                        <span className="text-[10px] lowercase font-normal">
                          (internal)
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={part.costPrice || ""}
                          onChange={(e) =>
                            updatePart(
                              idx,
                              "costPrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 bg-slate-50/70 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={part.quantity || 1}
                        onChange={(e) =>
                          updatePart(
                            idx,
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-50/70 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Part Types Selector */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Part Types
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Preset options */}
                      {PRESET_PART_TYPES.map((type) => {
                        const isSelected = part.partTypes?.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleTogglePartType(idx, type)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-orange-500 border-orange-500 text-white shadow-2xs"
                                : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-orange-300 hover:text-orange-600"
                            }`}
                          >
                            {isSelected ? `✓ ${type}` : `+ ${type}`}
                          </button>
                        );
                      })}

                      {/* Any custom added types that aren't in PRESET_PART_TYPES */}
                      {(part.partTypes || [])
                        .filter((t) => !PRESET_PART_TYPES.includes(t))
                        .map((customType) => (
                          <span
                            key={customType}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-600 border border-orange-600 text-white shadow-2xs"
                          >
                            ✓ {customType}
                            <button
                              type="button"
                              onClick={() =>
                                handleTogglePartType(idx, customType)
                              }
                              className="text-orange-200 hover:text-white cursor-pointer"
                              title="Remove type"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                      {/* Inline Custom Type Adder */}
                      <div className="inline-flex items-center gap-1 bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                        <input
                          type="text"
                          placeholder="Add custom type..."
                          value={customTypeInputs[idx] || ""}
                          onChange={(e) =>
                            setCustomTypeInputs((prev) => ({
                              ...prev,
                              [idx]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomType(idx);
                            }
                          }}
                          className="text-xs text-slate-800 placeholder-slate-400 outline-none w-28 sm:w-36 bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCustomType(idx)}
                          disabled={!customTypeInputs[idx]?.trim()}
                          className="p-0.5 text-orange-600 hover:text-orange-700 disabled:opacity-30 cursor-pointer"
                          title="Add Custom Type"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Customer Quote Prices for each selected Part Type (under that field, simple like other fields, not a container) */}
                  {part.partTypes && part.partTypes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                      {part.partTypes.map((type) => (
                        <div key={type}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                              {type} Quote (₹) *
                            </label>
                            <button
                              type="button"
                              onClick={() => handleTogglePartType(idx, type)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer transition-colors"
                              title={`Remove ${type}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              ₹
                            </span>
                            <input
                              type="number"
                              value={part.partTypePrices?.[type] ?? ""}
                              onChange={(e) =>
                                handleUpdateTypePrice(
                                  idx,
                                  type,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-2 bg-slate-50/70 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Calculated Subtotal & Unit Margin Summary */}
                  {Boolean(unitPrice > 0) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Line Total:</span>
                        <strong className="text-slate-900 font-mono text-sm">
                          ₹{lineTotal.toLocaleString()}
                        </strong>
                      </div>

                      {Boolean(unitCost > 0 && unitPrice > unitCost) && (
                        <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>
                            Profit: +₹{lineProfit.toLocaleString()} (+
                            {Math.round(
                              ((unitPrice - unitCost) / unitCost) * 100,
                            )}
                            %)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Quotation Note for customer */}
                  <div>
                    <input
                      type="text"
                      value={part.adminNote || ""}
                      onChange={(e) =>
                        updatePart(idx, "adminNote", e.target.value)
                      }
                      placeholder="Quotation note for customer (e.g. Original OE, 6 months warranty, ready in stock)..."
                      className="w-full px-3 py-2 bg-slate-50/60 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                    />
                  </div>
                </div>
              );
            })}

            {/* Add Custom Part Form */}
            {showAddPart ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-orange-300 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-wider">
                  <Plus className="w-4 h-4" />
                  Add Custom Part to Quotation
                </div>
                <input
                  type="text"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomPart()}
                  placeholder="Part name (e.g. Front Disc Brake Pad, Engine Mount)..."
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddCustomPart}
                    disabled={!newPartName.trim()}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                  >
                    Add Part to Quotation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPart(false);
                      setNewPartName("");
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddPart(true)}
                className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-orange-400 bg-white hover:bg-orange-50/20 rounded-3xl text-xs sm:text-sm font-bold text-slate-600 hover:text-orange-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                Add Another Part to Inquiry
              </button>
            )}
          </div>
        </div>

        {/* Pricing & Financial Overview Card */}
        {totalPrice > 0 && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-orange-400" />
                Quotation Financial Summary
              </div>
              <span className="text-xs font-mono font-bold bg-white/10 px-2.5 py-1 rounded-lg text-slate-200">
                {parts.filter((p) => p.price && p.price > 0).length} of{" "}
                {parts.length} parts priced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
              <div>
                <span className="text-xs text-slate-400">
                  Total Customer Quote:
                </span>
                <p className="text-2xl sm:text-3xl font-black text-orange-400 font-mono mt-0.5">
                  ₹{totalPrice.toLocaleString()}
                </p>
              </div>

              {totalCost > 0 && (
                <div>
                  <span className="text-xs text-slate-400">
                    Sourcing Cost (Est.):
                  </span>
                  <p className="text-xl sm:text-2xl font-bold text-slate-300 font-mono mt-0.5">
                    ₹{totalCost.toLocaleString()}
                  </p>
                </div>
              )}

              {totalProfit > 0 && (
                <div>
                  <span className="text-xs text-slate-400">
                    Projected Margin:
                  </span>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono mt-0.5">
                    +₹{totalProfit.toLocaleString()}{" "}
                    <span className="text-xs font-normal">
                      (+{Math.round((totalProfit / totalCost) * 100)}%)
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Status History Audit Trail */}
        {inquiry.statusHistory && inquiry.statusHistory.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Workflow Audit Trail
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {inquiry.statusHistory.length}{" "}
                {inquiry.statusHistory.length === 1 ? "event" : "events"}{" "}
                recorded
              </span>
            </div>

            <div className="relative pl-6 border-l-2 border-slate-200 ml-2 space-y-5 py-1">
              {inquiry.statusHistory.map((entry, idx) => {
                const isLatest = idx === inquiry.statusHistory.length - 1;
                return (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                        isLatest
                          ? entry.status === "Completed"
                            ? "bg-emerald-500"
                            : entry.status === "Cancelled"
                              ? "bg-rose-500"
                              : "bg-orange-500"
                          : "bg-slate-400"
                      }`}
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {entry.status}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.2 rounded-full">
                            Current Status
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatInquiryDate(entry.createdAt)}
                      </span>
                    </div>
                    {entry.description && (
                      <p className="text-xs text-slate-600 mt-1">
                        {entry.description}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Updated by:{" "}
                      <span className="font-semibold text-slate-600">
                        {entry.createdByName || "System"}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Action Bar (Dual Buttons) */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-3.5 px-4 sm:px-8 z-30 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quote info summary on left */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Quotation
              </span>
              <strong className="text-lg font-black text-slate-900 font-mono">
                {totalPrice > 0
                  ? `₹${totalPrice.toLocaleString()}`
                  : "Pricing pending"}
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Save Inquiry Button */}
            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={savingParts}
              className="flex-1 sm:flex-none px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-2xs hover:border-slate-400 disabled:opacity-50 cursor-pointer"
            >
              {savingParts ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-slate-700" />
                  <span>Save Inquiry</span>
                </>
              )}
            </button>

            {/* WhatsApp Quote Button */}
            <button
              type="button"
              onClick={handleWhatsAppQuote}
              disabled={savingStatus !== null || savingParts}
              className="flex-1 sm:flex-none px-7 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {savingStatus !== null ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating Status...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>WhatsApp Quote</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
