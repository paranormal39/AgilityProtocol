/**
 * Agility Protocol - Minimal Verifier Server
 * 
 * A simple Express server demonstrating the Agility SDK verifier functionality.
 * 
 * Endpoints:
 *   POST /request - Create a new ProofRequest
 *   POST /verify  - Verify a ProofResponse
 *   GET  /health  - Health check
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import from the parent agility-headless package
// In production, you would: import { createVerifier, ... } from '@agility/sdk'
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic import of the SDK from parent directory
const sdkPath = join(__dirname, '../../dist/sdk/index.js');
const { Verifier, PROTOCOL_VERSION } = await import(sdkPath);

const persistencePath = join(__dirname, '../../dist/persistence/JsonPersistence.js');
const { JsonPersistence } = await import(persistencePath);

const loggerPath = join(__dirname, '../../dist/utils/Logger.js');
const { ConsoleLogger } = await import(loggerPath);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize persistence and verifier
const persistence = new JsonPersistence('./.agility-verifier-data');
await persistence.initialize();

const logger = new ConsoleLogger('info');
const verifier = new Verifier({ persistence, logger });

// Store active requests for verification
const activeRequests = new Map();

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    protocolVersion: PROTOCOL_VERSION,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Create a new ProofRequest
 * 
 * Body: {
 *   audience: string,
 *   requiredPermissions: string[],
 *   ttlSeconds?: number
 * }
 */
app.post('/request', async (req, res) => {
  try {
    const { audience, requiredPermissions, ttlSeconds } = req.body;

    if (!audience || !requiredPermissions || !Array.isArray(requiredPermissions)) {
      return res.status(400).json({
        error: 'Invalid request body',
        required: { audience: 'string', requiredPermissions: 'string[]' },
      });
    }

    const request = await verifier.createProofRequest({
      audience,
      requiredPermissions,
      ttlSeconds: ttlSeconds || 300,
    });

    // Store for later verification
    activeRequests.set(request.requestId, request);

    console.log(`[Verifier] Created request: ${request.requestId}`);

    res.json({
      success: true,
      request,
    });
  } catch (error) {
    console.error('[Verifier] Error creating request:', error);
    res.status(500).json({
      error: 'Failed to create request',
      message: error.message,
    });
  }
});

/**
 * Verify a ProofResponse
 * 
 * Body: {
 *   requestId: string,
 *   proof: ProofResponse
 * }
 */
app.post('/verify', async (req, res) => {
  try {
    const { requestId, proof } = req.body;

    if (!requestId || !proof) {
      return res.status(400).json({
        error: 'Invalid request body',
        required: { requestId: 'string', proof: 'ProofResponse' },
      });
    }

    // Retrieve the original request
    const request = activeRequests.get(requestId);
    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: `No active request with ID: ${requestId}`,
      });
    }

    // Verify the proof
    const result = verifier.verifyProof({ request, proof });

    console.log(`[Verifier] Verified proof: ${proof.proofId} - ${result.valid ? 'VALID' : 'INVALID'}`);

    // Clean up if verified
    if (result.valid) {
      activeRequests.delete(requestId);
    }

    res.json({
      success: true,
      valid: result.valid,
      errors: result.errors,
      checks: result.checks,
    });
  } catch (error) {
    console.error('[Verifier] Error verifying proof:', error);
    res.status(500).json({
      error: 'Failed to verify proof',
      message: error.message,
    });
  }
});

/**
 * Get protocol info
 */
app.get('/protocol', (req, res) => {
  res.json({
    version: PROTOCOL_VERSION,
    name: 'agility',
    endpoints: {
      request: 'POST /request',
      verify: 'POST /verify',
      health: 'GET /health',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═'.repeat(50));
  console.log('  Agility Verifier Server');
  console.log('═'.repeat(50));
  console.log('');
  console.log(`  Protocol Version: ${PROTOCOL_VERSION}`);
  console.log(`  Server running on: http://localhost:${PORT}`);
  console.log('');
  console.log('  Endpoints:');
  console.log('    POST /request  - Create ProofRequest');
  console.log('    POST /verify   - Verify ProofResponse');
  console.log('    GET  /health   - Health check');
  console.log('    GET  /protocol - Protocol info');
  console.log('');
});
