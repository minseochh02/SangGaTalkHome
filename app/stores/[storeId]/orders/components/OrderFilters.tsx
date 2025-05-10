import React from "react";
import { getStatusText, getStatusColor } from "../utils/orderStatusUtils";

interface OrderFiltersProps {
  statusFilter: number | null;
  setStatusFilter: (status: number | null) => void;
}

export default function OrderFilters({ statusFilter, setStatusFilter }: OrderFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button 
        onClick={() => setStatusFilter(null)} 
        className={`px-3 py-1 rounded-md ${statusFilter === null ? 'bg-primary text-white' : 'bg-gray-100'}`}
      >
        전체
      </button>
      {[0, 1, 2, 3, 4, 5].map(status => (
        <button 
          key={status}
          onClick={() => setStatusFilter(status)} 
          className={`px-3 py-1 rounded-md ${statusFilter === status ? 'bg-primary text-white' : getStatusColor(status)}`}
        >
          {getStatusText(status)}
        </button>
      ))}
    </div>
  );
} 