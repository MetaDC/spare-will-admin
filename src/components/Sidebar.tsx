import React from 'react';
import { LayoutDashboard, ListOrdered, Users, Settings, LogOut, Package } from 'lucide-react';
import { AdminScreen, useAdmin } from '../App';
import { adminSignOut } from '../services/adminService';

interface Props {
  currentScreen: AdminScreen;
  navigate: (screen: AdminScreen) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  newCount: number;
}

const navItems = [
  { screen: 'dashboard' as AdminScreen, label: 'Dashboard', icon: LayoutDashboard },
  { screen: 'inquiries' as AdminScreen, label: 'Inquiries', icon: ListOrdered },
  { screen: 'inventory' as AdminScreen, label: 'Inventory', icon: Package },
  { screen: 'customers' as AdminScreen, label: 'Customers', icon: Users },
  { screen: 'settings' as AdminScreen, label: 'Settings', icon: Settings },
];

export default function Sidebar({ currentScreen, navigate, newCount }: Props) {
  const { showToast } = useAdmin();

  const handleSignOut = async () => {
    await adminSignOut();
    showToast('Signed out successfully', 'info');
  };

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-[#0f1214] text-white shrink-0">
      {/* Logo */}
      <div className="px-5 pt-8 pb-5 border-b border-white/10 flex justify-center">
        <img src="/logo-white.png" alt="Spare Will" className="h-8 w-auto" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ screen, label, icon: Icon }) => {
          const active =
            currentScreen === screen ||
            (screen === 'inquiries' && currentScreen === 'inquiry-detail') ||
            (screen === 'customers' && currentScreen === 'customer-detail');
          return (
            <button
              key={screen}
              onClick={() => navigate(screen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
                }`}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
              {screen === 'inquiries' && newCount > 0 && (
                <span className="ml-auto bg-white text-orange-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {newCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
