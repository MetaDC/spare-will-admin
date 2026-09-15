import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, Phone, Save, Package, Send, Car, User } from 'lucide-react';
import { useAdmin } from '../App';
import StatusBadge from '../components/StatusBadge';
import { InquiryStatus, PartItem } from '../types';
import { updateInquiryStatus, updateInquiryParts } from '../services/adminService';

const STATUSES: InquiryStatus[] = ['New', 'Reviewing', 'Price Sent', 'Customer Contacted', 'Completed', 'Closed', 'Cancelled'];
const AVAILABILITY_OPTIONS = ['Available', 'Not Available', 'Alternative Available', 'Need Confirmation'] as const;

export default function InquiryDetailScreen() {
  const { inquiries, activeInquiryId, goBack, showToast } = useAdmin();
  const inquiry = inquiries.find(i => i.id === activeInquiryId);

  const [savingStatus, setSavingStatus] = useState<InquiryStatus | null>(null);
  const [savingParts, setSavingParts] = useState(false);
  const [localParts, setLocalParts] = useState<PartItem[] | null>(null);
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');

  if (!inquiry) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#64748b] text-sm">Inquiry not found.</p>
        <button onClick={goBack} className="mt-4 text-orange-500 font-semibold text-sm">← Go Back</button>
      </div>
    );
  }

  const parts = localParts ?? inquiry.parts;

  const handleStatusChange = async (newStatus: InquiryStatus) => {
    if (inquiry.status === newStatus) return;
    setSavingStatus(newStatus);
    try {
      await updateInquiryStatus(inquiry.id, newStatus, inquiry.statusHistory);
      showToast(`Status → "${newStatus}"`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update status', 'error');
    } finally {
      setSavingStatus(null);
    }
  };

  const updatePart = (idx: number, field: keyof PartItem, value: string | number) => {
    const updated = parts.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    setLocalParts(updated);
  };

  const handleAddCustomPart = () => {
    const name = newPartName.trim();
    if (!name) return;
    const newPart: PartItem = {
      id: 'part_' + Date.now() + Math.random().toString(36).substring(2, 5),
      name,
      quantity: 1,
    };
    setLocalParts([...parts, newPart]);
    setNewPartName('');
    setShowAddPart(false);
  };

  const handleWhatsApp = () => {
    const clean = inquiry.contact.mobileNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}`, '_blank');
  };

  const handleSaveOnly = async () => {
    if (!localParts) return;
    setSavingParts(true);
    try {
      await updateInquiryParts(inquiry.id, localParts);
      setLocalParts(null);
      showToast('Prices saved successfully', 'success');
      if (inquiry.status === 'New') {
        await updateInquiryStatus(inquiry.id, 'Reviewing', inquiry.statusHistory);
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error');
    } finally {
      setSavingParts(false);
    }
  };

  const handleSaveAndSend = async () => {
    const pricedParts = parts.filter(p => p.price && p.price > 0);
    if (pricedParts.length === 0) {
      showToast('Set at least one part price first', 'error');
      return;
    }
    
    if (localParts) {
      setSavingParts(true);
      try {
        await updateInquiryParts(inquiry.id, localParts);
        setLocalParts(null);
      } catch (e: any) {
        showToast(e.message || 'Failed to save parts', 'error');
        setSavingParts(false);
        return;
      }
      setSavingParts(false);
    }

    if (inquiry.status !== 'Price Sent') {
      setSavingStatus('Price Sent');
      try {
        await updateInquiryStatus(inquiry.id, 'Price Sent', inquiry.statusHistory);
      } catch (e: any) {
        showToast(e.message || 'Failed to update status', 'error');
      }
      setSavingStatus(null);
    }

    const greeting = `Hello ${inquiry.contact.fullName},\nRegarding your Spare Will inquiry ${inquiry.id}:\n\n`;
    const partsMsg = pricedParts.map(p => `${p.name} (Qty: ${p.quantity}) - ₹${p.price || 0}`).join('\n');
    const footer = '\n\nPlease let us know if you need further information.\n\nThank you,\nSpare Will';
    const msg = encodeURIComponent(greeting + partsMsg + footer);
    const clean = inquiry.contact.mobileNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  const totalPrice = parts.reduce((sum, p) => sum + (p.price || 0) * p.quantity, 0);

  return (
    <div className="bg-[var(--bg)] flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center gap-3">
        <button
          onClick={goBack}
          className="p-1 -ml-1 text-[var(--dark)] hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[17px] font-bold text-[var(--dark)]">Inquiry #{inquiry.id}</h1>
      </div>

      <div className="px-5 pt-4 space-y-6 flex-1 max-w-4xl mx-auto w-full">
        {/* Customer & Vehicle Header */}
        <div className="relative">
          <div className="absolute right-0 top-0 flex flex-col items-end gap-2">
            <StatusBadge status={inquiry.status} />
            <div className="relative">
              {savingStatus !== null && (
                <div className="absolute -left-5 top-1.5 w-3 h-3 border-2 border-[var(--orange)] border-t-transparent rounded-full animate-spin" />
              )}
              <select
                value={inquiry.status}
                onChange={(e) => handleStatusChange(e.target.value as InquiryStatus)}
                disabled={savingStatus !== null}
                className="text-[12px] bg-white border border-[var(--border)] rounded-lg px-2.5 py-1.5 outline-none text-[var(--dark)] font-semibold shadow-sm focus:border-[var(--orange)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <h2 className="text-[26px] font-bold text-[var(--dark)] leading-tight mb-1 pr-28">
            {inquiry.contact.fullName}
          </h2>
          <p className="text-[14px] text-[#64748b] font-medium">
            {inquiry.vehicle.year} {inquiry.vehicle.make} {inquiry.vehicle.model}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-green-600 text-green-700 bg-green-50/50 hover:bg-green-50 font-bold text-[13px] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={() => window.open(`tel:${inquiry.contact.mobileNumber}`, '_self')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-300 text-[var(--dark)] hover:bg-gray-50 font-bold text-[13px] transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call
          </button>
        </div>

        {/* Request Details */}
        <div>
          <h3 className="text-[15px] font-bold text-[var(--dark)] mb-3">Request Details</h3>
          <p className="text-[13px] text-[#43474c] italic bg-white p-4 rounded-2xl border border-[var(--border)] shadow-sm leading-relaxed">
            "{inquiry.additionalNotes || `Need quote for parts requested for ${inquiry.vehicle.make} ${inquiry.vehicle.model}.`}"
          </p>
          {inquiry.vehicle.image && (
            <div className="flex gap-2 mt-3">
              <img src={inquiry.vehicle.image} alt="Vehicle" className="w-24 h-24 object-cover rounded-xl border border-[var(--border)]" />
            </div>
          )}
        </div>

        {/* Requested Parts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-[var(--dark)]">Requested Parts</h3>
            <span className="text-[11px] font-semibold text-[#64748b] bg-gray-100 px-2 py-0.5 rounded-full">
              {parts.length} items
            </span>
          </div>

          <div className="space-y-3">
            {parts.map((part, idx) => (
              <div key={part.id} className="bg-white rounded-3xl border border-[var(--border)] p-5 shadow-sm">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center">
                    <p className="font-bold text-[var(--dark)] text-[15px]">{part.name}</p>
                  </div>
                  {part.spec && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#64748b] mb-4">
                  Part #: {part.adminNote || 'Pending OEM'}
                </p>
                
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-[13px] font-medium text-[#64748b]">Availability:</span>
                  <button
                    onClick={() => updatePart(idx, 'availability', part.availability === 'Available' ? 'Not Available' : 'Available')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      part.availability === 'Available' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        part.availability === 'Available' ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-[13px] font-bold ${part.availability === 'Available' ? 'text-green-600' : 'text-[#64748b]'}`}>
                    {part.availability === 'Available' ? 'Available' : 'Not Available'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] font-medium text-[13px]">₹</span>
                    <input
                      type="number"
                      value={part.costPrice || ''}
                      onChange={e => updatePart(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                      placeholder="Cost Price"
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-50/50 rounded-xl border border-[var(--border)] text-[13px] text-[var(--dark)] font-medium focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-colors"
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 font-medium text-[13px]">₹</span>
                    <input
                      type="number"
                      value={part.price || ''}
                      onChange={e => updatePart(idx, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="Selling Price"
                      className="w-full pl-7 pr-3 py-2.5 bg-orange-50/30 rounded-xl border border-orange-200 text-[13px] text-[var(--dark)] font-bold focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-colors"
                    />
                  </div>
                  <div className="w-20 shrink-0 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] font-medium text-[11px]">Qty</span>
                    <input
                      type="number"
                      min="1"
                      value={part.quantity || ''}
                      onChange={e => updatePart(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full pl-8 pr-2 py-2.5 bg-gray-50/50 rounded-xl border border-[var(--border)] text-[13px] text-[var(--dark)] font-medium focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))}

            {showAddPart ? (
              <div className="bg-white rounded-3xl border border-[var(--border)] p-4 shadow-sm space-y-3">
                <input
                  type="text"
                  value={newPartName}
                  onChange={e => setNewPartName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomPart()}
                  placeholder="Part name (e.g. Brake Pad Set)"
                  autoFocus
                  className="w-full px-3 py-2.5 bg-gray-50/50 rounded-xl border border-[var(--border)] text-[13px] text-[var(--dark)] font-medium focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustomPart}
                    disabled={!newPartName.trim()}
                    className="flex-1 py-2 bg-[var(--orange)] text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all"
                  >
                    Add Part
                  </button>
                  <button
                    onClick={() => { setShowAddPart(false); setNewPartName(''); }}
                    className="px-4 py-2 bg-gray-100 text-[var(--dark)] rounded-xl text-[13px] font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddPart(true)}
                className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-3xl text-[13px] font-bold text-[#64748b] hover:text-[var(--dark)] hover:border-gray-400 hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                <span className="text-lg leading-none">+</span> Add Custom Part
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--border)] p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex gap-3 max-w-4xl mx-auto w-full">
        <button
          onClick={handleSaveAndSend}
          disabled={savingStatus !== null || savingParts}
          className="flex-1 bg-[var(--orange)] hover:bg-[#ea6c0a] text-white rounded-2xl py-3.5 font-bold text-[15px] flex items-center justify-center transition-colors shadow-md tap-scale disabled:opacity-50"
        >
          {savingStatus !== null ? <div className="w-5 h-5 border-2 border-[currentColor] border-t-transparent rounded-full animate-spin" /> : 'Save & Send Quote'}
        </button>
      </div>
    </div>
  );
}
