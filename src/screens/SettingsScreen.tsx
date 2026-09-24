import React, { useState, useEffect } from 'react';
import { Save, Phone, MessageCircle, Building, Mail, AlignLeft, LogOut } from 'lucide-react';
import { useAdmin } from '../App';
import { BusinessSettings } from '../types';
import { getBusinessSettings, saveBusinessSettings } from '../services/adminService';
import { adminSignOut } from '../services/adminService';

export default function SettingsScreen() {
  const { currentUser, showToast } = useAdmin();
  const [settings, setSettings] = useState<BusinessSettings>({
    businessName: 'Spare Will',
    businessEmail: '',
    callingNumber: '',
    whatsappNumber: '',
    defaultGreeting: 'Hello {name},\nRegarding your Spare Will inquiry {id}:',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBusinessSettings().then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBusinessSettings(settings);
      showToast('Settings saved!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await adminSignOut();
    showToast('Signed out', 'info');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fieldClass = "w-full px-4 py-3 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] text-[#181c1e] text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all";
  const labelClass = "flex items-center gap-1.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5";

  return (
    <div className="px-5 pt-5 pb-24 w-full relative">
      {/* Header */}
      <div className="flex lg:hidden items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Spare Will" className="h-6 w-auto" />
          <span className="font-bold text-[var(--dark)] text-lg tracking-tight">Spare Will</span>
        </div>
      </div>
      <div className="bg-white rounded-3xl border border-[var(--border)] shadow-sm p-5 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-[var(--dark)]">Contact Settings</h2>
          <button className="text-[var(--orange)] p-1 hover:bg-orange-50 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
        </div>
        <p className="text-[12px] text-[#64748b] mb-6 leading-relaxed">
          Update the primary contact information displayed to your customers.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--dark)] mb-1.5 ml-1">Business Name</label>
            <input
              value={settings.businessName}
              onChange={e => setSettings(s => ({ ...s, businessName: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-2xl text-[13px] text-[var(--dark)] font-medium focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--dark)] mb-1.5 ml-1">Business Email</label>
            <input
              type="email"
              value={settings.businessEmail}
              onChange={e => setSettings(s => ({ ...s, businessEmail: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-2xl text-[13px] text-[var(--dark)] font-medium focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--dark)] mb-1.5 ml-1">Business Calling Number</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <Phone className="w-4 h-4" />
              </div>
              <input
                value={settings.callingNumber}
                onChange={e => setSettings(s => ({ ...s, callingNumber: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--border)] rounded-2xl text-[13px] text-[var(--dark)] font-medium focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-colors"
              />
            </div>
            <p className="text-[10px] text-[#94a3b8] mt-1.5 ml-1">Customers will use this to call your shop directly.</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--dark)] mb-1.5 ml-1">Business WhatsApp Number</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <MessageCircle className="w-4 h-4" />
              </div>
              <input
                value={settings.whatsappNumber}
                onChange={e => setSettings(s => ({ ...s, whatsappNumber: e.target.value }))}
                placeholder="+1 (555) 987-6543"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--border)] rounded-2xl text-[13px] text-[var(--dark)] font-medium focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-colors"
              />
            </div>
            <p className="text-[10px] text-[#94a3b8] mt-1.5 ml-1">Used for messaging and quick updates.</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--dark)] mb-1.5 ml-1">Default Greeting Message</label>
            <textarea
              value={settings.defaultGreeting}
              onChange={e => setSettings(s => ({ ...s, defaultGreeting: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-2xl text-[13px] text-[var(--dark)] font-medium focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-4 bg-[var(--orange)] hover:bg-[#ea6c0a] text-white rounded-2xl py-3.5 font-bold text-[14px] flex items-center justify-center transition-colors shadow-md tap-scale disabled:opacity-70"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-red-200 text-red-600 bg-white hover:bg-red-50 font-bold text-[13px] transition-colors tap-scale shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
