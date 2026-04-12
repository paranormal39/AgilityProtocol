import React from 'react';

/**
 * DataView - Displays visible and hidden data sections
 */
export default function DataView({ visible, hidden, role }) {
  const roleColors = {
    buyer: 'text-buyer',
    merchant: 'text-merchant',
    courier: 'text-courier',
    return: 'text-return',
  };

  return (
    <div className="space-y-3">
      {/* Visible Data */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs font-medium text-green-400">VISIBLE DATA</span>
        </div>
        <div className="data-section data-visible">
          {visible && Object.entries(visible).map(([key, value]) => (
            <div key={key} className="flex justify-between py-1 border-b border-white/5 last:border-0">
              <span className="text-gray-400">{key}:</span>
              <span className={`${roleColors[role]} font-medium`}>
                {typeof value === 'boolean' ? (value ? '✓' : '✗') : 
                 typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
          {(!visible || Object.keys(visible).length === 0) && (
            <span className="text-gray-500 italic">No data yet</span>
          )}
        </div>
      </div>

      {/* Hidden Data */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-xs font-medium text-red-400">HIDDEN DATA</span>
          <span className="text-[10px] text-gray-500 ml-auto">Never revealed</span>
        </div>
        <div className="data-section data-hidden">
          {hidden && hidden.map((item, index) => (
            <div key={index} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
              <span className="text-red-400/60">🔒</span>
              <span className="text-gray-500 line-through">{item}</span>
            </div>
          ))}
          {(!hidden || hidden.length === 0) && (
            <span className="text-gray-500 italic">No hidden data</span>
          )}
        </div>
      </div>
    </div>
  );
}
