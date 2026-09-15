import React, { useState, useMemo } from 'react';
import { Search, MessageCircle, Phone, ChevronRight, FileText, Car, User } from 'lucide-react';
import { useAdmin } from '../App';
import StatusBadge from '../components/StatusBadge';
import { InquiryStatus } from '../types';

const ALL_STATUSES: (InquiryStatus | 'All')[] = ['All', 'New', 'Reviewing', 'Price Sent', 'Customer Contacted', 'Completed', 'Closed', 'Cancelled'];

export default function InquiriesScreen() {
  const { inquiries, navigate } = useAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'All'>('All');

  const filtered = useMemo(() => {
    return inquiries.filter(inq => {
      const matchStatus = statusFilter === 'All' || inq.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        inq.id.toLowerCase().includes(q) ||
        inq.contact.fullName.toLowerCase().includes(q) ||
        inq.contact.mobileNumber.includes(q) ||
        inq.vehicle.make.toLowerCase().includes(q) ||
        inq.vehicle.model.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [inquiries, search, statusFilter]);

  const handleWhatsApp = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <div className="px-5 pt-5 pb-24 max-w-6xl mx-auto bg-[var(--bg)]">
      {/* Header */}
      <div className="flex lg:hidden items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Spare Will" className="h-6 w-auto" />
          <span className="font-bold text-[var(--dark)] text-lg tracking-tight">Spare Will</span>
        </div>

      </div>

      {/* Title */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-[var(--dark)] tracking-tight">Inquiries</h1>
        <p className="text-[#64748b] text-[13px] mt-0.5">Manage all incoming requests.</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ID, Customer, Vehicle..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[var(--border)] bg-white text-[13px] text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {/* Status chips */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {ALL_STATUSES.map(s => {
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 border
                ${isActive
                  ? 'bg-[var(--dark)] text-white border-[var(--dark)]'
                  : 'bg-white border-[var(--border)] text-[#43474c] hover:border-gray-300'
                }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[var(--border)] py-16 text-center shadow-sm">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-[var(--dark)] text-sm">No inquiries found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(inq => (
            <div
              key={inq.id}
              onClick={() => navigate('inquiry-detail', inq.id)}
              className="bg-white rounded-3xl border border-[var(--border)] p-5 hover:shadow-md transition-all cursor-pointer shadow-sm flex flex-col"
            >
              {/* Top row: ID + status */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-[#64748b] text-[10px] tracking-wide uppercase">{inq.id}</span>
                <StatusBadge status={inq.status} />
              </div>

              {/* Customer */}
              <h2 className="text-[17px] font-bold text-[var(--dark)] mb-2.5">
                {inq.contact.fullName}
              </h2>

              {/* Details */}
              <div className="space-y-2 mb-5">
                <div className="flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#94a3b8] mt-0.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                  <p className="text-[13px] text-[#43474c] font-medium leading-snug">
                    {inq.vehicle.year} {inq.vehicle.make} {inq.vehicle.model}
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#94a3b8] mt-0.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  <p className="text-[13px] text-[#43474c] leading-snug line-clamp-2">
                    {inq.parts.length > 0 ? inq.parts.map(p => p.name).join(', ') : 'No parts requested'}
                  </p>
                </div>
              </div>

              {/* Bottom row: time + action */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border)]">
                <span className="text-[11px] text-[#94a3b8] font-medium">
                  {/* Mock relative time based on status for now, or just use date */}
                  Sent {inq.date.split(',')[0]}
                </span>
                <button className={`flex items-center gap-1 px-4 py-1.5 rounded-full border text-[11px] font-bold transition-all
                  ${inq.status === 'Completed' || inq.status === 'Closed'
                    ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    : 'border-[var(--orange)] text-[var(--orange)] hover:bg-orange-50'
                  }`}
                >
                  {inq.status === 'Completed' || inq.status === 'Closed' ? 'Details' : 'Review'} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
