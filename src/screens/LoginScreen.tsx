import React, { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { adminSignIn } from '../services/adminService';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function LoginScreen({ showToast }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }
    setLoading(true);
    try {
      await adminSignIn(email, password);
      showToast('Welcome back, Admin!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f1214]">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          <img src="/logo.png" alt="Spare Will" className="h-20 w-auto" />
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-3">Admin Panel</h1>
            <p className="text-white/50 text-lg leading-relaxed max-w-sm">
              Manage inquiries, track customers, and streamline your automotive service workflow.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-2">
            {[
              { label: 'Inquiries', desc: 'Manage all' },
              { label: 'Customers', desc: 'Full directory' },
              { label: 'WhatsApp', desc: 'Instant quotes' },
              { label: 'Real-time', desc: 'Live updates' },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-orange-400 font-bold text-sm">{label}</p>
                <p className="text-white/40 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right / Mobile login panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-[var(--bg)]">
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Logo & Header */}
          <img src="/logo.png" alt="Spare Will" className="h-16 w-auto mb-6" />
          <h2 className="text-[22px] font-bold text-[var(--dark)] mb-2">Admin Access</h2>
          <p className="text-[#43474c] text-[13px] text-center mb-8 px-4">
            Secure authentication required for dashboard access.
          </p>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="w-full space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-[#43474c] mb-1.5 ml-1">
                  Admin Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@sparewill.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--dark)] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    autoComplete="email"
                    autoCapitalize="none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
                  <label className="block text-[11px] font-semibold text-[#43474c]">
                    Password
                  </label>
                  <button type="button" className="text-[11px] font-medium text-orange-500 hover:underline">
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--dark)] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[var(--dark)] p-1"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--orange)] hover:bg-[#ea6c0a] active:bg-[#d95c00] text-white font-medium py-3 rounded-xl flex items-center justify-center transition-all disabled:opacity-60 tap-scale mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-1.5 text-[#94a3b8]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
              <span className="text-[11px] font-medium">Encrypted Connection</span>
            </div>
        </div>
      </div>
    </div>
  );
}
