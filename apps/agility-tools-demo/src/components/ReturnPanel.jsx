import React, { useState } from 'react';
import DataView from './DataView';
import QRDisplay from './QRDisplay';
import { getReturnView, generateReturnQR } from '../utils/mockFlow';
import { PROOF_TYPES, CIRCUIT_INFO } from '../utils/proofSimulator';

/**
 * ReturnPanel - Handles return authorization with selective disclosure
 */
export default function ReturnPanel({ flowState }) {
  const [loading, setLoading] = useState(false);
  const [returnQR, setReturnQR] = useState(null);
  const [output, setOutput] = useState(null);

  const handleGenerateReturn = async () => {
    if (!flowState.routeUnlocked) return;
    
    setLoading(true);
    setOutput('Generating return authorization...');

    try {
      // Generate return QR with limited data
      const qrData = generateReturnQR(flowState.order);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setReturnQR(qrData);
      setOutput({
        status: 'AUTHORIZED',
        message: 'Return authorized',
        returnToken: qrData.returnToken,
        destination: qrData.returnDestination,
      });
    } catch (error) {
      setOutput({ status: 'ERROR', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const circuitInfo = CIRCUIT_INFO[PROOF_TYPES.RETURN];

  // What return flow can see
  const returnView = flowState.order ? getReturnView(flowState.order) : null;
  const visibleData = returnQR ? {
    returnToken: returnView?.returnToken,
    returnAuthorized: returnView?.returnAuthorized,
    returnWindow: returnView?.returnWindow,
    destination: 'Warehouse Node',
  } : flowState.routeUnlocked ? {
    status: 'Ready for return',
    originalOrder: flowState.order?.orderToken?.substring(0, 8) + '...',
  } : null;

  // What's hidden from return flow
  const hiddenData = returnView?._hidden || [
    'merchantAddress',
    'buyerIdentity',
    'paymentDetails',
    'itemDetails',
    'originalPrice',
  ];

  return (
    <div className="panel-card panel-return flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-return/20 flex items-center justify-center">
          <span className="text-xl">↩️</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-return">Return</h2>
          <p className="text-xs text-gray-400">Processes returns</p>
        </div>
      </div>

      {/* Circuit Info */}
      <div className="mb-4 p-2 rounded bg-return/5 border border-return/20">
        <div className="text-xs text-return font-medium">{circuitInfo.name}</div>
        <div className="text-[10px] text-gray-400 mt-1">{circuitInfo.description}</div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleGenerateReturn}
        disabled={loading || !flowState.routeUnlocked || returnQR}
        className="btn btn-return w-full mb-4"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-return border-t-transparent rounded-full"></div>
            Authorizing...
          </span>
        ) : returnQR ? (
          '✓ Return Authorized'
        ) : !flowState.routeUnlocked ? (
          'Waiting for delivery...'
        ) : (
          'Generate Return QR'
        )}
      </button>

      {/* Data View */}
      <div className="flex-1 overflow-auto mb-4">
        <DataView 
          visible={visibleData}
          hidden={hiddenData}
          role="return"
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
                <span className={`badge ${output.status === 'AUTHORIZED' ? 'badge-verified' : 'bg-red-500/20 text-red-400'}`}>
                  {output.status}
                </span>
              </div>
              <div className="text-green-400">{output.message}</div>
              {output.returnToken && (
                <div className="text-gray-500 text-[10px]">
                  Token: {output.returnToken}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* QR Code */}
      {returnQR && (
        <div className="mt-4">
          <QRDisplay 
            data={returnQR}
            role="return"
            label="Return Authorization QR"
          />
        </div>
      )}

      {/* Privacy Label */}
      <div className="mt-4 text-center">
        <span className="text-[10px] text-gray-500 italic">
          "Authorizes return, hides transaction"
        </span>
      </div>
    </div>
  );
}
