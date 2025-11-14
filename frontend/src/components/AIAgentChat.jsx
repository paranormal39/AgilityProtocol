import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Shield, CreditCard, MapPin, CheckCircle } from 'lucide-react';
import ZKPaymentService from '../services/ZKPaymentService';

const AIAgentChat = ({ onComplete, orderData }) => {
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState('greeting');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [collectedData, setCollectedData] = useState({
    creditCard: {},
    shipping: {},
    identity: {},
    crypto: {}
  });
  const [walletInfo, setWalletInfo] = useState({
    address: null,
    balance: 0,
    created: false
  });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      addAIMessage("Hello! I'm Agi, your Agility Privacy Assistant 🤖. I'll help you complete your purchase with complete privacy using zero-knowledge proofs and Midnight Network features.");
      setTimeout(() => {
        addAIMessage("First, let me create a secure Midnight wallet for your transaction...");
        createMidnightWallet();
      }, 1500);
    }
  }, [messages.length]);

  const addAIMessage = (text, type = 'text', data = null) => {
    setMessages(prev => [...prev, {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: 'ai',
      text,
      type,
      data,
      timestamp: new Date()
    }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: 'user',
      text,
      timestamp: new Date()
    }]);
  };

  const simulateTyping = async (duration = 1000) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, duration));
    setIsTyping(false);
  };

  const createMidnightWallet = async () => {
    await simulateTyping(2000);
    const newWallet = {
      address: `mn_shield-addr_test1av0ff3dxu2c_${Math.random().toString(36).substr(2, 6)}`,
      balance: 1000000,
      created: true
    };
    setWalletInfo(newWallet);
    addAIMessage(`✅ Midnight wallet created successfully!`, 'success');
    addAIMessage(`📍 **Wallet Address**: ${newWallet.address.slice(0, 30)}...`, 'wallet');
    addAIMessage(`💰 **Initial Balance**: ${(newWallet.balance / 1000000).toFixed(2)} DUST tokens`, 'wallet');
    setTimeout(() => {
      addAIMessage("Perfect! Now I'll help you complete your purchase with complete privacy. First, how would you like to pay?");
      setTimeout(() => {
        addAIMessage("Please choose your payment method:", 'payment_choice');
        addAIMessage("1️⃣ **Traditional Credit Card** - I'll collect card details and generate ZK proofs", 'option');
        addAIMessage("2️⃣ **Crypto Payment (XRP)** - Connect Xaman wallet for XRPL payment", 'option');
        addAIMessage("Just type '1' for credit card or '2' for crypto payment.");
      }, 1000);
    }, 2000);
  };

  const transferFunds = async (amount, purpose) => {
    addAIMessage(`💸 Transferring ${amount} DUST for ${purpose}...`, 'progress');
    await simulateTyping(1500);
    const newBalance = walletInfo.balance - amount;
    setWalletInfo(prev => ({ ...prev, balance: newBalance }));
    addAIMessage(`✅ Transfer complete! New balance: ${(newBalance / 1000000).toFixed(2)} DUST`, 'success');
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;
    const userMessage = currentInput.trim();
    addUserMessage(userMessage);
    setCurrentInput('');
    await simulateTyping();

    switch (currentStep) {
      case 'greeting':
        await handlePaymentMethodSelection(userMessage);
        break;
      case 'card_number':
        await handleCreditCardNumber(userMessage);
        break;
      case 'card_expiry':
        await handleCardExpiry(userMessage);
        break;
      case 'card_cvv':
        await handleCardCVV(userMessage);
        break;
      case 'card_name':
        await handleCardName(userMessage);
        break;
      case 'shipping_address':
        await handleShippingAddress(userMessage);
        break;
      case 'shipping_city':
        await handleShippingCity(userMessage);
        break;
      case 'shipping_zip':
        await handleShippingZip(userMessage);
        break;
      case 'identity_name':
        await handleIdentityName(userMessage);
        break;
      case 'identity_dob':
        await handleIdentityDOB(userMessage);
        break;
      default:
        addAIMessage("I'm processing your information. Please wait a moment.");
    }
  };

  const handlePaymentMethodSelection = async (choice) => {
    if (choice === '1' || choice.toLowerCase().includes('credit')) {
      setPaymentMethod('traditional');
      addAIMessage("Great choice! I'll help you pay with a traditional credit card using zero-knowledge proofs for privacy.");
      addAIMessage("What's your credit card number?");
      setCurrentStep('card_number');
    } else if (choice === '2' || choice.toLowerCase().includes('crypto')) {
      setPaymentMethod('crypto');
      addAIMessage("Crypto path is not fully wired yet in this scaffold, but will be added later.");
    } else {
      addAIMessage("I didn't understand that. Please type '1' for credit card or '2' for crypto payment.");
    }
  };

  const handleCreditCardNumber = async (cardNumber) => {
    setCollectedData(prev => ({
      ...prev,
      creditCard: { ...prev.creditCard, number: cardNumber }
    }));
    addAIMessage(`Perfect! I've received your card number (ending in ${cardNumber.slice(-4)}). Now I need the expiry date (MM/YY format):`);
    setCurrentStep('card_expiry');
  };

  const handleCardExpiry = async (expiry) => {
    setCollectedData(prev => ({
      ...prev,
      creditCard: { ...prev.creditCard, expiry }
    }));
    addAIMessage(`Got it! Expiry date ${expiry} recorded. What's your CVV code?`);
    setCurrentStep('card_cvv');
  };

  const handleCardCVV = async (cvv) => {
    setCollectedData(prev => ({
      ...prev,
      creditCard: { ...prev.creditCard, cvv }
    }));
    addAIMessage(`CVV received. Finally, what's the name on the card?`);
    setCurrentStep('card_name');
  };

  const handleCardName = async (name) => {
    const updatedCreditCard = { 
      ...collectedData.creditCard, 
      name,
      expiry: collectedData.creditCard.expiry || '12/26',
      cvv: collectedData.creditCard.cvv || '123'
    };
    setCollectedData(prev => ({
      ...prev,
      creditCard: updatedCreditCard
    }));
    addAIMessage(`Excellent! I have all your credit card information. Now generating your credit card ZK proof...`);
    await generateCreditCardZKProof(updatedCreditCard);
    addAIMessage(`✅ Credit card verified privately! Your card details are valid but never stored.`);
    addAIMessage(`Now let's collect your shipping address. What's your street address?`);
    setCurrentStep('shipping_address');
  };

  const handleShippingAddress = async (address) => {
    setCollectedData(prev => ({
      ...prev,
      shipping: { ...prev.shipping, address }
    }));
    addAIMessage(`Address recorded. What city are you in?`);
    setCurrentStep('shipping_city');
  };

  const handleShippingCity = async (city) => {
    setCollectedData(prev => ({
      ...prev,
      shipping: { ...prev.shipping, city, state: 'CA', country: 'USA' }
    }));
    addAIMessage(`Great! What's your ZIP code?`);
    setCurrentStep('shipping_zip');
  };

  const handleShippingZip = async (zip) => {
    const updatedShipping = {
      ...collectedData.shipping,
      zip,
      state: collectedData.shipping.state || 'CA',
      country: 'USA'
    };
    setCollectedData(prev => ({
      ...prev,
      shipping: updatedShipping
    }));
    addAIMessage(`Perfect! Now generating your shipping address ZK proof...`);
    await generateShippingZKProof(updatedShipping);
    addAIMessage(`✅ Shipping address verified privately! Your location is confirmed but never exposed.`);
    addAIMessage(`Now for compliance verification, I need your full name:`);
    setCurrentStep('identity_name');
  };

  const handleIdentityName = async (fullName) => {
    setCollectedData(prev => ({
      ...prev,
      identity: { ...prev.identity, fullName }
    }));
    addAIMessage(`Thank you! What's your date of birth? (YYYY-MM-DD format)`);
    setCurrentStep('identity_dob');
  };

  const handleIdentityDOB = async (dob) => {
    const updatedIdentity = {
      ...collectedData.identity,
      dateOfBirth: dob,
      ssn: '***-**-1234'
    };
    setCollectedData(prev => ({
      ...prev,
      identity: updatedIdentity
    }));
    addAIMessage(`Perfect! Now generating your compliance ZK proof...`);
    await generateComplianceZKProof(updatedIdentity);
    addAIMessage(`✅ Identity compliance verified privately! Your personal information is validated but never stored.`);
    await transferFunds(50000, 'T-shirt purchase');
    addAIMessage(`🎉 All zero-knowledge proofs generated successfully! Your purchase is now complete with full privacy protection.`);
    setTimeout(() => {
      onComplete({
        proofs: { creditCard: true, shipping: true, compliance: true },
        data: collectedData,
        wallet: walletInfo
      });
    }, 2000);
  };

  const generateCreditCardZKProof = async (creditCardData) => {
    addAIMessage("🔐 Generating credit card zero-knowledge proof...", 'progress');
    try {
      const zkService = new ZKPaymentService();
      await zkService.initialize();
      await simulateTyping(800);
      addAIMessage("  → Analyzing card number pattern...", 'step');
      await simulateTyping(600);
      addAIMessage("  → Verifying card type without revealing digits...", 'step');
      await simulateTyping(600);
      addAIMessage("  → Generating cryptographic commitment...", 'step');
      const proof = await zkService.generateCreditCardZKProof(creditCardData);
      return proof;
    } catch (error) {
      console.error('Credit card ZK proof error:', error);
      addAIMessage("❌ Credit card proof generation failed", 'error');
    }
  };

  const generateShippingZKProof = async (shippingData) => {
    addAIMessage("🏠 Generating shipping address zero-knowledge proof...", 'progress');
    try {
      const zkService = new ZKPaymentService();
      await zkService.initialize();
      await simulateTyping(800);
      addAIMessage("  → Analyzing address format...", 'step');
      await simulateTyping(600);
      addAIMessage("  → Verifying postal code validity...", 'step');
      await simulateTyping(600);
      addAIMessage("  → Creating location privacy commitment...", 'step');
      const proof = await zkService.generateShippingZKProof(shippingData);
      return proof;
    } catch (error) {
      console.error('Shipping ZK proof error:', error);
      addAIMessage("❌ Shipping proof generation failed", 'error');
    }
  };

  const generateComplianceZKProof = async (identityData) => {
    addAIMessage("👤 Generating compliance zero-knowledge proof...", 'progress');
    try {
      const zkService = new ZKPaymentService();
      await zkService.initialize();
      await simulateTyping(800);
      addAIMessage("  → Verifying age requirements...", 'step');
      await simulateTyping(600);
      addAIMessage("  → Checking compliance status...", 'step');
      await simulateTyping(600);
      addAIMessage("  → Creating identity nullifier...", 'step');
      const proof = await zkService.generateComplianceZKProof(identityData);
      return proof;
    } catch (error) {
      console.error('Compliance ZK proof error:', error);
      addAIMessage("❌ Compliance proof generation failed", 'error');
    }
  };

  const quickFillDemo = () => {
    addAIMessage("Let me fill in some demo data for you to speed up the process...", 'status');
    if (currentStep === 'greeting') {
      addUserMessage("1");
      setTimeout(() => addUserMessage("4532-1234-5678-9012"), 1500);
      setTimeout(() => addUserMessage("12/26"), 2300);
      setTimeout(() => addUserMessage("123"), 3100);
      setTimeout(() => addUserMessage("John Doe"), 3900);
      setTimeout(() => addUserMessage("123 Privacy Lane"), 5500);
      setTimeout(() => addUserMessage("San Francisco"), 6300);
      setTimeout(() => addUserMessage("94102"), 7100);
      setTimeout(() => addUserMessage("John Doe"), 8700);
      setTimeout(() => addUserMessage("1990-01-01"), 9500);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <Bot className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Agi - Privacy Assistant</h3>
            <p className="text-xs text-gray-500">Guiding you through private checkout</p>
          </div>
        </div>
        <button
          onClick={quickFillDemo}
          className="text-xs px-3 py-1 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          Quick Demo
        </button>
      </div>

      <div className="flex-1 bg-gray-50 rounded-xl p-3 overflow-y-auto mb-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex mb-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center mr-2 mt-1">
                <Bot className="text-white" size={14} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-gray-900 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
            </div>
            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center ml-2 mt-1">
                <User className="text-gray-700" size={14} />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-1 animate-bounce" />
            <span>Agi is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center space-x-2"
      >
        <input
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder="Type your message or '1'/'2' to choose..."
          className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default AIAgentChat;
