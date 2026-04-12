import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * QRDisplay - Renders QR codes with glow effect
 */
export default function QRDisplay({ data, role, label }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [error, setError] = useState(null);

  const glowColors = {
    buyer: 'shadow-glow-blue',
    merchant: 'shadow-glow-green',
    courier: 'shadow-glow-orange',
    return: 'shadow-glow-purple',
  };

  const borderColors = {
    buyer: 'border-buyer/50',
    merchant: 'border-merchant/50',
    courier: 'border-courier/50',
    return: 'border-return/50',
  };

  useEffect(() => {
    if (!data) {
      setQrDataUrl(null);
      return;
    }

    const generateQR = async () => {
      try {
        const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
        const url = await QRCode.toDataURL(jsonString, {
          width: 150,
          margin: 2,
          color: {
            dark: '#ffffff',
            light: '#00000000',
          },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(url);
        setError(null);
      } catch (err) {
        setError('Failed to generate QR');
        console.error('QR generation error:', err);
      }
    };

    generateQR();
  }, [data]);

  if (!data) {
    return (
      <div className="qr-container h-40 border border-dashed border-gray-700">
        <span className="text-gray-500 text-xs">No QR data</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-xs text-gray-400 text-center">{label}</div>
      )}
      <div className={`qr-container border ${borderColors[role]} ${glowColors[role]} transition-all duration-300`}>
        {error ? (
          <span className="text-red-400 text-xs">{error}</span>
        ) : qrDataUrl ? (
          <img 
            src={qrDataUrl} 
            alt="QR Code" 
            className="w-36 h-36"
          />
        ) : (
          <div className="w-36 h-36 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
}
