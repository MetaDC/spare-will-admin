import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Phone, ChevronRight } from 'lucide-react';
import { useAdmin } from '../App';
import { UserProfile, Inquiry } from '../types';
import { getAllCustomers, getCustomerInquiries } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';

export default function CustomerDetailScreen() {
  const { activeCustomerId, goBack, navigate } = useAdmin();
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [custInquiries, setCustInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCustomerId) return;
    Promise.all([
      getAllCustomers(),
      getCustomerInquiries(activeCustomerId),
    ]).then(([customers, inqs]) => {
      setCustomer(customers.find(c => c.id === activeCustomerId) || null);
      setCustInquiries(inqs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeCustomerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#64748b] text-sm">Customer not found.</p>
        <button onClick={goBack} className="mt-4 text-orange-500 font-semibold text-sm">← Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[#f4f6f9] border-b border-[#e2e8f0] px-4 py-3 flex items-center gap-3">
        <button
          onClick={goBack}
          className="p-2 -ml-1 rounded-xl hover:bg-white active:bg-[#e2e8f0] transition-colors tap-scale"
        >
          <ArrowLeft className="w-5 h-5 text-[#181c1e]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-extrabold text-[#181c1e] truncate">{customer.name}</h1>
          <p className="text-xs text-[#94a3b8]">{custInquiries.length} inquir{custInquiries.length === 1 ? 'y' : 'ies'}</p>
        </div>
        <button
          onClick={() => window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}`, '_blank')}
          className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-colors tap-scale"
        >
          <MessageCircle className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={() => window.open(`tel:${customer.phone}`, '_self')}
          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors tap-scale"
        >
          <Phone className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
              <span className="text-orange-500 font-extrabold text-2xl leading-none">{customer.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold text-[#181c1e]">{customer.name}</h2>
              <p className="text-sm text-[#64748b]">{customer.phone}</p>
              <p className="text-xs text-[#94a3b8] truncate">{customer.email}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold text-orange-500">{custInquiries.length}</p>
              <p className="text-xs text-[#94a3b8]">inquiries</p>
            </div>
          </div>
        </div>

        {/* Inquiry history */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#f1f5f9]">
            <h2 className="font-bold text-[#181c1e] text-sm">Inquiry History</h2>
          </div>
          {custInquiries.length === 0 ? (
            <div className="py-12 text-center text-[#94a3b8] text-sm">No inquiries yet.</div>
          ) : (
            <div className="divide-y divide-[#f8fafc]">
              {custInquiries.map(inq => (
                <button
                  key={inq.id}
                  onClick={() => navigate('inquiry-detail', inq.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#f8fafc] active:bg-[#f1f5f9] text-left group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-bold text-[#181c1e] text-sm">{inq.id}</span>
                      <StatusBadge status={inq.status} />
                    </div>
                    <p className="text-xs text-[#64748b]">{inq.vehicle.make} {inq.vehicle.model} · {inq.parts.length} part{inq.parts.length !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-[#94a3b8]">{inq.date}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#d1d5db] group-hover:text-orange-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
