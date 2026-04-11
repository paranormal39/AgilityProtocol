/**
 * Age Verification Examples
 * 
 * Demonstrates various age verification scenarios using QR-based proof exchange
 */

import { 
    createQRProofRequest, 
    createQRProofResponse,
    decodeQRProofRequest,
    decodeQRProofResponse,
    verifyQRProofResponse,
    generateMockConsentGrant,
    generateMockProof,
    extractRequestMetadata
} from '../qr/index.js';

// Mock customer deck with age permissions
const customerDeck = {
    age_over_18: true,
    age_over_21: false,
    age_over_25: false,
    kyc_verified: true,
    region_us: true,
    region_eu: false
};

/**
 * Example 1: Standard Bar Verification (18+)
 */
export function barAgeVerification() {
    console.log('=== Bar Age Verification (18+) ===');
    
    // Bar creates verification request
    const barRequestQR = createQRProofRequest({
        audience: 'downtown-bar.com',
        requiredPermissions: ['age_over_18'],
        protocolVersion: '1.0.0',
        metadata: {
            venue: 'Downtown Bar & Grill',
            purpose: 'Alcohol service verification',
            location: 'San Francisco, CA'
        }
    });
    
    console.log('Bar QR Request:', barRequestQR.substring(0, 50) + '...');
    
    // Customer scans request
    const request = decodeQRProofRequest(barRequestQR);
    const metadata = extractRequestMetadata(request);
    
    console.log('Request Details:');
    console.log('- Venue:', request.metadata?.venue);
    console.log('- Required:', request.requiredPermissions);
    console.log('- Risk Level:', metadata.riskLevel);
    
    // Customer approves and generates response
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, customerDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    console.log('Customer Response Generated');
    
    // Bar verifies response
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('Verification Result:', verification.valid ? '✅ PASSED' : '❌ FAILED');
    
    if (verification.valid) {
        console.log('Customer verified as 18+ - Entry granted');
    } else {
        console.log('Verification failed:', verification.errors);
    }
    
    return { request, responseQR, verification };
}

/**
 * Example 2: Casino Verification (21+)
 */
export function casinoAgeVerification() {
    console.log('\n=== Casino Age Verification (21+) ===');
    
    // Casino creates verification request
    const casinoRequestQR = createQRProofRequest({
        audience: 'grand-casino.com',
        requiredPermissions: ['age_over_21'],
        protocolVersion: '1.0.0',
        metadata: {
            venue: 'Grand Casino Resort',
            purpose: 'Gaming floor access',
            location: 'Las Vegas, NV',
            highValue: true
        }
    });
    
    const request = decodeQRProofRequest(casinoRequestQR);
    console.log('Casino Request for 21+ verification');
    
    // Customer attempts verification (will fail - only 18+)
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, customerDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('Verification Result:', verification.valid ? '✅ PASSED' : '❌ FAILED');
    
    if (!verification.valid) {
        console.log('Customer under 21 - Entry denied');
        console.log('Missing permissions:', verification.errors);
    }
    
    return { request, responseQR, verification };
}

/**
 * Example 3: Multi-tier Age Verification
 */
export function multiTierAgeVerification() {
    console.log('\n=== Multi-tier Age Verification ===');
    
    // Event with different access levels
    const eventRequestQR = createQRProofRequest({
        audience: 'music-festival.com',
        requiredPermissions: ['age_over_18'],
        protocolVersion: '1.0.0',
        metadata: {
            event: 'Summer Music Festival',
            purpose: 'General admission',
            tiers: {
                general: { age: '18+', areas: ['Main Stage', 'Food Court'] },
                vip: { age: '21+', areas: ['VIP Lounge', 'Bar Area'] },
                premium: { age: '25+', areas: ['Backstage', 'Artist Meet & Greet'] }
            }
        }
    });
    
    const request = decodeQRProofRequest(eventRequestQR);
    console.log('Multi-tier event verification');
    
    // Customer with 18+ access
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, customerDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('General Access (18+):', verification.valid ? '✅ GRANTED' : '❌ DENIED');
    
    // Try VIP access (21+)
    const vipRequestQR = createQRProofRequest({
        audience: 'music-festival.com',
        requiredPermissions: ['age_over_21'],
        protocolVersion: '1.0.0',
        metadata: { ...request.metadata, accessLevel: 'VIP' }
    });
    
    const vipRequest = decodeQRProofRequest(vipRequestQR);
    const vipGrant = generateMockConsentGrant(vipRequest);
    const vipProof = generateMockProof(vipRequest, customerDeck);
    const vipResponseQR = createQRProofResponse({ request: vipRequest, grant: vipGrant, proof: vipProof });
    
    const vipVerification = verifyQRProofResponse(vipRequest, vipResponseQR);
    console.log('VIP Access (21+):', vipVerification.valid ? '✅ GRANTED' : '❌ DENIED');
    
    return { 
        general: { request, verification },
        vip: { request: vipRequest, verification: vipVerification }
    };
}

/**
 * Example 4: Online Age Gate
 */
export function onlineAgeGate() {
    console.log('\n=== Online Age Gate Verification ===');
    
    // Website creates age verification request
    const websiteRequestQR = createQRProofRequest({
        audience: 'adult-content-site.com',
        requiredPermissions: ['age_over_18'],
        protocolVersion: '1.0.0',
        metadata: {
            website: 'Adult Content Platform',
            purpose: 'Age-restricted content access',
            sessionId: 'sess_abc123',
            returnUrl: 'https://adult-content-site.com/verify-complete'
        }
    });
    
    const request = decodeQRProofRequest(websiteRequestQR);
    console.log('Online age gate for restricted content');
    
    // Customer verifies age
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, customerDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('Online Access:', verification.valid ? '✅ GRANTED' : '❌ DENIED');
    
    if (verification.valid) {
        console.log('Session authenticated for adult content');
        console.log('User can now access restricted materials');
    }
    
    return { request, responseQR, verification };
}

/**
 * Example 5: Travel Age Verification
 */
export function travelAgeVerification() {
    console.log('\n=== Travel Age Verification ===');
    
    // Airline creates verification request
    const airlineRequestQR = createQRProofRequest({
        audience: 'airline-example.com',
        requiredPermissions: ['age_over_18'],
        protocolVersion: '1.0.0',
        metadata: {
            airline: 'Example Airlines',
            purpose: 'Unaccompanied minor check',
            flightNumber: 'EA123',
            departure: 'SFO',
            arrival: 'JFK'
        }
    });
    
    const request = decodeQRProofRequest(airlineRequestQR);
    console.log('Airline age verification for flight EA123');
    
    // Customer verifies age
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, customerDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('Travel Eligibility:', verification.valid ? '✅ ADULT' : '❌ MINOR');
    
    if (verification.valid) {
        console.log('Passenger verified as adult - can travel alone');
    } else {
        console.log('Passenger is minor - requires guardian accompaniment');
    }
    
    return { request, responseQR, verification };
}

/**
 * Example 6: Batch Age Verification
 */
export function batchAgeVerification() {
    console.log('\n=== Batch Age Verification ===');
    
    // Tour group verification
    const groupRequestQR = createQRProofRequest({
        audience: 'tour-company.com',
        requiredPermissions: ['age_over_21'],
        protocolVersion: '1.0.0',
        metadata: {
            tour: 'Winery Tour Experience',
            purpose: 'Alcohol tasting eligibility',
            groupId: 'TOUR-456',
            maxParticipants: 20
        }
    });
    
    const request = decodeQRProofRequest(groupRequestQR);
    console.log('Group verification for winery tour');
    
    // Simulate multiple customers
    const customers = [
        { id: 'cust1', deck: { age_over_21: true }, name: 'Alice' },
        { id: 'cust2', deck: { age_over_21: true }, name: 'Bob' },
        { id: 'cust3', deck: { age_over_21: false }, name: 'Charlie' },
        { id: 'cust4', deck: { age_over_21: true }, name: 'Diana' }
    ];
    
    const results = customers.map(customer => {
        const grant = generateMockConsentGrant(request);
        const proof = generateMockProof(request, customer.deck);
        const responseQR = createQRProofResponse({ request, grant, proof });
        const verification = verifyQRProofResponse(request, responseQR);
        
        console.log(`${customer.name}: ${verification.valid ? '✅ ELIGIBLE' : '❌ INELIGIBLE'}`);
        
        return { customer, verification };
    });
    
    const eligible = results.filter(r => r.verification.valid).length;
    const ineligible = results.length - eligible;
    
    console.log(`Group Summary: ${eligible} eligible, ${ineligible} ineligible`);
    
    return { request, results, eligible, ineligible };
}

/**
 * Run all age verification examples
 */
export function runAgeVerificationExamples() {
    console.log('🎂 Age Verification Examples\n');
    
    barAgeVerification();
    casinoAgeVerification();
    multiTierAgeVerification();
    onlineAgeGate();
    travelAgeVerification();
    batchAgeVerification();
    
    console.log('\n✅ All age verification examples completed');
}

// Export examples for individual testing
export const examples = {
    barAgeVerification,
    casinoAgeVerification,
    multiTierAgeVerification,
    onlineAgeGate,
    travelAgeVerification,
    batchAgeVerification,
    runAll: runAgeVerificationExamples
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAgeVerificationExamples();
}
