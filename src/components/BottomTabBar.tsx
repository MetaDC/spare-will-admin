import React from 'react';
import { LayoutDashboard, ListOrdered, Users, Settings, Package } from 'lucide-react';
import { AdminScreen } from '../App';

interface Props {
  currentScreen: AdminScreen;
  navigate: (screen: AdminScreen) => void;
  newCount: number;
}

const tabs = [
  { screen: 'dashboard' as AdminScreen, label: 'Dashboard', icon: LayoutDashboard },
  { screen: 'inquiries' as AdminScreen, label: 'Inquiries', icon: ListOrdered },
  { screen: 'inventory' as AdminScreen, label: 'Inventory', icon: Package },
  { screen: 'customers' as AdminScreen, label: 'Customers', icon: Users },
  { screen: 'settings' as AdminScreen, label: 'Settings', icon: Settings },
];

export default function BottomTabBar({ currentScreen, navigate, newCount }: Props) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[var(--border)] safe-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex justify-around items-center h-[72px] px-2">
        {tabs.map(({ screen, label, icon: Icon }) => {
          const isActive =
            currentScreen === screen ||
            (screen === 'inquiries' && currentScreen === 'inquiry-detail') ||
            (screen === 'customers' && currentScreen === 'customer-detail');
            
          return (
            <button
              key={screen}
              onClick={() => navigate(screen)}
              className="group flex flex-col items-center justify-center min-w-[64px] h-full transition-all tap-scale"
            >
              <div className={`relative flex items-center justify-center w-16 h-8 rounded-full mb-1 transition-colors
                ${isActive ? 'bg-[var(--orange-light)]' : 'bg-transparent group-hover:bg-gray-50'}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--orange)]' : 'text-[#64748b]'}`} strokeWidth={isActive ? 2.5 : 2} />
                {screen === 'inquiries' && newCount > 0 && (
                  <span className={`absolute -top-1 -right-1 text-[9px] font-bold px-1 py-px rounded-full min-w-[14px] text-center leading-tight
                    ${isActive ? 'bg-red-500 text-white border-2 border-[var(--orange-light)]' : 'bg-red-500 text-white border-2 border-white'}`}>
                    {newCount > 99 ? '99+' : newCount}
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-medium tracking-tight ${isActive ? 'text-[var(--dark)] font-bold' : 'text-[#64748b]'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
