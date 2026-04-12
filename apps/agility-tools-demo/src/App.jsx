import React, { useState } from 'react';
import BuyerPanel from './components/BuyerPanel';
import MerchantPanel from './components/MerchantPanel';
import CourierPanel from './components/CourierPanel';
import ReturnPanel from './components/ReturnPanel';

/**
 * Agility Tools - Private Commerce Demo
 * 
 * Demonstrates selective disclosure across 4 commerce roles.
 */
export default function App() {
  // Global flow state
  const [flowState, setFlowState] = useState({
    order: null,
    proof: null,
    courierQR: null,
    routeUnlocked: false,
  });

  // Flow step tracking for arrows
  const [activeFlow, setActiveFlow] = useState(0);

  // Handlers
  const handleOrderCreated = (order, proof) => {
    setFlowState(prev => ({ ...prev, order, proof }));
    setActiveFlow(1);
  };

  const handleCourierQRGenerated = (qrData) => {
    setFlowState(prev => ({ ...prev, courierQR: qrData }));
    setActiveFlow(2);
  };

  const handleRouteUnlocked = (routeData) => {
    setFlowState(prev => ({ ...prev, routeUnlocked: true }));
    setActiveFlow(3);
  };

  const handleReset = () => {
    setFlowState({
      order: null,
      proof: null,
      courierQR: null,
      routeUnlocked: false,
    });
    setActiveFlow(0);
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-buyer via-merchant to-return bg-clip-text text-transparent">
          AGILITY TOOLS
        </h1>
        <p className="text-gray-400 mt-2">
          Selective Disclosure for Real-World Commerce
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="text-xs text-gray-500">Powered by Midnight ZK Proofs</span>
          <span className="text-gray-600">•</span>
          <span className="text-xs text-gray-500">Privacy-Preserving</span>
          <span className="text-gray-600">•</span>
          <span className="text-xs text-gray-500">Split-Knowledge Architecture</span>
        </div>
      </header>

      {/* Flow Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <FlowStep label="Create" active={activeFlow >= 0} completed={activeFlow >= 1} color="buyer" />
        <FlowArrow active={activeFlow >= 1} />
        <FlowStep label="Verify" active={activeFlow >= 1} completed={activeFlow >= 2} color="merchant" />
        <FlowArrow active={activeFlow >= 2} />
        <FlowStep label="Deliver" active={activeFlow >= 2} completed={activeFlow >= 3} color="courier" />
        <FlowArrow active={activeFlow >= 3} />
        <FlowStep label="Return" active={activeFlow >= 3} completed={false} color="return" />
      </div>

      {/* Main Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {/* Buyer Panel */}
        <div className="relative">
          <BuyerPanel 
            flowState={flowState}
            onOrderCreated={handleOrderCreated}
          />
          {/* Arrow to Merchant */}
          <div className="hidden lg:block absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
            <FlowArrowLarge active={activeFlow >= 1} />
          </div>
        </div>

        {/* Merchant Panel */}
        <div className="relative">
          <MerchantPanel 
            flowState={flowState}
            onCourierQRGenerated={handleCourierQRGenerated}
          />
          {/* Arrow to Courier */}
          <div className="hidden lg:block absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
            <FlowArrowLarge active={activeFlow >= 2} />
          </div>
        </div>

        {/* Courier Panel */}
        <div className="relative">
          <CourierPanel 
            flowState={flowState}
            onRouteUnlocked={handleRouteUnlocked}
          />
          {/* Arrow to Return */}
          <div className="hidden lg:block absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
            <FlowArrowLarge active={activeFlow >= 3} />
          </div>
        </div>

        {/* Return Panel */}
        <div>
          <ReturnPanel flowState={flowState} />
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleReset}
          className="px-6 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          Reset Demo
        </button>
      </div>

      {/* Footer */}
      <footer className="text-center mt-12 text-xs text-gray-600">
        <p>Agility Protocol • Privacy-Preserving Commerce</p>
        <p className="mt-1">Each role only sees what they need to see</p>
      </footer>
    </div>
  );
}

// Flow step indicator
function FlowStep({ label, active, completed, color }) {
  const colors = {
    buyer: 'bg-buyer',
    merchant: 'bg-merchant',
    courier: 'bg-courier',
    return: 'bg-return',
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
          completed 
            ? `${colors[color]} text-white` 
            : active 
              ? `${colors[color]}/30 text-white border-2 border-${color}` 
              : 'bg-gray-800 text-gray-500'
        }`}
      >
        {completed ? '✓' : ''}
      </div>
      <span className={`text-[10px] mt-1 ${active ? 'text-gray-300' : 'text-gray-600'}`}>
        {label}
      </span>
    </div>
  );
}

// Small flow arrow
function FlowArrow({ active }) {
  return (
    <div className={`text-lg transition-all duration-300 ${active ? 'text-white' : 'text-gray-700'}`}>
      →
    </div>
  );
}

// Large flow arrow between panels
function FlowArrowLarge({ active }) {
  return (
    <div 
      className={`w-4 h-4 flex items-center justify-center transition-all duration-500 ${
        active ? 'text-white animate-pulse' : 'text-gray-700'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
      </svg>
    </div>
  );
}
