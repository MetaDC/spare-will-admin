import React from 'react';
import { FileText, Clock, Send, CheckCircle, ChevronRight, Package } from 'lucide-react';
import { useAdmin } from '../App';
import StatusBadge from '../components/StatusBadge';

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function DashboardScreen() {
  const { inquiries, navigate } = useAdmin();

  const stats = [
    { label: 'New', value: inquiries.filter(i => i.status === 'New').length, icon: FileText, bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Reviewing', value: inquiries.filter(i => i.status === 'Reviewing').length, icon: Clock, bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'Price Sent', value: inquiries.filter(i => i.status === 'Price Sent').length, icon: Send, bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'Completed', value: inquiries.filter(i => i.status === 'Completed').length, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600' },
  ];

  const recent = inquiries.slice(0, 8);

  return (
    <div className="px-5 pt-5 pb-24 max-w-6xl mx-auto bg-[var(--bg)]">
      {/* Header */}
      <div className="flex lg:hidden items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Spare Will" className="h-6 w-auto" />
          <span className="font-bold text-[var(--dark)] text-lg tracking-tight">Spare Will</span>
        </div>
      </div>

      {/* Overview Title */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[var(--dark)] tracking-tight">Overview</h1>
        <p className="text-[#64748b] text-[13px] mt-0.5">
          {inquiries.length === 0
            ? 'No inquiries yet.'
            : `${inquiries.length} total inquiries · Today's workload summary.`
          }
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, bg, text }) => (
          <div
            key={label}
            onClick={() => navigate('inquiries')}
            className="bg-white rounded-3xl p-5 border border-transparent shadow-sm active:scale-95 cursor-pointer transition-all flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-start justify-between">
              <div className={`w-8 h-8 rounded-full ${bg} ${text} flex items-center justify-center`}>
                <Icon className="w-4 h-4" strokeWidth={3} />
              </div>
              <p className="text-[26px] font-semibold text-[var(--dark)] leading-none">{value}</p>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[var(--dark)] leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent inquiries */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[var(--dark)] text-[15px]">Latest Inquiries</h2>
          <button
            onClick={() => navigate('inquiries')}
            className="text-[var(--orange)] text-[11px] font-semibold flex items-center gap-0.5 hover:underline"
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="py-14 text-center bg-white rounded-3xl border border-[var(--border)]">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-sm text-[var(--dark)]">No inquiries yet</p>
            <p className="text-[12px] text-[#94a3b8] mt-1">Inquiries from customers will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map(inq => {
              const relTime = getRelativeTime(inq.createdAt);
              return (
                <button
                  key={inq.id}
                  onClick={() => navigate('inquiry-detail', inq.id)}
                  className="w-full bg-white rounded-3xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow text-left border border-transparent shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-[var(--dark)] text-[13px] truncate pr-2">
                        {inq.parts[0]?.name || 'Parts Request'}
                        {inq.parts.length > 1 && (
                          <span className="text-[#94a3b8] font-medium"> +{inq.parts.length - 1}</span>
                        )}
                      </p>
                      <StatusBadge status={inq.status} />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500">
                          {inq.contact.fullName.charAt(0)}
                        </div>
                        <span className="truncate max-w-[80px]">{inq.contact.fullName}</span>
                        {inq.vehicle?.make && (
                          <>
                            <span className="text-[#d1d5db]">·</span>
                            <span className="truncate max-w-[80px] text-[#94a3b8]">
                              {inq.vehicle.make} {inq.vehicle.model}
                            </span>
                          </>
                        )}
                      </div>
                      {relTime && (
                        <span className="text-[10px] text-[#94a3b8] flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" /> {relTime}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
