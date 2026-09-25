import React, { useState, useEffect } from 'react';
import {
  Save,
  Phone,
  MessageCircle,
  Building,
  Mail,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useAdmin } from '../App';
import { Setting } from '../models';
import {
  getSetting,
  saveSetting,
  adminSignOut,
  SETTING_DOC_ID,
} from '../services/adminService';

export default function SettingsScreen() {
  const { showToast } = useAdmin();
  const [settings, setSettings] = useState<Setting>({
    id: SETTING_DOC_ID,
    businessName: 'Spare Will',
    businessEmail: '',
    businessCallingNumber: '',
    whatsappNumber: '',
    defaultGreetingMsg: 'Hello {name},\nRegarding your Spare Will inquiry {id}:',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    getSetting()
      .then((s) => {
        setSettings({
          id: s.id || SETTING_DOC_ID,
          businessName: s.businessName || '',
          businessEmail: s.businessEmail || '',
          businessCallingNumber: s.businessCallingNumber || s.callingNumber || '',
          whatsappNumber: s.whatsappNumber || '',
          defaultGreetingMsg: s.defaultGreetingMsg || s.defaultGreeting || '',
        });
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to load settings:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await saveSetting({
        ...settings,
        id: SETTING_DOC_ID,
      });
      setSavedSuccess(true);
      showToast('Settings saved successfully!', 'success');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await adminSignOut();
    showToast('Signed out', 'info');
  };

  const insertVariable = (varName: string) => {
    setSettings((prev) => ({
      ...prev,
      defaultGreetingMsg: (prev.defaultGreetingMsg || '') + ` ${varName}`,
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium tracking-wide">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 pt-6 pb-28 max-w-4xl mx-auto w-full">
      {/* Header bar */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Manage your business profile, contact details, and messaging templates.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main Settings Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 md:p-8">
          <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-orange-500" />
                Business &amp; Contact Details
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Update the contact and messaging information used across the platform.
              </p>
            </div>
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Business Name <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={settings.businessName}
                  onChange={(e) => setSettings((s) => ({ ...s, businessName: e.target.value }))}
                  placeholder="Spare Will"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Business Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Business Email <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={settings.businessEmail}
                  onChange={(e) => setSettings((s) => ({ ...s, businessEmail: e.target.value }))}
                  placeholder="contact@sparewill.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Business Calling Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Business Calling Number <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={settings.businessCallingNumber}
                  onChange={(e) => setSettings((s) => ({ ...s, businessCallingNumber: e.target.value, callingNumber: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Business WhatsApp Number <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings((s) => ({ ...s, whatsappNumber: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Default Greeting Message Section */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Default Greeting Message <span className="text-orange-500">*</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Insert variables:</span>
                <button
                  type="button"
                  onClick={() => insertVariable('{name}')}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer"
                >
                  {'{name}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{id}')}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer"
                >
                  {'{id}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{vehicle}')}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer"
                >
                  {'{vehicle}'}
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              required
              value={settings.defaultGreetingMsg}
              onChange={(e) => setSettings((s) => ({ ...s, defaultGreetingMsg: e.target.value, defaultGreeting: e.target.value }))}
              placeholder="Hello {name},\nRegarding your inquiry {id}:"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all font-mono leading-relaxed"
            />
          </div>

          {/* Action Button */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all disabled:opacity-70 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Sign Out Section */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white hover:bg-red-50 font-semibold text-xs transition-colors shadow-xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
