import React from 'react';
import { InquiryStatus } from '../types';

const statusStyles: Record<string, string> = {
  'New': 'status-new',
  'Reviewing': 'status-reviewing',
  'Price Sent': 'status-price-sent',
  'Customer Contacted': 'status-contacted',
  'Completed': 'status-completed',
  'Cancelled': 'status-cancelled',
  'Closed': 'status-closed',
};

export default function StatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
