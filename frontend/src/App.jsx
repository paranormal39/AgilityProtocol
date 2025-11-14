import React, { useState } from 'react';
import { Shield, ShoppingBag, CreditCard, Lock } from 'lucide-react';
import EnhancedShirtCheckout from './components/EnhancedShirtCheckout';

function App() {
  const [currentView, setCurrentView] = useState('home');

  if (currentView === 'checkout') {
    return <EnhancedShirtCheckout />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Agility Summit Store</h1>
            </div>
            <nav className="flex items-center space-x-6">
              <button
                onClick={() => setCurrentView('home')}
                className="text-gray-600 hover:text-gray-900"
              >
                Home
              </button>
              <button
                onClick={() => setCurrentView('checkout')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Shop Now</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Privacy-First E-Commerce
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Shop with complete privacy using zero-knowledge proofs and AI assistants.
          </p>
          <button
            onClick={() => setCurrentView('checkout')}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors flex items-center space-x-3 mx-auto"
          >
            <ShoppingBag className="w-6 h-6" />
            <span>Start Shopping Privately</span>
          </button>
        </div>
      </section>

      {/* Placeholder Sections */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Agility Summit Frontend Scaffold
            </h2>
            <p className="text-gray-600">
              This is a scaffold copied from the Agility privacy e-commerce demo.
              We will wire in the full checkout and AI assistant components next.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Privacy</h3>
              <p className="text-gray-600">
                Zero-knowledge proofs for credit card verification without exposing details.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Identity Privacy</h3>
              <p className="text-gray-600">
                KYC and compliance checks without storing or revealing raw personal data.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">AI Checkout</h3>
              <p className="text-gray-600">
                An AI assistant guides users through payment selection and ZK proof steps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Agility Summit</span>
            </div>
            <p className="text-gray-600">
              Powered by Midnight Network • Privacy-First Payments
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
