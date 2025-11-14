import React, { useState, useEffect } from 'react';
import { ShoppingCart, CreditCard, Shield, Lock, CheckCircle, Eye, MapPin, User, Bot } from 'lucide-react';
import ZKPaymentService from '../services/ZKPaymentService';
import AIAgentChat from './AIAgentChat';

const EnhancedShirtCheckout = () => {
  const [selectedShirt] = useState({
    name: "Premium Cotton T-Shirt",
    price: 29.99,
    size: "M",
    color: "Navy Blue"
  });

  const [checkoutStep, setCheckoutStep] = useState('product');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [zkStatus, setZkStatus] = useState({
    creditCard: 'pending',
    shipping: 'pending', 
    compliance: 'pending'
  });

  const [creditCardData, setCreditCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  const [shippingData, setShippingData] = useState({
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA'
  });

  const [identityData, setIdentityData] = useState({
    fullName: '',
    dateOfBirth: '',
    ssn: ''
  });

  const [isGeneratingProofs, setIsGeneratingProofs] = useState(false);
  const [zkGenerationSteps, setZkGenerationSteps] = useState([]);
  const [currentZkStep, setCurrentZkStep] = useState('');
  const [zkProgress, setZkProgress] = useState(0);

  const fillDemoData = () => {
    setCreditCardData({
      number: '4532-1234-5678-9012',
      expiry: '12/26',
      cvv: '123',
      name: 'John Doe'
    });

    setShippingData({
      address: '123 Privacy Lane',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'USA'
    });

    setIdentityData({
      fullName: 'John Doe',
      dateOfBirth: '1990-01-01',
      ssn: '***-**-1234'
    });
  };

  const generateZKProof = async (type) => {
    setZkStatus(prev => ({ ...prev, [type]: 'verifying' }));
    setZkGenerationSteps([]);
    setCurrentZkStep('');
    setZkProgress(0);
    
    try {
      const zkService = new ZKPaymentService();
      await zkService.initialize();
      
      let proof;
      switch(type) {
        case 'creditCard':
          proof = await zkService.generateCreditCardZKProof(creditCardData);
          break;
        case 'shipping':
          proof = await zkService.generateShippingZKProof(shippingData);
          break;
        case 'compliance':
          proof = await zkService.generateComplianceZKProof(identityData);
          break;
      }
      
      console.log(`${type} ZK Proof Generated:`, proof);
      setZkStatus(prev => ({ ...prev, [type]: 'verified' }));
      setCurrentZkStep('✅ Proof generation complete!');
      setZkProgress(100);
    } catch (error) {
      console.error(`${type} ZK Proof Failed:`, error);
      setZkStatus(prev => ({ ...prev, [type]: 'error' }));
      setCurrentZkStep('❌ Proof generation failed');
    }
  };

  const generateAllZKProofs = async () => {
    setIsGeneratingProofs(true);
    await Promise.all([
      generateZKProof('creditCard'),
      generateZKProof('shipping'),
      generateZKProof('compliance')
    ]);
    setIsGeneratingProofs(false);
    setCheckoutStep('processing');
  };

  const processPayment = async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    setCheckoutStep('complete');
  };

  if (checkoutStep === 'product') {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen grid md:grid-cols-[2fr,1.5fr] gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-6 text-white rounded-xl mb-8">
            <h1 className="text-3xl font-bold">Agility Store</h1>
            <p className="text-blue-100">Privacy-First E-Commerce with ZK Proofs</p>
            <p className="text-sm text-blue-200 mt-2">
              Contract: 0200b0fbc4fdcea1c8985262df48c80b0f99824005709a45f3ca40152835fb438cdc
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-8 mb-4">
                <div className="w-full h-64 flex items-center justify-center">
                  <svg 
                    viewBox="0 0 200 200" 
                    className="w-48 h-48 text-white"
                    fill="currentColor"
                  >
                    <path d="M50 60 L50 40 C50 35 55 30 60 30 L80 30 C85 25 95 25 100 25 C105 25 115 25 120 30 L140 30 C145 30 150 35 150 40 L150 60 L170 70 L170 90 L150 85 L150 180 C150 185 145 190 140 190 L60 190 C55 190 50 185 50 180 L50 85 L30 90 L30 70 Z"/>
                    <text x="100" y="120" textAnchor="middle" className="text-2xl font-bold fill-blue-200">
                      AG
                    </text>
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">{selectedShirt.name}</h2>
              <p className="text-3xl font-bold text-green-600 mb-4">${selectedShirt.price}</p>
              <div className="space-y-2 mb-6">
                <p><strong>Size:</strong> {selectedShirt.size}</p>
                <p><strong>Color:</strong> {selectedShirt.color}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">🔐 Privacy Features</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Zero-knowledge proof verification</li>
                  <li>• No credit card data stored</li>
                  <li>• Address privacy protection</li>
                  <li>• Identity compliance without exposure</li>
                </ul>
              </div>
              <button 
                onClick={() => setCheckoutStep('payment')}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <ShoppingCart className="inline mr-2" size={20} />
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <AIAgentChat
            onComplete={() => setCheckoutStep('complete')}
            orderData={{
              item: selectedShirt,
              price: selectedShirt.price
            }}
          />
        </div>
      </div>
    );
  }

  if (checkoutStep === 'payment') {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen grid md:grid-cols-[2fr,1.5fr] gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Choose Payment Method</h2>
          <div className="grid gap-4 mb-8">
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedPayment === 'paypal' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedPayment('paypal')}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <CreditCard className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">PayPal</h3>
                  <p className="text-gray-600 text-sm">Traditional payment (data exposed)</p>
                </div>
              </div>
            </div>

            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedPayment === 'apple' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedPayment('apple')}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mr-4">
                  <CreditCard className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">Apple Pay</h3>
                  <p className="text-gray-600 text-sm">Traditional payment (data exposed)</p>
                </div>
              </div>
            </div>

            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedPayment === 'agility' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedPayment('agility')}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <Bot className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">🔐 Agility Privacy Pay</h3>
                  <p className="text-purple-600 text-sm">Zero-knowledge proof verification</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-purple-600 text-sm">
                    <Bot size={16} className="mr-1" />
                    <span>AI Assistant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setCheckoutStep('product')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button 
              onClick={() => {
                if (selectedPayment === 'agility') {
                  setCheckoutStep('details');
                }
              }}
              disabled={!selectedPayment}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300"
            >
              Continue
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <AIAgentChat
            onComplete={() => setCheckoutStep('complete')}
            orderData={{
              item: selectedShirt,
              price: selectedShirt.price
            }}
          />
        </div>
      </div>
    );
  }

  if (checkoutStep === 'details') {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen grid md:grid-cols-[2fr,1.5fr] gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Enter Details & Generate ZK Proofs</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-6 text-sm">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                zkStatus.creditCard === 'verified' ? 'bg-green-500' :
                zkStatus.creditCard === 'verifying' ? 'bg-yellow-500' : 'bg-gray-300'
              }`} />
              <span>Card Privacy</span>
            </div>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                zkStatus.shipping === 'verified' ? 'bg-green-500' :
                zkStatus.shipping === 'verifying' ? 'bg-yellow-500' : 'bg-gray-300'
              }`} />
              <span>Shipping Privacy</span>
            </div>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                zkStatus.compliance === 'verified' ? 'bg-green-500' :
                zkStatus.compliance === 'verifying' ? 'bg-yellow-500' : 'bg-gray-300'
              }`} />
              <span>Compliance Privacy</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <CreditCard className="text-blue-600 mr-2" size={24} />
                <h3 className="font-semibold">Credit Card</h3>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Card Number"
                  value={creditCardData.number}
                  onChange={(e) => setCreditCardData({...creditCardData, number: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={creditCardData.expiry}
                    onChange={(e) => setCreditCardData({...creditCardData, expiry: e.target.value})}
                    className="p-3 border rounded-lg"
                  />
                  <input
                    type="password"
                    placeholder="CVV"
                    value={creditCardData.cvv}
                    onChange={(e) => setCreditCardData({...creditCardData, cvv: e.target.value})}
                    className="p-3 border rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Name on Card"
                  value={creditCardData.name}
                  onChange={(e) => setCreditCardData({...creditCardData, name: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <button
                onClick={() => generateZKProof('creditCard')}
                disabled={zkStatus.creditCard === 'verifying'}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {zkStatus.creditCard === 'verifying' ? 'Generating ZK Proof...' : 'Generate Card ZK Proof'}
              </button>
              {zkStatus.creditCard === 'verified' && (
                <div className="mt-2 text-center">
                  <span className="text-green-600 text-sm">✅ Verified Privately</span>
                </div>
              )}
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <MapPin className="text-green-600 mr-2" size={24} />
                <h3 className="font-semibold">Shipping Address</h3>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Street Address"
                  value={shippingData.address}
                  onChange={(e) => setShippingData({...shippingData, address: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={shippingData.city}
                  onChange={(e) => setShippingData({...shippingData, city: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="State"
                    value={shippingData.state}
                    onChange={(e) => setShippingData({...shippingData, state: e.target.value})}
                    className="p-3 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
                    value={shippingData.zip}
                    onChange={(e) => setShippingData({...shippingData, zip: e.target.value})}
                    className="p-3 border rounded-lg"
                  />
                </div>
              </div>
              <button
                onClick={() => generateZKProof('shipping')}
                disabled={zkStatus.shipping === 'verifying'}
                className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400"
              >
                {zkStatus.shipping === 'verifying' ? 'Generating ZK Proof...' : 'Generate Shipping ZK Proof'}
              </button>
              {zkStatus.shipping === 'verified' && (
                <div className="mt-2 text-center">
                  <span className="text-green-600 text-sm">✅ Verified Privately</span>
                </div>
              )}
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <User className="text-purple-600 mr-2" size={24} />
                <h3 className="font-semibold">Identity Compliance</h3>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={identityData.fullName}
                  onChange={(e) => setIdentityData({...identityData, fullName: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                />
                <input
                  type="date"
                  placeholder="Date of Birth"
                  value={identityData.dateOfBirth}
                  onChange={(e) => setIdentityData({...identityData, dateOfBirth: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="SSN (last 4 digits)"
                  value={identityData.ssn}
                  onChange={(e) => setIdentityData({...identityData, ssn: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <button
                onClick={() => generateZKProof('compliance')}
                disabled={zkStatus.compliance === 'verifying'}
                className="w-full mt-4 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-purple-400"
              >
                {zkStatus.compliance === 'verifying' ? 'Generating ZK Proof...' : 'Generate Compliance ZK Proof'}
              </button>
              {zkStatus.compliance === 'verified' && (
                <div className="mt-2 text-center">
                  <span className="text-green-600 text-sm">✅ Verified Privately</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-3">🔐 Privacy Protection Status</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${
                  zkStatus.creditCard === 'verified' ? 'bg-green-500' : 
                  zkStatus.creditCard === 'verifying' ? 'bg-yellow-500' : 'bg-gray-300'
                }`} />
                <p>Credit Card ZK</p>
              </div>
              <div className="text-center">
                <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${
                  zkStatus.shipping === 'verified' ? 'bg-green-500' : 
                  zkStatus.shipping === 'verifying' ? 'bg-yellow-500' : 'bg-gray-300'
                }`} />
                <p>Shipping ZK</p>
              </div>
              <div className="text-center">
                <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${
                  zkStatus.compliance === 'verified' ? 'bg-green-500' : 
                  zkStatus.compliance === 'verifying' ? 'bg-yellow-500' : 'bg-gray-300'
                }`} />
                <p>Compliance ZK</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setCheckoutStep('payment')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={generateAllZKProofs}
              disabled={isGeneratingProofs}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-purple-400"
            >
              {isGeneratingProofs ? 'Generating All ZK Proofs...' : 'Generate All ZK Proofs'}
            </button>
            <button 
              onClick={() => setCheckoutStep('processing')}
              disabled={!(zkStatus.creditCard === 'verified' && zkStatus.shipping === 'verified' && zkStatus.compliance === 'verified')}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              Complete Private Purchase
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <AIAgentChat
            onComplete={() => setCheckoutStep('complete')}
            orderData={{
              item: selectedShirt,
              price: selectedShirt.price
            }}
          />
        </div>
      </div>
    );
  }

  if (checkoutStep === 'processing') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-4">Processing Private Payment</h2>
          <p className="text-gray-600 mb-6">Verifying ZK proofs on Midnight Network...</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700">
              Contract: 0200b0fbc4fdcea1c8985262df48c80b0f99824005709a45f3ca40152835fb438cdc
            </p>
          </div>
          <button 
            onClick={processPayment}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Complete Order
          </button>
        </div>
      </div>
    );
  }

  if (checkoutStep === 'complete') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Order Complete!</h2>
          <p className="text-gray-600 mb-6">Your privacy-protected purchase was successful.</p>
          <div className="bg-green-50 p-6 rounded-lg mb-6">
            <h3 className="font-semibold text-green-800 mb-3">🔐 Privacy Protection Summary</h3>
            <ul className="text-sm text-green-700 space-y-2">
              <li>✅ Credit card details never stored or exposed</li>
              <li>✅ Shipping address verified without revealing location</li>
              <li>✅ Identity compliance confirmed without exposing personal info</li>
              <li>✅ All verifications done via zero-knowledge proofs</li>
            </ul>
          </div>
          <div className="text-xs text-gray-500 mb-6">
            <p>Contract: 0200b0fbc4fdcea1c8985262df48c80b0f99824005709a45f3ca40152835fb438cdc</p>
            <p>Network: Midnight TestNet</p>
          </div>
          <button 
            onClick={() => {
              setCheckoutStep('product');
              setZkStatus({ creditCard: 'pending', shipping: 'pending', compliance: 'pending' });
              setSelectedPayment('');
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Shop Again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default EnhancedShirtCheckout;
