import React, { useState } from 'react';
import DataView from './DataView';
import { getCourierView, decodeCourierQR } from '../utils/mockFlow';
import { PROOF_TYPES, CIRCUIT_INFO } from '../utils/proofSimulator';

/**
 * CourierPanel - Scans courier QR and unlocks route
 */
export default function CourierPanel({ flowState, onRouteUnlocked }) {
  const [loading, setLoading] = useState(false);
  const [routeUnlocked, setRouteUnlocked] = useState(false);
  const [output, setOutput] = useState(null);

  const handleScanQR = async () => {
    if (!flowState.courierQR) return;
    
    setLoading(true);
    setOutput('Scanning courier QR...');

    try {
      // Decode the QR (simulate scan)
      const result = await decodeCourierQR(flowState.courierQR);
      
      // Simulate route unlock
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setRouteUnlocked(true);
      setOutput({
        status: 'UNLOCKED',
        message: 'Route unlocked successfully',
        routeToken: result.data.routeToken,
        destination: result.data.destination,
      });

      onRouteUnlocked(result.data);
    } catch (error) {
      setOutput({ status: 'ERROR', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const circuitInfo = CIRCUIT_INFO[PROOF_TYPES.COURIER];

  // What courier can see (very limited)
  const courierView = flowState.order ? getCourierView(flowState.order) : null;
  const visibleData = courierView && routeUnlocked ? {
    routeToken: courierView.routeToken,
    destination: courierView.destination.coordinates,
    area: courierView.destination.area,
    instructions: courierView.deliveryInstructions,
    packageSize: courierView.packageSize,
  } : flowState.courierQR ? {
    status: 'QR Ready to Scan',
  } : null;

  // What's hidden from courier
  const hiddenData = courierView?._hidden || [
    'item',
    'price',
    'buyerName',
    'buyerEmail',
    'merchantName',
    'paymentDetails',
    'fullAddress',
  ];

  return (
    <div className="panel-card panel-courier flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-courier/20 flex items-center justify-center">
          <span className="text-xl">🚚</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-courier">Courier</h2>
          <p className="text-xs text-gray-400">Delivers packages</p>
        </div>
      </div>

      {/* Circuit Info */}
      <div className="mb-4 p-2 rounded bg-courier/5 border border-courier/20">
        <div className="text-xs text-courier font-medium">{circuitInfo.name}</div>
        <div className="text-[10px] text-gray-400 mt-1">{circuitInfo.description}</div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleScanQR}
        disabled={loading || !flowState.courierQR || routeUnlocked}
        className="btn btn-courier w-full mb-4"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-courier border-t-transparent rounded-full"></div>
            Scanning...
          </span>
        ) : routeUnlocked ? (
          '✓ Route Unlocked'
        ) : !flowState.courierQR ? (
          'Waiting for QR...'
        ) : (
          'Scan Courier QR'
        )}
      </button>

      {/* Data View */}
      <div className="flex-1 overflow-auto mb-4">
        <DataView 
          visible={visibleData}
          hidden={hiddenData}
          role="courier"
        />
      </div>

      {/* Output */}
      {output && (
        <div className="output-box">
          {typeof output === 'string' ? (
            <span className="text-gray-400">{output}</span>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`badge ${output.status === 'UNLOCKED' ? 'badge-verified' : 'bg-red-500/20 text-red-400'}`}>
                  {output.status}
                </span>
              </div>
              <div className="text-green-400">{output.message}</div>
              {output.destination && (
                <div className="text-gray-500 text-[10px]">
                  📍 {output.destination}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Route Map Placeholder */}
      {routeUnlocked && (
        <div className="mt-4 p-4 rounded-lg bg-courier/10 border border-courier/30">
          <div className="text-xs text-courier font-medium mb-2">Route Active</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-courier animate-pulse"></div>
            <span className="text-xs text-gray-400">GPS Navigation Ready</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-500">
            {courierView?.destination.area}
          </div>
        </div>
      )}

      {/* Privacy Label */}
      <div className="mt-4 text-center">
        <span className="text-[10px] text-gray-500 italic">
          "Sees route, not order contents"
        </span>
      </div>
    </div>
  );
}
