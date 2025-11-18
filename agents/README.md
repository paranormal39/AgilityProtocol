# AGI - Seamless Crypto Abstraction AI Agent

This directory contains **AGI** - an AI agent that makes crypto payments invisible to users. Users have normal shopping conversations while AGI handles all blockchain complexity behind the scenes using Midnight Network and DUST tokens.

## 🎯 Agent Overview

**AGI** specializes in making crypto payments completely invisible to users. Key capabilities:

- **Seamless DUST Payments** - Handles Lace wallet connectivity and DUST transactions invisibly
- **ZK Privacy Protection** - Generates zero-knowledge proofs for shipping and purchase privacy
- **Natural Conversations** - Users shop normally without crypto jargon or complexity
- **Midnight.js Integration** - Production-ready blockchain operations behind the scenes

## 🏗️ Architecture

### Base Stack
- **ElizaOS** - AI agent framework with conversational capabilities
- **Midnight MCP Server** - Blockchain integration via Model Context Protocol
- **Privacy-KYC Contract** - Deployed smart contract with 14 e-commerce functions

### Integration Components
1. **character.json** - Aria's personality, knowledge, and conversation patterns
2. **privacy-kyc-mcp-extension.js** - Custom MCP tools for privacy-preserving e-commerce
3. **setup-agent.sh** - Automated setup script for the complete system

## 🚀 Quick Start

### Prerequisites
- Node.js 23.3.0+
- ElizaOS CLI (`npm install -g @elizaos/cli@beta`)
- Access to Midnight Network TestNet

### Setup Instructions

1. **Run the setup script:**
   ```bash
   chmod +x setup-agent.sh
   ./setup-agent.sh
   ```

2. **Configure the agent:**
   ```bash
   cd agents/agility-privacy-agent
   cp ../character.json ./character.json
   ```

3. **Start development:**
   ```bash
   elizaos dev
   ```

## 🔧 Configuration

### Environment Variables
Set these in your `.env` file:

```env
MIDNIGHT_WALLET_SEED=your-wallet-seed-here
MIDNIGHT_RPC_URL=https://rpc.midnight.network
PRIVACY_KYC_CONTRACT_ADDRESS=02008292c965ecbca125b983b8c28e3c274180462196485fdd9e5a28d5aa5c5d0529
OPENAI_API_KEY=your-openai-key
```

### MCP Server Configuration
The agent connects to the Midnight MCP server for blockchain operations:

```json
{
  "mcp": {
    "servers": {
      "midnight": {
        "command": "node",
        "args": ["../../../midnight-mcp-server/dist/stdio-server.js"],
        "env": {
          "MIDNIGHT_WALLET_SEED": "your-wallet-seed-here",
          "PRIVACY_KYC_CONTRACT_ADDRESS": "02008292c965ecbca125b983b8c28e3c274180462196485fdd9e5a28d5aa5c5d0529"
        }
      }
    }
  }
}
```

## 🔐 Privacy-KYC Contract Integration

### Deployed Contract
- **Address:** `02008292c965ecbca125b983b8c28e3c274180462196485fdd9e5a28d5aa5c5d0529`
- **Network:** Midnight TestNet
- **Functions:** 14 comprehensive e-commerce circuits

### Available Functions
1. **KYC Management:**
   - `registerKYCWithCardAndShipping` - Complete privacy-preserving registration
   - `verifyKYCProof` - Verify credentials without revealing data
   - `revokeKYCProof` - Admin revocation capabilities

2. **Payment Processing:**
   - `proveCardPaymentZK` - Private card payment verification
   - `proveShippingAddressZK` - Shipping address verification
   - `registerCrossChainPayment` - XRPL + Midnight anchoring

3. **Role-Based Verification:**
   - `verifyMerchantView` - Merchant-specific verification
   - `verifyCourierView` - Courier delivery authorization

4. **Status Queries:**
   - `getPaymentStatus` - Payment status tracking
   - `getPaymentKYCProof` - KYC proof lookup

## 🤖 Agent Capabilities

### Conversation Examples

**KYC Registration:**
```
User: "I want to register for KYC but I'm worried about my privacy"
Aria: "I completely understand your privacy concerns! 🔒 That's exactly why we use zero-knowledge proofs. I can guide you through KYC registration where your personal information never touches the blockchain - only cryptographic commitments (hashes) are stored..."
```

**Cross-Chain Payments:**
```
User: "How does cross-chain payment work between XRPL and Midnight?"
Aria: "Great question! 🌉 Our cross-chain payment system creates a cryptographic anchor between your XRPL and Midnight transactions. Here's the magic: both payments are linked through commitments, so merchants can verify the payment without seeing your wallet addresses..."
```

**Merchant Verification:**
```
User: "I'm a merchant - how can I verify customers without seeing their personal info?"
Aria: "Perfect! As a merchant, you get a special verification view 🏪 You can verify that customers meet your requirements (age, jurisdiction, spending limits) without ever seeing their actual details..."
```

### MCP Tools Available to Aria

1. **generateKYCCommitments** - Create privacy-preserving commitments
2. **registerKYCWithCommitments** - On-chain KYC registration
3. **processPrivateCardPayment** - Private payment processing
4. **verifyShippingAddress** - Address verification
5. **createCrossChainPayment** - Cross-chain anchoring
6. **verifyForMerchant** - Merchant verification
7. **verifyForCourier** - Courier verification
8. **getPaymentStatus** - Status queries

## 🎨 Personality & Style

Aria is designed to be:
- **Professional yet approachable** privacy advocate
- **Expert educator** in blockchain privacy technologies
- **Patient teacher** for complex privacy concepts
- **Enthusiastic** about user empowerment through privacy

### Communication Style
- Uses privacy and security emojis (🔒, 🛡️, 🔐, 🌙)
- Explains complex concepts in simple terms
- Always emphasizes user control and empowerment
- Provides step-by-step guidance for complex processes

## 🔄 Development Workflow

### Testing the Agent
```bash
# Start development mode with hot-reloading
elizaos dev

# Test specific functions
elizaos test

# Build for production
bun run build
```

### Adding New Features
1. Update `character.json` with new knowledge/examples
2. Add new MCP tools to `privacy-kyc-mcp-extension.js`
3. Test with `elizaos dev`
4. Update documentation

## 🌐 Integration Points

### Frontend Integration
The agent can be integrated with web frontends via:
- WebSocket connections
- REST API endpoints
- Direct ElizaOS client libraries

### Backend Services
- Midnight MCP Server for blockchain operations
- XRPL integration for cross-chain payments
- External KYC providers for real-world verification

## 📚 Resources

- [ElizaOS Documentation](https://docs.elizaos.com)
- [Midnight MCP Server](https://github.com/DEGAorg/midnight-mcp)
- [Privacy-KYC Contract Documentation](../PRIVACY_KYC_CONTRACT.md)
- [Compact Language Guide](https://docs.midnight.network)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your enhancements to the agent
4. Test thoroughly with `elizaos dev`
5. Submit a pull request

## 📄 License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.

---

**Aria represents the future of privacy-preserving e-commerce AI - where users maintain complete control over their data while enjoying seamless, secure transactions.** 🌙
