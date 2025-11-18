# AGI - Seamless Crypto Abstraction AI Agent

An AI agent that makes crypto payments invisible to users - they shop normally while AGI handles all blockchain complexity behind the scenes using Midnight Network and DUST tokens.

## 🤖 What AGI Does

AGI makes crypto payments completely invisible:
- **Normal Shopping Experience**: Users have regular conversations about products
- **Invisible DUST Payments**: AGI handles Lace wallet connectivity and DUST transactions behind the scenes
- **Zero-Knowledge Privacy**: Shipping addresses and purchase details protected with ZK proofs
- **No Crypto Jargon**: Users never hear about "blockchain", "tokens", or "transactions"
- **Seamless Integration**: Works with any e-commerce conversation

## 🌟 Key Features

- **Conversational Commerce**: Natural language shopping with invisible crypto payments
- **Lace Wallet Integration**: Automatic DUST token handling via Lace wallet
- **ZK Privacy Proofs**: Shipping and purchase privacy without revealing details
- **Midnight.js Integration**: Production-ready blockchain operations
- **Privacy-KYC Contract**: Deployed smart contract for compliance

## 🎯 Example Conversation

```
User: "I'm looking for some skincare products"
AGI: "Great! I have some wonderful options. What type are you interested in? 🌸"

User: "Something with lavender"
AGI: "Perfect! Our lavender bundle is very popular - it's $45 and includes soap, lotion, and essential oil."

User: "That sounds good, I'll take it"
AGI: "Excellent choice! Let me process your secure payment..."
     [Invisibly: connects Lace wallet, converts USD→DUST, generates ZK proofs]
AGI: "Payment complete! 🎉 Your lavender bundle will arrive Tuesday. Order #abc123"

User: "Thanks!"
AGI: "You're welcome! You'll get tracking info via email. Enjoy your lavender products! 💜"
```

**User never knew they used crypto - AGI handled everything invisibly!**

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/Island-Ghost/Agility-Summit.git
cd Agility-Summit

# Install dependencies for AGI agent
cd agents
npm install

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY and MIDNIGHT_WALLET_SEED

# Start AGI agent
npm start
```

## 📋 Prerequisites

- Node.js (v22 or later)
- npm or yarn
- Compact compiler (installed via midnight-js)
- Git

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/Island-Ghost/Agility-Summit.git
cd Agility-Summit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Compile Compact contracts:
```bash
npm run compile
```

## 📁 Project Structure

```
agility/
├── contracts/                          # Compact smart contracts
│   ├── AgilityPayment.compact         # Payment processing
│   ├── AgilityEscrow.compact          # Escrow management
│   ├── KedasBrewCustomer.compact      # Customer management (demo)
│   ├── KedasBrewLoyalty.compact       # Loyalty program (demo)
│   └── KedasBrewSubscription.compact  # Subscriptions (demo)
├── src/                                # Application source code
│   ├── index.js                       # Main entry point
│   ├── config/                        # Configuration files
│   └── services/                      # Service modules
├── scripts/                            # Deployment and utility scripts
│   └── deploy.js                      # Contract deployment
├── docs/                               # Documentation
│   ├── ABOUT.md                       # Project overview
│   ├── SMART_CONTRACT_IDEAS.md        # Use case ideas
│   ├── KEDAS_BREW_INTEGRATION_PLAN.md # Real-world example
│   └── KEDAS_BREW_PRIVACY_ARCHITECTURE.md # Privacy implementation
├── package.json                        # Dependencies and scripts
├── .env.example                        # Environment variables template
└── README.md                           # This file
```

## 🧪 Testing

Run tests:
```bash
npm test
```

## 🚢 Deployment

Deploy to testnet:
```bash
npm run deploy:testnet
```

Deploy to mainnet:
```bash
npm run deploy:mainnet
```

## 📖 Documentation

### Core Documentation

#### [ABOUT.md](./ABOUT.md) - Project Overview
Complete project vision, history, and technical architecture including:
- Introduction and history
- Core technologies (Midnight Network, XRPL, ILP, AI/ML)
- Key features and use cases
- Technical architecture
- Security model and compliance
- Roadmap and milestones

#### [SMART_CONTRACT_IDEAS.md](./SMART_CONTRACT_IDEAS.md) - Use Case Library
15 detailed smart contract use cases with implementation details:
1. Payment Invoicing & Tracking
2. Subscription Management
3. Multi-Signature Payment Authorization
4. Loyalty Points & Rewards
5. Conditional Payment Release (Smart Escrow)
6. Supply Chain Payment Tracking
7. Tip/Gratuity Distribution
8. Refund & Dispute Management
9. Charitable Donations with Transparency
10. Payroll & Contractor Payments
11. Marketplace Transaction Fees
12. Insurance Premium & Claims
13. Crowdfunding Campaigns
14. Rental/Lease Payments
15. AI/ML Service Usage Billing

Each use case includes:
- Description and ledger data structure
- Key features and target customers
- Privacy benefits and implementation considerations

#### [KEDAS_BREW_INTEGRATION_PLAN.md](./KEDAS_BREW_INTEGRATION_PLAN.md) - Real-World Example
Complete integration plan for Keda's Brew skincare e-commerce store:
- Business analysis and current challenges
- 10 integration solutions with detailed implementations
- Revenue impact projections (93% growth in Year 1)
- Cost analysis and savings ($3,600/year)
- Marketing messaging and customer communications
- Implementation checklist and success metrics

**Website Reference**: https://kedasbrew.com/

#### [KEDAS_BREW_PRIVACY_ARCHITECTURE.md](./KEDAS_BREW_PRIVACY_ARCHITECTURE.md) - Privacy Implementation
Comprehensive guide to Zero-Knowledge Proof implementation:
- Architecture components and data flow
- Customer registration, order processing, loyalty, and subscription flows
- Zero-Knowledge Proof examples
- Security model and threat analysis
- GDPR/CCPA compliance
- Performance metrics and benchmarks
- **Website Integration Reference** with code examples:
  - Checkout page integration
  - Product page integration
  - Customer account integration
  - Loyalty program widget
  - Subscription page integration
- WordPress plugin structure
- Testing scenarios and FAQs
- Complete implementation roadmap

### Smart Contracts (Compact Language)

#### Core Contracts
- **AgilityPayment.compact** - Privacy-preserving payment processing
- **AgilityEscrow.compact** - Secure escrow management with conditional release

#### Demo Contracts (Keda's Brew Example)
- **KedasBrewCustomer.compact** - Customer registration and order management
- **KedasBrewLoyalty.compact** - Privacy-preserving loyalty points program
- **KedasBrewSubscription.compact** - Recurring subscription management

All contracts built with:
- Midnight Network's Compact language
- Zero-Knowledge Proofs for privacy
- Counter ledgers for public metrics
- Witness functions for private data
- Unshielded token support for payments

### External Resources

#### Midnight Network
- [Official Documentation](https://docs.midnight.network/)
- [Compact Language Guide](https://docs.midnight.network/develop/compact/)
- [Smart Contract Tutorial](https://docs.midnight.network/develop/tutorial/)
- [Zero-Knowledge Proofs](https://docs.midnight.network/learn/zkp/)

#### XRP Ledger
- [XRPL Documentation](https://xrpl.org/)
- [Interledger Protocol](https://interledger.org/)

#### Related Technologies
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Web3 Standards](https://web3.foundation/)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT License - see LICENSE file for details

## 👥 Team

Agility Development Team

## 🔗 Links

- [GitHub Repository](https://github.com/Island-Ghost/Agility-Summit)
- [Midnight Network](https://midnight.network/)
- [XRP Ledger](https://xrpl.org/)

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ for the Midnight Network Hackathon
