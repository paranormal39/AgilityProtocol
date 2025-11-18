# Privacy-Preserving E-Commerce System

## 🌙 Midnight Network Integration with XRPL Payments

A complete privacy-preserving e-commerce system featuring:
- **XRPL testnet payments** with QR code generation
- **Zero-knowledge proof generation** via external proof server
- **Privacy-preserving KYC** with role-based data disclosure
- **AI-powered chat interface** for seamless user experience

---

## 🚀 Quick Start

### 1. Start the System
```bash
node agi-server.js
```

### 2. Access the Interface
- **Chat Interface**: http://localhost:3003/agi-chat.html
- **Landing Page**: http://localhost:3003/
- **Checkout Demo**: http://localhost:3003/checkout.html

### 3. Test the Complete Flow
1. Type: "pay with xrp"
2. Type: "done" (after QR payment)
3. Click: "📦 Add Shipping Address"
4. Fill form and click: "🔐 Generate ZK Proof"

---

## 📁 File Structure

### Core Files
- `agi-server.js` - Main server with WebSocket and XRPL integration
- `agi-chat.html` - Chat interface with ZK proof generation
- `index.html` - Landing page
- `checkout.html` - Checkout demo page
- `package.json` - Dependencies and scripts

### Configuration
- `.env.zk` - ZK proof server configuration
- `character.json` - AI agent configuration
- `.wallet-storage/` - XRPL wallet storage

### Documentation
- `MIdnightSetup/` - Complete integration documentation and backups

---

## 🔧 System Requirements

### Dependencies
- Node.js 18+
- External proof server on port 6300
- XRPL testnet access

### Key Integrations
- **Midnight Network**: Privacy-KYC contract deployed
- **XRPL Testnet**: Real payment processing
- **External Proof Server**: ZK proof generation on port 6300

---

## 📚 Documentation

Complete integration guides available in `MIdnightSetup/`:
- `MIDNIGHT_INTEGRATION_GUIDE.md` - Full system documentation
- `API_QUICK_REFERENCE.md` - Fast setup and troubleshooting

---

## ✅ System Status

- ✅ **XRPL Integration**: Real testnet payments (2 testXRP)
- ✅ **ZK Proof Generation**: External proof server integration
- ✅ **Privacy-KYC**: Role-based data disclosure
- ✅ **AI Chat Interface**: Complete user experience
- ✅ **Cross-chain Anchoring**: XRPL + Midnight Network

**Ready for Midnight Network "Privacy First" Challenge submission!** 🎯

---

*For detailed setup and integration information, see the MIdnightSetup directory.*
