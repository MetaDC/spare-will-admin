import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ListOrdered,
  Users,
  Settings,
  LogOut,
  Package,
  Car,
  Wrench,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  ListFilter,
  Layers,
  Tag,
  FolderTree,
  GitBranch,
} from "lucide-react";
import { AdminScreen, useAdmin } from "../App";
import { adminSignOut } from "../services/adminService";

interface Props {
  currentScreen: AdminScreen;
  navigate: (screen: AdminScreen, id?: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  newCount: number;
}

export default function Sidebar({ currentScreen, navigate, newCount }: Props) {
  const { showToast } = useAdmin();

  // Accordion open/close states
  const [vehicleOpen, setVehicleOpen] = useState(
    [
      "vehicle-categories",
      "vehicle-brands",
      "vehicle-models",
      "vehicle-variants",
    ].includes(currentScreen),
  );
  const [partOpen, setPartOpen] = useState(
    ["part-categories", "part-subcategories", "part-brands"].includes(
      currentScreen,
    ),
  );
  const [productOpen, setProductOpen] = useState(
    [
      "products",
      "product-add",
      "product-edit",
      "product-view",
      "inventory",
    ].includes(currentScreen),
  );

  // Auto-expand accordion when navigating to a child screen
  useEffect(() => {
    if (
      [
        "vehicle-categories",
        "vehicle-brands",
        "vehicle-models",
        "vehicle-variants",
      ].includes(currentScreen)
    ) {
      setVehicleOpen(true);
    }
    if (
      ["part-categories", "part-subcategories", "part-brands"].includes(
        currentScreen,
      )
    ) {
      setPartOpen(true);
    }
    if (
      [
        "products",
        "product-add",
        "product-edit",
        "product-view",
        "inventory",
      ].includes(currentScreen)
    ) {
      setProductOpen(true);
    }
  }, [currentScreen]);

  const handleSignOut = async () => {
    await adminSignOut();
    showToast("Signed out successfully", "info");
  };

  const isVehicleActive = [
    "vehicle-categories",
    "vehicle-brands",
    "vehicle-models",
    "vehicle-variants",
  ].includes(currentScreen);
  const isPartActive = [
    "part-categories",
    "part-subcategories",
    "part-brands",
  ].includes(currentScreen);
  const isProductActive = [
    "products",
    "product-add",
    "product-edit",
    "product-view",
    "inventory",
  ].includes(currentScreen);

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#0f1214] text-white shrink-0 select-none h-screen min-h-screen">
      {/* Brand Header */}
      <div className="px-6 pt-7 pb-5 border-b border-white/10 flex items-center justify-between">
        <img src="/logo-white.png" alt="Spare Will" className="h-7 w-auto" />
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
          Admin
        </span>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {/* Dashboard */}
        <button
          onClick={() => navigate("dashboard")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            currentScreen === "dashboard"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
              : "text-white/60 hover:text-white hover:bg-white/8"
          }`}
        >
          <LayoutDashboard
            className="w-4 h-4 shrink-0"
            strokeWidth={currentScreen === "dashboard" ? 2.5 : 1.8}
          />
          <span>Dashboard</span>
        </button>

        {/* 1. VEHICLE MASTERS DROPDOWN */}
        <div className="pt-1">
          <button
            onClick={() => setVehicleOpen(!vehicleOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              isVehicleActive
                ? "text-orange-400 bg-white/5 font-semibold"
                : "text-white/70 hover:text-white hover:bg-white/8"
            }`}
          >
            <div className="flex items-center gap-3">
              <Car className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Vehicle Masters</span>
            </div>
            {vehicleOpen ? (
              <ChevronDown className="w-4 h-4 opacity-60" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-60" />
            )}
          </button>

          {vehicleOpen && (
            <div className="pl-6 pr-2 pt-1 pb-1 space-y-0.5 animate-fade-in border-l-2 border-orange-500/30 ml-4 my-1">
              <button
                onClick={() => navigate("vehicle-categories")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === "vehicle-categories"
                    ? "bg-orange-500 text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Vehicle Categories</span>
              </button>

              <button
                onClick={() => navigate("vehicle-brands")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === "vehicle-brands"
                    ? "bg-orange-500 text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Tag className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Vehicle Brands</span>
              </button>

              <button
                onClick={() => navigate("vehicle-models")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === "vehicle-models"
                    ? "bg-orange-500 text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Car className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Vehicle Models</span>
              </button>

              <button
                onClick={() => navigate("vehicle-variants")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === "vehicle-variants"
                    ? "bg-orange-500 text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Vehicle Variants</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. PART MASTERS DROPDOWN */}
        <div className="pt-1">
          <button
            onClick={() => setPartOpen(!partOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              isPartActive
                ? "text-orange-400 bg-white/5 font-semibold"
                : "text-white/70 hover:text-white hover:bg-white/8"
            }`}
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Part Masters</span>
            </div>
            {partOpen ? (
              <ChevronDown className="w-4 h-4 opacity-60" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-60" />
            )}
          </button>

          {partOpen && (
            <div className="pl-6 pr-2 pt-1 pb-1 space-y-0.5 animate-fade-in border-l-2 border-orange-500/30 ml-4 my-1">
              <button
                onClick={() => navigate("part-categories")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === "part-categories"
                    ? "bg-orange-500 text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <FolderTree className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Part Categories</span>
              </button>

              <button
                onClick={() => navigate("part-subcategories")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === "part-subcategories"
                    ? "bg-orange-500 text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Part Subcategories</span>
              </button>

              <button
                onClick={() => navigate("part-brands")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === "part-brands"
                    ? "bg-orange-500 text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Tag className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Part Brands</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. PRODUCTS / INVENTORY DROPDOWN */}
        <div className="pt-1">
          <button
            onClick={() => setProductOpen(!productOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              isProductActive
                ? "text-orange-400 bg-white/5 font-semibold"
                : "text-white/70 hover:text-white hover:bg-white/8"
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Inventory & Catalog</span>
            </div>
            {productOpen ? (
              <ChevronDown className="w-4 h-4 opacity-60" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-60" />
            )}
          </button>

          {productOpen && (
            <div className="pl-6 pr-2 pt-1 pb-1 space-y-0.5 animate-fade-in border-l-2 border-orange-500/30 ml-4 my-1">
              <button
                onClick={() => navigate("products")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === "products" ||
                  currentScreen === "inventory" ||
                  currentScreen === "product-view"
                    ? "bg-orange-500 text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>All Products</span>
              </button>

              <button
                onClick={() => navigate("product-add")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === "product-add"
                    ? "bg-orange-500 text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Add Product</span>
              </button>
            </div>
          )}
        </div>

        {/* Existing Inquiries */}
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={() => navigate("inquiries")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              currentScreen === "inquiries" ||
              currentScreen === "inquiry-detail"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "text-white/60 hover:text-white hover:bg-white/8"
            }`}
          >
            <ListOrdered className="w-4 h-4 shrink-0" />
            <span>Inquiries</span>
            {newCount > 0 && (
              <span className="ml-auto bg-white text-orange-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {newCount}
              </span>
            )}
          </button>
        </div>

        {/* Existing Customers */}
        <button
          onClick={() => navigate("customers")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            currentScreen === "customers" || currentScreen === "customer-detail"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
              : "text-white/60 hover:text-white hover:bg-white/8"
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Customers</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate("settings")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            currentScreen === "settings"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
              : "text-white/60 hover:text-white hover:bg-white/8"
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </button>
      </nav>

      {/* User Footer / Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
