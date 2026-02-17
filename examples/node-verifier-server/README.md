# Agility Verifier Server

A minimal Express server demonstrating the Agility Protocol SDK verifier functionality.

## Setup

```bash
cd examples/node-verifier-server
npm install
```

## Run

```bash
npm start
```

Server will start on `http://localhost:3000`

## Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```

### Create ProofRequest

```bash
curl -X POST http://localhost:3000/request \
  -H "Content-Type: application/json" \
  -d '{
    "audience": "my-app",
    "requiredPermissions": ["age_over_18", "email_verified"],
    "ttlSeconds": 300
  }'
```

### Verify ProofResponse

```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "<requestId from /request>",
    "proof": { ... }
  }'
```

### Protocol Info

```bash
curl http://localhost:3000/protocol
```

## Integration Flow

1. Verifier creates a ProofRequest via `POST /request`
2. Prover receives the request and generates a ConsentGrant + ProofResponse
3. Prover submits the proof via `POST /verify`
4. Verifier returns verification result

## SDK Usage

This server uses the Agility SDK:

```javascript
import { Verifier, PROTOCOL_VERSION } from '@agility/sdk';

const verifier = new Verifier({ persistence, logger });

// Create request
const request = await verifier.createProofRequest({
  audience: 'my-app',
  requiredPermissions: ['age_over_18'],
});

// Verify proof
const result = verifier.verifyProof({ request, proof });
console.log(result.valid); // true/false
```
