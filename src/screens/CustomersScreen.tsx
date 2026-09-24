import React, { useState, useEffect, useMemo } from 'react';
import { Search, MessageCircle, Phone, ChevronRight, Users } from 'lucide-react';
import { useAdmin } from '../App';
import { UserProfile } from '../types';
import { getAllCustomers } from '../services/adminService';

export default function CustomersScreen() {
  const { inquiries, navigate } = useAdmin();
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllCustomers().then(c => { setCustomers(c); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => {
    return customers.map(c => ({
      ...c,
      inquiryCount: inquiries.filter(i => i.userId === c.id).length,
    }));
  }, [customers, inquiries]);

  const filtered = useMemo(() => {
    if (!search) return enriched;
    const q = search.toLowerCase();
    return enriched.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  }, [enriched, search]);

  return (
    <div className="px-5 pt-5 pb-24 w-full relative">
      {/* Header */}
      <div className="flex lg:hidden items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Spare Will" className="h-6 w-auto" />
          <span className="font-bold text-[var(--dark)] text-lg tracking-tight">Spare Will</span>
        </div>

      </div>

      {/* Title */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-[var(--dark)] tracking-tight">Customers</h1>
        <p className="text-[#64748b] text-[13px] mt-0.5">Manage and search customer records.</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-10 pr-10 py-3 rounded-2xl border border-[var(--border)] bg-white text-[13px] text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-transparent transition-all shadow-sm"
        />
        <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[var(--dark)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--orange)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[var(--border)] py-16 text-center shadow-sm">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-[var(--dark)] text-sm">No customers found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => navigate('customer-detail', c.id)}
              className="bg-white rounded-3xl border border-[var(--border)] p-5 hover:shadow-md transition-all cursor-pointer shadow-sm flex flex-col gap-4"
            >
              {/* Top Row: Avatar & Name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-[var(--dark)] font-bold text-[15px]">
                      {c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--dark)] text-[15px]">{c.name}</p>
                    <p className="text-[11px] text-[#94a3b8] font-medium tracking-wide">ID: {c.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <button className="text-[#94a3b8] hover:text-[var(--dark)] p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
              </div>

              {/* Bottom Row: Phone & Inquiries */}
              <div className="flex items-center gap-4 text-[12px] font-medium text-[#64748b] ml-[58px]">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{c.phone}</span>
                </div>
                {(c as any).inquiryCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>{(c as any).inquiryCount} Inquiries</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
