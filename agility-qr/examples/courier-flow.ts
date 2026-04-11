/**
 * Courier Flow Examples
 * 
 * Demonstrates various delivery scenarios with split-knowledge verification
 */

import { 
    createQRProofRequest, 
    createQRProofResponse,
    decodeQRProofRequest,
    decodeQRProofResponse,
    verifyQRProofResponse,
    generateMockConsentGrant,
    generateMockProof
} from '../qr/index.js';

// Mock customer shipping deck
const customerShippingDeck = {
    shipping_address: true,
    delivery_instructions: true,
    contact_phone: true,
    preferred_time: true,
    special_handling: false,
    signature_required: true
};

/**
 * Example 1: Standard Package Delivery
 */
export function standardPackageDelivery() {
    console.log('=== Standard Package Delivery ===');
    
    // Courier creates address request
    const standardDeliveryQR = createQRProofRequest({
        audience: 'standard-delivery.com',
        requiredPermissions: ['shipping_address'],
        protocolVersion: '1.0.0',
        metadata: {
            deliveryId: 'STD-2024-001',
            courier: 'Standard Delivery Service',
            packageType: 'standard',
            estimatedTime: '2-3 business days',
            trackingNumber: 'TRK123456789'
        }
    });
    
    console.log('1. Standard delivery request created');
    const request = decodeQRProofRequest(standardDeliveryQR);
    console.log(`   Delivery ID: ${request.metadata?.deliveryId}`);
    console.log(`   Package Type: ${request.metadata?.packageType}`);
    console.log(`   Tracking: ${request.metadata?.trackingNumber}`);
    
    // Customer shares address
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, customerShippingDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Address verification:', verification.valid ? '✅ RECEIVED' : '❌ FAILED');
    
    if (verification.valid) {
        console.log('3. Delivery details available:');
        console.log('   📍 Address: 123 Main St, Apt 4B');
        console.log('   📞 Contact: Customer phone available');
        console.log('   ⏰ Preferred: Business hours');
        console.log('   ✍️  Signature: Required');
        
        return {
            deliveryId: request.metadata?.deliveryId,
            status: 'ready_for_delivery',
            addressShared: true
        };
    }
    
    return { deliveryId: request.metadata?.deliveryId, status: 'failed' };
}

/**
 * Example 2: Express Same-Day Delivery
 */
export function expressSameDayDelivery() {
    console.log('\n=== Express Same-Day Delivery ===');
    
    // Express delivery with time constraints
    const expressDeliveryQR = createQRProofRequest({
        audience: 'express-delivery.com',
        requiredPermissions: ['shipping_address', 'preferred_time'],
        protocolVersion: '1.0.0',
        metadata: {
            deliveryId: 'EXP-2024-001',
            courier: 'Express Delivery Service',
            packageType: 'express',
            urgency: 'same_day',
            deadline: '2024-01-15T18:00:00Z',
            realtimeTracking: true
        }
    });
    
    console.log('1. Express same-day delivery request');
    const request = decodeQRProofRequest(expressDeliveryQR);
    console.log(`   Deadline: ${request.metadata?.deadline}`);
    console.log(`   Real-time tracking: ${request.metadata?.realtimeTracking}`);
    
    // Customer provides address and time preferences
    const expressDeck = {
        ...customerShippingDeck,
        preferred_time: true
    };
    
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, expressDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Express verification:', verification.valid ? '✅ PRIORITY' : '❌ DELAYED');
    
    if (verification.valid) {
        console.log('3. Express delivery activated:');
        console.log('   🚀 Priority routing enabled');
        console.log('   ⏱️  Real-time GPS tracking');
        console.log('   📱 SMS notifications active');
        console.log('   ⚡  1-hour delivery window');
        
        return {
            deliveryId: request.metadata?.deliveryId,
            priority: 'high',
            tracking: 'realtime',
            eta: '2 hours'
        };
    }
    
    return { deliveryId: request.metadata?.deliveryId, priority: 'standard' };
}

/**
 * Example 3: Secure High-Value Delivery
 */
export function secureHighValueDelivery() {
    console.log('\n=== Secure High-Value Delivery ===');
    
    // High-value item with enhanced security
    const secureDeliveryQR = createQRProofRequest({
        audience: 'secure-transport.com',
        requiredPermissions: ['shipping_address', 'signature_required'],
        protocolVersion: '1.0.0',
        metadata: {
            deliveryId: 'SECURE-2024-001',
            courier: 'Secure Transport Service',
            packageType: 'high_value',
            insuranceRequired: true,
            photoVerification: true,
            idCheck: true,
            twoPersonDelivery: true
        }
    });
    
    console.log('1. Secure high-value delivery request');
    const request = decodeQRProofRequest(secureDeliveryQR);
    console.log('   Security requirements:');
    console.log('   - Insurance required');
    console.log('   - Photo verification');
    console.log('   - ID check at delivery');
    console.log('   - Two-person delivery team');
    
    // Customer agrees to security measures
    const secureDeck = {
        ...customerShippingDeck,
        signature_required: true,
        id_check: true
    };
    
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, secureDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Security verification:', verification.valid ? '✅ ARMED' : '❌ UNSECURED');
    
    if (verification.valid) {
        console.log('3. Security protocols activated:');
        console.log('   🔒 GPS-tracked vehicle');
        console.log('   📸 Photo documentation at delivery');
        console.log('   🆔 ID verification required');
        console.log('   👥 Two-person delivery team');
        console.log('   🛡️  Insurance coverage active');
        
        return {
            deliveryId: request.metadata?.deliveryId,
            securityLevel: 'maximum',
            protocols: ['gps', 'photo', 'id', 'insurance']
        };
    }
    
    return { deliveryId: request.metadata?.deliveryId, securityLevel: 'standard' };
}

/**
 * Example 4: Contactless Delivery
 */
export function contactlessDelivery() {
    console.log('\n=== Contactless Delivery ===');
    
    // Contactless delivery preferences
    const contactlessQR = createQRProofRequest({
        audience: 'contactless-delivery.com',
        requiredPermissions: ['shipping_address', 'delivery_instructions'],
        protocolVersion: '1.0.0',
        metadata: {
            deliveryId: 'CONTACT-2024-001',
            courier: 'Contactless Delivery Service',
            deliveryMethod: 'contactless',
            noSignature: true,
            photoProof: true,
            textNotification: true
        }
    });
    
    console.log('1. Contactless delivery request');
    const request = decodeQRProofRequest(contactlessQR);
    
    // Customer prefers contactless delivery
    const contactlessDeck = {
        ...customerShippingDeck,
        delivery_instructions: true,
        signature_required: false
    };
    
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, contactlessDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Contactless verification:', verification.valid ? '✅ ENABLED' : '❌ FAILED');
    
    if (verification.valid) {
        console.log('3. Contactless delivery setup:');
        console.log('   📷 Photo proof required');
        console.log('   📱 SMS notification on arrival');
        console.log('   🚪 Leave at door instructions');
        console.log('   ✍️  No signature required');
        console.log('   😷 Social distancing maintained');
        
        return {
            deliveryId: request.metadata?.deliveryId,
            method: 'contactless',
            proof: 'photo',
            notification: 'sms'
        };
    }
    
    return { deliveryId: request.metadata?.deliveryId, method: 'standard' };
}

/**
 * Example 5: Bulk Delivery Route
 */
export function bulkDeliveryRoute() {
    console.log('\n=== Bulk Delivery Route ===');
    
    // Courier with multiple deliveries on same route
    const bulkRouteQR = createQRProofRequest({
        audience: 'bulk-delivery.com',
        requiredPermissions: ['shipping_address'],
        protocolVersion: '1.0.0',
        metadata: {
            deliveryId: 'BULK-2024-001',
            courier: 'Bulk Delivery Service',
            routeId: 'ROUTE-ABC',
            totalStops: 5,
            optimizedRoute: true,
            sequenceNumber: 3
        }
    });
    
    console.log('1. Bulk route delivery request');
    const request = decodeQRProofRequest(bulkRouteQR);
    console.log(`   Route ID: ${request.metadata?.routeId}`);
    console.log(`   Total stops: ${request.metadata?.totalStops}`);
    console.log(`   This stop: ${request.metadata?.sequenceNumber} of ${request.metadata?.totalStops}`);
    
    // Customer provides address for route optimization
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, customerShippingDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Route verification:', verification.valid ? '✅ OPTIMIZED' : '❌ FAILED');
    
    if (verification.valid) {
        console.log('3. Route optimization details:');
        console.log('   🗺️  Added to optimized route');
        console.log('   ⏱️  ETA: 45 minutes');
        console.log('   📍 Stop 3 of 5 deliveries');
        console.log('   📊 Route efficiency: 92%');
        console.log('   ⛽ Fuel savings: 15%');
        
        return {
            deliveryId: request.metadata?.deliveryId,
            routeId: request.metadata?.routeId,
            stopNumber: request.metadata?.sequenceNumber,
            eta: '45 minutes',
            optimized: true
        };
    }
    
    return { deliveryId: request.metadata?.deliveryId, optimized: false };
}

/**
 * Example 6: International Delivery
 */
export function internationalDelivery() {
    console.log('\n=== International Delivery ===');
    
    // International shipping with customs
    const internationalQR = createQRProofRequest({
        audience: 'global-delivery.com',
        requiredPermissions: ['shipping_address'],
        protocolVersion: '1.0.0',
        metadata: {
            deliveryId: 'INTL-2024-001',
            courier: 'Global Delivery Service',
            origin: 'US',
            destination: 'CA',
            customsRequired: true,
            internationalTracking: true,
            dutiesPrepaid: true
        }
    });
    
    console.log('1. International delivery request');
    const request = decodeQRProofRequest(internationalQR);
    console.log(`   Origin: ${request.metadata?.origin}`);
    console.log(`   Destination: ${request.metadata?.destination}`);
    console.log(`   Customs: ${request.metadata?.customsRequired}`);
    
    // Customer provides international address
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, customerShippingDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. International verification:', verification.valid ? '✅ CLEARED' : '❌ HELD');
    
    if (verification.valid) {
        console.log('3. International shipping activated:');
        console.log('   🌍 Cross-border tracking active');
        console.log('   📋 Customs documentation prepared');
        console.log('   💰 Duties prepaid');
        console.log('   ✈️  Air freight selected');
        console.log('   📧 International notifications');
        
        return {
            deliveryId: request.metadata?.deliveryId,
            international: true,
            customs: 'cleared',
            tracking: 'global',
            estimatedDays: '5-7 business days'
        };
    }
    
    return { deliveryId: request.metadata?.deliveryId, international: false };
}

/**
 * Example 7: Failed Delivery Recovery
 */
export function failedDeliveryRecovery() {
    console.log('\n=== Failed Delivery Recovery ===');
    
    // Retry failed delivery
    const retryDeliveryQR = createQRProofRequest({
        audience: 'retry-delivery.com',
        requiredPermissions: ['shipping_address', 'contact_phone', 'preferred_time'],
        protocolVersion: '1.0.0',
        metadata: {
            deliveryId: 'RETRY-2024-001',
            courier: 'Retry Delivery Service',
            originalAttempt: '2024-01-14T15:30:00Z',
            failureReason: 'Customer not available',
            retryCount: 2,
            maxRetries: 3
        }
    });
    
    console.log('1. Failed delivery retry request');
    const request = decodeQRProofRequest(retryDeliveryQR);
    console.log(`   Original attempt: ${request.metadata?.originalAttempt}`);
    console.log(`   Failure reason: ${request.metadata?.failureReason}`);
    console.log(`   Retry attempt: ${request.metadata?.retryCount} of ${request.metadata?.maxRetries}`);
    
    // Customer provides updated preferences
    const retryDeck = {
        ...customerShippingDeck,
        contact_phone: true,
        preferred_time: true
    };
    
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, retryDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Retry verification:', verification.valid ? '✅ RESCHEDULED' : '❌ CANCELLED');
    
    if (verification.valid) {
        console.log('3. Recovery process initiated:');
        console.log('   📞 Customer contact confirmed');
        console.log('   ⏰ New delivery time scheduled');
        console.log('   📱 SMS reminder set');
        console.log('   🚚 Driver notified of special instructions');
        console.log('   📍 GPS coordinates verified');
        
        return {
            deliveryId: request.metadata?.deliveryId,
            status: 'rescheduled',
            retryCount: request.metadata?.retryCount,
            customerContacted: true
        };
    }
    
    return { deliveryId: request.metadata?.deliveryId, status: 'cancelled' };
}

/**
 * Run all courier flow examples
 */
export function runCourierFlowExamples() {
    console.log('🚚 Courier Flow Examples\n');
    
    standardPackageDelivery();
    expressSameDayDelivery();
    secureHighValueDelivery();
    contactlessDelivery();
    bulkDeliveryRoute();
    internationalDelivery();
    failedDeliveryRecovery();
    
    console.log('\n✅ All courier flow examples completed');
}

// Export examples for individual testing
export const examples = {
    standardPackageDelivery,
    expressSameDayDelivery,
    secureHighValueDelivery,
    contactlessDelivery,
    bulkDeliveryRoute,
    internationalDelivery,
    failedDeliveryRecovery,
    runAll: runCourierFlowExamples
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCourierFlowExamples();
}
