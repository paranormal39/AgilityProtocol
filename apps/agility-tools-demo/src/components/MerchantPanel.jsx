import React, { useState } from 'react';
import DataView from './DataView';
import QRDisplay from './QRDisplay';
import { getMerchantView, generateCourierQR, verifyOrderProof } from '../utils/mockFlow';
import { PROOF_TYPES, CIRCUIT_INFO } from '../utils/proofSimulator';

/**
 * MerchantPanel - Verifies orders and generates courier QR
 */
export default function MerchantPanel({ flowState, onCourierQRGenerated }) {
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [courierQR, setCourierQR] = useState(null);
  const [output, setOutput] = useState(null);

  const handleVerifyOrder = async () => {
    if (!flowState.order) return;
    
    setLoading(true);
    setOutput('Verifying order proof...');

    try {
      // Verify the proof
      const result = await verifyOrderProof(flowState.proof);
      
      setVerified(true);
      setOutput({
        status: 'VERIFIED',
        message: 'Order proof verified successfully',
        verifiedAt: new Date(result.verifiedAt).toLocaleTimeString(),
        circuit: result.circuit,
      });
    } catch (error) {
      setOutput({ status: 'ERROR', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCourierQR = async () => {
    if (!flowState.order || !verified) return;
    
    setLoading(true);
    setOutput('Generating courier QR...');

    try {
      // Generate courier-specific QR (limited data)
      const qrData = generateCourierQR(flowState.order);
      setCourierQR(qrData);
      
      setOutput({
        status: 'SUCCESS',
        message: 'Courier QR generated',
        routeToken: qrData.routeToken,
      });

      onCourierQRGenerated(qrData);
    } catch (error) {
      setOutput({ status: 'ERROR', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const circuitInfo = CIRCUIT_INFO[PROOF_TYPES.ORDER];

  // What merchant can see (limited view)
  const merchantView = flowState.order ? getMerchantView(flowState.order) : null;
  const visibleData = merchantView ? {
    orderToken: merchantView.orderToken,
    item: merchantView.item,
    quantity: merchantView.quantity,
    paymentValid: merchantView.paymentValid,
    shippingAuthorized: merchantView.shippingAuthorized,
  } : null;

  // What's hidden from merchant
  const hiddenData = merchantView?._hidden || ['buyerIdentity', 'fullAddress', 'walletAddress'];

  return (
    <div className="panel-card panel-merchant flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-merchant/20 flex items-center justify-center">
          <span className="text-xl">🏪</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-merchant">Merchant</h2>
          <p className="text-xs text-gray-400">Verifies & fulfills orders</p>
        </div>
      </div>

      {/* Circuit Info */}
      <div className="mb-4 p-2 rounded bg-merchant/5 border border-merchant/20">
        <div className="text-xs text-merchant font-medium">{circuitInfo.name}</div>
        <div className="text-[10px] text-gray-400 mt-1">{circuitInfo.description}</div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 mb-4">
        <button
          onClick={handleVerifyOrder}
          disabled={loading || !flowState.order || verified}
          className="btn btn-merchant w-full"
        >
          {loading && !verified ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-merchant border-t-transparent rounded-full"></div>
              Verifying...
            </span>
          ) : verified ? (
            '✓ Order Verified'
          ) : (
            'Verify Order'
          )}
        </button>

        <button
          onClick={handleGenerateCourierQR}
          disabled={loading || !verified || courierQR}
          className="btn btn-merchant w-full"
        >
          {courierQR ? '✓ Courier QR Ready' : 'Generate Courier QR'}
        </button>
      </div>

      {/* Data View */}
      <div className="flex-1 overflow-auto mb-4">
        <DataView 
          visible={visibleData}
          hidden={hiddenData}
          role="merchant"
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
                <span className={`badge ${output.status === 'VERIFIED' || output.status === 'SUCCESS' ? 'badge-verified' : 'bg-red-500/20 text-red-400'}`}>
                  {output.status}
                </span>
              </div>
              <div className="text-green-400">{output.message}</div>
              {output.routeToken && (
                <div className="text-gray-500 text-[10px]">
                  Route: {output.routeToken}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* QR Code */}
      {courierQR && (
        <div className="mt-4">
          <QRDisplay 
            data={courierQR}
            role="merchant"
            label="Courier Route QR"
          />
        </div>
      )}

      {/* Privacy Label */}
      <div className="mt-4 text-center">
        <span className="text-[10px] text-gray-500 italic">
          "Sees order, not buyer identity"
        </span>
      </div>
    </div>
  );
}
