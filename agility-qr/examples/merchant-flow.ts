/**
 * Merchant Flow Examples
 * 
 * Demonstrates complete merchant-courier split-knowledge commerce scenarios
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

// Mock customer decks with separated data
const customerOrderDeck = {
    order_paid: true,
    age_over_18: true,
    age_over_21: false,
    premium_member: true,
    kyc_verified: true
};

const customerShippingDeck = {
    shipping_address: true,
    delivery_instructions: true,
    contact_phone: true,
    preferred_time: true
};

/**
 * Example 1: Complete E-commerce Flow
 */
export function completeEcommerceFlow() {
    console.log('=== Complete E-commerce Flow ===');
    
    // Step 1: Merchant creates order verification request
    const merchantRequestQR = createQRProofRequest({
        audience: 'electronics-store.com',
        requiredPermissions: ['order_paid', 'age_over_18'],
        protocolVersion: '1.0.0',
        metadata: {
            orderId: 'ORD-2024-001',
            merchant: 'Electronics Store',
            amount: 1299.99,
            currency: 'USD',
            items: ['Premium Laptop', 'Extended Warranty'],
            restricted: true
        }
    });
    
    console.log('1. Merchant creates order verification request');
    const merchantRequest = decodeQRProofRequest(merchantRequestQR);
    console.log(`   Order: ${merchantRequest.metadata?.orderId}`);
    console.log(`   Amount: ${merchantRequest.metadata?.amount} ${merchantRequest.metadata?.currency}`);
    console.log(`   Required: ${merchantRequest.requiredPermissions.join(', ')}`);
    
    // Step 2: Customer approves order verification
    const orderGrant = generateMockConsentGrant(merchantRequest);
    const orderProof = generateMockProof(merchantRequest, customerOrderDeck);
    const orderResponseQR = createQRProofResponse({ 
        request: merchantRequest, 
        grant: orderGrant, 
        proof: orderProof 
    });
    
    const orderVerification = verifyQRProofResponse(merchantRequest, orderResponseQR);
    console.log('2. Customer order verification:', orderVerification.valid ? '✅ APPROVED' : '❌ REJECTED');
    
    if (!orderVerification.valid) {
        console.log('   Order cannot proceed - verification failed');
        return;
    }
    
    // Step 3: Courier creates address request (separate from merchant)
    const courierRequestQR = createQRProofRequest({
        audience: 'quick-delivery.com',
        requiredPermissions: ['shipping_address'],
        protocolVersion: '1.0.0',
        metadata: {
            deliveryId: 'DEL-2024-001',
            courier: 'Quick Delivery Service',
            merchant: 'Electronics Store',
            urgency: 'standard'
        }
    });
    
    console.log('3. Courier creates address request (separate from merchant)');
    const courierRequest = decodeQRProofRequest(courierRequestQR);
    console.log(`   Delivery: ${courierRequest.metadata?.deliveryId}`);
    
    // Step 4: Customer shares delivery address
    const shippingGrant = generateMockConsentGrant(courierRequest);
    const shippingProof = generateMockProof(courierRequest, customerShippingDeck);
    const shippingResponseQR = createQRProofResponse({ 
        request: courierRequest, 
        grant: shippingGrant, 
        proof: shippingProof 
    });
    
    const shippingVerification = verifyQRProofResponse(courierRequest, shippingResponseQR);
    console.log('4. Customer address verification:', shippingVerification.valid ? '✅ SHARED' : '❌ FAILED');
    
    // Step 5: Complete flow summary
    console.log('5. Flow Summary:');
    console.log('   ✅ Merchant: Order verified, payment confirmed, age checked');
    console.log('   ✅ Customer: Address shared with courier only');
    console.log('   ✅ Courier: Delivery address received, no order details');
    console.log('   ✅ Privacy: Split-knowledge maintained throughout');
    
    return {
        merchant: { request: merchantRequest, verification: orderVerification },
        courier: { request: courierRequest, verification: shippingVerification }
    };
}

/**
 * Example 2: Age-Restricted Product Flow
 */
export function ageRestrictedProductFlow() {
    console.log('\n=== Age-Restricted Product Flow ===');
    
    // Step 1: Merchant sells age-restricted item
    const restrictedOrderQR = createQRProofRequest({
        audience: 'wine-shop.com',
        requiredPermissions: ['order_paid', 'age_over_21'],
        protocolVersion: '1.0.0',
        metadata: {
            orderId: 'WINE-2024-001',
            merchant: 'Premium Wine Shop',
            amount: 89.99,
            items: ['Vintage Red Wine (21+)'],
            ageRestricted: true,
            requiresId: false // Using QR verification instead
        }
    });
    
    console.log('1. Wine shop order with 21+ age restriction');
    const restrictedRequest = decodeQRProofRequest(restrictedOrderQR);
    
    // Customer attempts verification (21+ required but only 18+ available)
    const restrictedGrant = generateMockConsentGrant(restrictedRequest);
    const restrictedProof = generateMockProof(restrictedRequest, customerOrderDeck);
    const restrictedResponseQR = createQRProofResponse({ 
        request: restrictedRequest, 
        grant: restrictedGrant, 
        proof: restrictedProof 
    });
    
    const restrictedVerification = verifyQRProofResponse(restrictedRequest, restrictedResponseQR);
    console.log('2. Age verification result:', restrictedVerification.valid ? '✅ PASSED' : '❌ FAILED');
    
    if (!restrictedVerification.valid) {
        console.log('   Customer under 21 - order blocked');
        console.log('   Suggest alternative: Non-alcoholic products');
        
        // Offer alternative
        const alternativeQR = createQRProofRequest({
            audience: 'wine-shop.com',
            requiredPermissions: ['order_paid'],
            protocolVersion: '1.0.0',
            metadata: {
                orderId: 'WINE-2024-001-ALT',
                merchant: 'Premium Wine Shop',
                amount: 29.99,
                items: ['Non-alcoholic Grape Juice'],
                ageRestricted: false
            }
        });
        
        console.log('3. Alternative order offered (no age restriction)');
        return { restricted: false, alternativeAvailable: true };
    }
    
    console.log('3. Customer verified 21+ - order proceeds to delivery');
    return { restricted: true, verified: true };
}

/**
 * Example 3: High-Value Item Security Flow
 */
export function highValueSecurityFlow() {
    console.log('\n=== High-Value Item Security Flow ===');
    
    // High-value item with enhanced security
    const highValueOrderQR = createQRProofRequest({
        audience: 'luxury-jewelry.com',
        requiredPermissions: ['order_paid', 'kyc_verified'],
        protocolVersion: '1.0.0',
        metadata: {
            orderId: 'LUX-2024-001',
            merchant: 'Luxury Jewelry Store',
            amount: 15000.00,
            currency: 'USD',
            items: ['Diamond Necklace'],
            highValue: true,
            insurance: 'required',
            specialHandling: true
        }
    });
    
    console.log('1. High-value jewelry order ($15,000)');
    const highValueRequest = decodeQRProofRequest(highValueOrderQR);
    
    // Customer with KYC verification
    const highValueDeck = {
        ...customerOrderDeck,
        kyc_verified: true
    };
    
    const highValueGrant = generateMockConsentGrant(highValueRequest);
    const highValueProof = generateMockProof(highValueRequest, highValueDeck);
    const highValueResponseQR = createQRProofResponse({ 
        request: highValueRequest, 
        grant: highValueGrant, 
        proof: highValueProof 
    });
    
    const highValueVerification = verifyQRProofResponse(highValueRequest, highValueResponseQR);
    console.log('2. High-value order verification:', highValueVerification.valid ? '✅ APPROVED' : '❌ REJECTED');
    
    if (highValueVerification.valid) {
        // Special courier for high-value items
        const secureCourierQR = createQRProofRequest({
            audience: 'secure-transport.com',
            requiredPermissions: ['shipping_address'],
            protocolVersion: '1.0.0',
            metadata: {
                deliveryId: 'SECURE-2024-001',
                courier: 'Secure Transport Service',
                securityLevel: 'high',
                insuranceRequired: true,
                signatureRequired: true,
                trackingLevel: 'realtime'
            }
        });
        
        console.log('3. Secure courier assigned for high-value delivery');
        console.log('   - Real-time tracking enabled');
        console.log('   - Signature required');
        console.log('   - Insurance coverage active');
        
        return { 
            highValue: true, 
            securityLevel: 'high',
            merchantVerified: highValueVerification.valid 
        };
    }
    
    return { highValue: false, merchantVerified: false };
}

/**
 * Example 4: Subscription Box Flow
 */
export function subscriptionBoxFlow() {
    console.log('\n=== Subscription Box Flow ===');
    
    // Monthly subscription with recurring verification
    const subscriptionQR = createQRProofRequest({
        audience: 'subscription-box.com',
        requiredPermissions: ['order_paid', 'age_over_18'],
        protocolVersion: '1.0.0',
        metadata: {
            subscriptionId: 'SUB-2024-001',
            merchant: 'Mystery Box Company',
            amount: 49.99,
            frequency: 'monthly',
            boxType: 'adult-themed',
            autoRenew: true,
            nextBilling: '2024-02-01'
        }
    });
    
    console.log('1. Subscription box verification (recurring)');
    const subscriptionRequest = decodeQRProofRequest(subscriptionQR);
    
    const subscriptionGrant = generateMockConsentGrant(subscriptionRequest);
    const subscriptionProof = generateMockProof(subscriptionRequest, customerOrderDeck);
    const subscriptionResponseQR = createQRProofResponse({ 
        request: subscriptionRequest, 
        grant: subscriptionGrant, 
        proof: subscriptionProof 
    });
    
    const subscriptionVerification = verifyQRProofResponse(subscriptionRequest, subscriptionResponseQR);
    console.log('2. Subscription verification:', subscriptionVerification.valid ? '✅ ACTIVE' : '❌ BLOCKED');
    
    if (subscriptionVerification.valid) {
        console.log('3. Subscription benefits:');
        console.log('   ✅ Monthly box processing');
        console.log('   ✅ Recurring billing maintained');
        console.log('   ✅ Age requirement satisfied');
        console.log('   ✅ Future deliveries auto-approved');
        
        // Future deliveries don't need re-verification
        console.log('4. Future deliveries: Auto-approved (valid for 1 year)');
    }
    
    return { 
        subscription: true,
        autoApproved: subscriptionVerification.valid,
        renewalDate: subscriptionRequest.metadata?.nextBilling
    };
}

/**
 * Example 5: Multi-Merchant Marketplace Flow
 */
export function marketplaceFlow() {
    console.log('\n=== Multi-Merchant Marketplace Flow ===');
    
    // Customer buys from multiple sellers in one order
    const marketplaceOrderQR = createQRProofRequest({
        audience: 'marketplace.com',
        requiredPermissions: ['order_paid', 'age_over_18'],
        protocolVersion: '1.0.0',
        metadata: {
            orderId: 'MARKET-2024-001',
            marketplace: 'Global Marketplace',
            totalAmount: 245.67,
            sellers: [
                { id: 'seller1', name: 'Electronics Plus', amount: 129.99 },
                { id: 'seller2', name: 'Book Store', amount: 45.68 },
                { id: 'seller3', name: 'Gadget Shop', amount: 70.00 }
            ],
            items: ['Headphones', 'Books', 'Phone Case'],
            consolidatedShipping: true
        }
    });
    
    console.log('1. Multi-seller marketplace order');
    const marketplaceRequest = decodeQRProofRequest(marketplaceOrderQR);
    const sellers = marketplaceRequest.metadata?.sellers || [];
    
    console.log(`   Sellers: ${sellers.length}`);
    sellers.forEach((seller: any) => {
        console.log(`   - ${seller.name}: $${seller.amount}`);
    });
    
    // Single verification for entire marketplace order
    const marketplaceGrant = generateMockConsentGrant(marketplaceRequest);
    const marketplaceProof = generateMockProof(marketplaceRequest, customerOrderDeck);
    const marketplaceResponseQR = createQRProofResponse({ 
        request: marketplaceRequest, 
        grant: marketplaceGrant, 
        proof: marketplaceProof 
    });
    
    const marketplaceVerification = verifyQRProofResponse(marketplaceRequest, marketplaceResponseQR);
    console.log('2. Marketplace verification:', marketplaceVerification.valid ? '✅ APPROVED' : '❌ REJECTED');
    
    if (marketplaceVerification.valid) {
        console.log('3. Order processing:');
        console.log('   ✅ All sellers notified of payment');
        console.log('   ✅ Consolidated shipping arranged');
        console.log('   ✅ Single courier for all items');
        
        // Consolidated delivery
        const consolidatedCourierQR = createQRProofRequest({
            audience: 'consolidated-delivery.com',
            requiredPermissions: ['shipping_address'],
            protocolVersion: '1.0.0',
            metadata: {
                deliveryId: 'CONSOLIDATED-2024-001',
                packageCount: sellers.length,
                totalValue: marketplaceRequest.metadata?.totalAmount,
                sellers: sellers.map((s: any) => s.id)
            }
        });
        
        console.log('4. Consolidated delivery arranged');
    }
    
    return {
        marketplace: true,
        sellerCount: sellers.length,
        verified: marketplaceVerification.valid
    };
}

/**
 * Run all merchant flow examples
 */
export function runMerchantFlowExamples() {
    console.log('🛒 Merchant Flow Examples\n');
    
    completeEcommerceFlow();
    ageRestrictedProductFlow();
    highValueSecurityFlow();
    subscriptionBoxFlow();
    marketplaceFlow();
    
    console.log('\n✅ All merchant flow examples completed');
}

// Export examples for individual testing
export const examples = {
    completeEcommerceFlow,
    ageRestrictedProductFlow,
    highValueSecurityFlow,
    subscriptionBoxFlow,
    marketplaceFlow,
    runAll: runMerchantFlowExamples
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMerchantFlowExamples();
}
