import React, { useState } from 'react';
import DataView from './DataView';
import QRDisplay from './QRDisplay';
import { createFullOrder } from '../utils/mockFlow';
import { generateProof, PROOF_TYPES, CIRCUIT_INFO } from '../utils/proofSimulator';

/**
 * BuyerPanel - Creates orders with selective disclosure
 */
export default function BuyerPanel({ onOrderCreated, flowState }) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [proof, setProof] = useState(null);

  const handleCreateOrder = async () => {
    setLoading(true);
    setOutput('Generating private purchase proof...');

    try {
      // Create full order (buyer has all data)
      const fullOrder = createFullOrder();
      
      // Generate ZK proof
      const zkProof = await generateProof(PROOF_TYPES.PURCHASE, {
        public: {
          item: fullOrder.item,
          quantity: fullOrder.quantity,
          paymentValid: fullOrder.paymentValid,
        },
        private: {
          buyerName: fullOrder.buyerName,
          fullAddress: fullOrder.fullAddress,
          walletAddress: fullOrder.walletAddress,
        },
      });

      setProof(zkProof);
      setOutput({
        status: 'SUCCESS',
        message: 'Private Purchase Proof Generated',
        proofHash: zkProof.privateInputsHash.substring(0, 24) + '...',
        circuit: zkProof.circuitId,
        timestamp: new Date(zkProof.generatedAt).toLocaleTimeString(),
      });

      // Pass order to parent
      onOrderCreated(fullOrder, zkProof);
    } catch (error) {
      setOutput({ status: 'ERROR', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const circuitInfo = CIRCUIT_INFO[PROOF_TYPES.PURCHASE];

  // What buyer sees (everything)
  const visibleData = flowState.order ? {
    orderToken: flowState.order.orderToken,
    item: flowState.order.item,
    quantity: flowState.order.quantity,
    paymentValid: flowState.order.paymentValid,
  } : null;

  // What's hidden from others
  const hiddenData = ['buyerName', 'buyerEmail', 'fullAddress', 'walletAddress', 'transactionHash'];

  return (
    <div className="panel-card panel-buyer flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-buyer/20 flex items-center justify-center">
          <span className="text-xl">🛒</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-buyer">Buyer</h2>
          <p className="text-xs text-gray-400">Creates private purchase</p>
        </div>
      </div>

      {/* Circuit Info */}
      <div className="mb-4 p-2 rounded bg-buyer/5 border border-buyer/20">
        <div className="text-xs text-buyer font-medium">{circuitInfo.name}</div>
        <div className="text-[10px] text-gray-400 mt-1">{circuitInfo.description}</div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleCreateOrder}
        disabled={loading || flowState.order}
        className="btn btn-buyer w-full mb-4"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-buyer border-t-transparent rounded-full"></div>
            Generating Proof...
          </span>
        ) : flowState.order ? (
          '✓ Order Created'
        ) : (
          'Create Order'
        )}
      </button>

      {/* Data View */}
      <div className="flex-1 overflow-auto mb-4">
        <DataView 
          visible={visibleData}
          hidden={hiddenData}
          role="buyer"
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
                <span className={`badge ${output.status === 'SUCCESS' ? 'badge-verified' : 'bg-red-500/20 text-red-400'}`}>
                  {output.status}
                </span>
              </div>
              <div className="text-green-400">{output.message}</div>
              {output.proofHash && (
                <div className="text-gray-500 text-[10px]">
                  Proof: {output.proofHash}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* QR Code */}
      {proof && (
        <div className="mt-4">
          <QRDisplay 
            data={{
              type: 'purchase_proof',
              orderToken: flowState.order?.orderToken,
              proofHash: proof.privateInputsHash.substring(0, 16),
            }}
            role="buyer"
            label="Purchase Proof QR"
          />
        </div>
      )}

      {/* Privacy Label */}
      <div className="mt-4 text-center">
        <span className="text-[10px] text-gray-500 italic">
          "Only reveals what's needed"
        </span>
      </div>
    </div>
  );
}
