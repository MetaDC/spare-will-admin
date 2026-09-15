import React, { useState, useEffect, createContext, useContext } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuth, subscribeToAllInquiries, isAdminEmail } from './services/adminService';
import { Inquiry } from './types';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import InquiriesScreen from './screens/InquiriesScreen';
import InquiryDetailScreen from './screens/InquiryDetailScreen';
import CustomersScreen from './screens/CustomersScreen';
import CustomerDetailScreen from './screens/CustomerDetailScreen';
import SettingsScreen from './screens/SettingsScreen';
import Sidebar from './components/Sidebar';
import BottomTabBar from './components/BottomTabBar';
import Toast from './components/Toast';

import InventoryScreen from './screens/InventoryScreen';

export type AdminScreen = 'dashboard' | 'inquiries' | 'inquiry-detail' | 'inventory' | 'customers' | 'customer-detail' | 'settings';

interface ToastMsg { message: string; type: 'success' | 'error' | 'info'; }

interface AdminContextType {
  currentUser: FirebaseUser | null;
  inquiries: Inquiry[];
  activeInquiryId: string | null;
  activeCustomerId: string | null;
  currentScreen: AdminScreen;
  navigate: (screen: AdminScreen, id?: string) => void;
  goBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const AdminContext = createContext<AdminContextType>({} as AdminContextType);
export const useAdmin = () => useContext(AdminContext);

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [currentScreen, setCurrentScreen] = useState<AdminScreen>('dashboard');
  const [screenHistory, setScreenHistory] = useState<AdminScreen[]>([]);
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user && isAdminEmail(user.email) ? user : null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToAllInquiries(setInquiries, console.warn);
    return () => unsub();
  }, [currentUser]);

  const navigate = (screen: AdminScreen, id?: string) => {
    setScreenHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screen);
    if (screen === 'inquiry-detail') setActiveInquiryId(id || null);
    if (screen === 'customer-detail') setActiveCustomerId(id || null);
    // Scroll to top on navigation
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.scrollTo({ top: 0 });
  };

  const goBack = () => {
    const prev = screenHistory[screenHistory.length - 1];
    if (prev) {
      setCurrentScreen(prev);
      setScreenHistory(h => h.slice(0, -1));
    } else {
      setCurrentScreen('dashboard');
    }
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.scrollTo({ top: 0 });
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1214]">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="Spare Will" className="h-12 w-auto" />
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginScreen showToast={showToast} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  const newCount = inquiries.filter(i => i.status === 'New').length;

  const ctxValue: AdminContextType = {
    currentUser, inquiries, activeInquiryId, activeCustomerId,
    currentScreen, navigate, goBack, showToast
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <DashboardScreen />;
      case 'inquiries': return <InquiriesScreen />;
      case 'inquiry-detail': return <InquiryDetailScreen />;
      case 'inventory': return <InventoryScreen />;
      case 'customers': return <CustomersScreen />;
      case 'customer-detail': return <CustomerDetailScreen />;
      case 'settings': return <SettingsScreen />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <AdminContext.Provider value={ctxValue}>
      <div className="flex h-screen bg-[#f4f6f9] overflow-hidden">
        {/* Sidebar — desktop only */}
        <Sidebar
          currentScreen={currentScreen}
          navigate={navigate}
          sidebarOpen={false}
          setSidebarOpen={() => { }}
          newCount={newCount}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            <div className="animate-fade-in">
              {renderScreen()}
            </div>
          </main>
        </div>

        {/* Bottom tab bar — mobile only */}
        <BottomTabBar currentScreen={currentScreen} navigate={navigate} newCount={newCount} />

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </AdminContext.Provider>
  );
}
