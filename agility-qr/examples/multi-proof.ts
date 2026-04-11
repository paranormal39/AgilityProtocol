/**
 * Multi-Proof Examples
 * 
 * Demonstrates complex scenarios requiring multiple permissions and proofs
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

// Comprehensive customer deck
const comprehensiveDeck = {
    age_over_18: true,
    age_over_21: false,
    kyc_verified: true,
    premium_member: true,
    region_us: true,
    region_eu: false,
    student_status: true,
    veteran_status: false,
    disability_access: false,
    business_verified: true,
    professional_license: true,
    vaccination_status: true,
    insurance_active: true
};

/**
 * Example 1: Travel Verification Bundle
 */
export function travelVerificationBundle() {
    console.log('=== Travel Verification Bundle ===');
    
    // Complex travel requirements
    const travelQR = createQRProofRequest({
        audience: 'international-airlines.com',
        requiredPermissions: [
            'age_over_18',
            'kyc_verified', 
            'vaccination_status',
            'region_us'
        ],
        protocolVersion: '1.0.0',
        metadata: {
            flightId: 'FLIGHT-789',
            airline: 'International Airlines',
            route: 'SFO -> LHR',
            departure: '2024-02-15T10:30:00Z',
            purpose: 'International travel verification',
            requirements: {
                age: 'Adult passenger required',
                identity: 'Government ID verified',
                health: 'Vaccination certificate',
                residency: 'US resident for customs'
            }
        }
    });
    
    console.log('1. International travel verification request');
    const request = decodeQRProofRequest(travelQR);
    console.log(`   Flight: ${request.metadata?.route}`);
    console.log(`   Required permissions: ${request.requiredPermissions.length}`);
    
    // Customer provides comprehensive proof
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, comprehensiveDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Travel bundle verification:', verification.valid ? '✅ APPROVED' : '❌ REJECTED');
    
    if (verification.valid) {
        console.log('3. Travel permissions verified:');
        console.log('   ✅ Age: Adult passenger confirmed');
        console.log('   ✅ Identity: KYC verified');
        console.log('   ✅ Health: Vaccination status valid');
        console.log('   ✅ Residency: US region confirmed');
        console.log('   🎫 Boarding pass issued');
        console.log('   🛃 Pre-clearance eligible');
        
        return {
            flightId: request.metadata?.flightId,
            status: 'cleared_for_travel',
            permissions: request.requiredPermissions,
            boardingPass: true
        };
    }
    
    console.log('   Missing requirements:', verification.errors);
    return { flightId: request.metadata?.flightId, status: 'verification_failed' };
}

/**
 * Example 2: Financial Services Bundle
 */
export function financialServicesBundle() {
    console.log('\n=== Financial Services Bundle ===');
    
    // Complex financial verification
    const financialQR = createQRProofRequest({
        audience: 'premier-bank.com',
        requiredPermissions: [
            'kyc_verified',
            'age_over_18',
            'business_verified',
            'insurance_active'
        ],
        protocolVersion: '1.0.0',
        metadata: {
            service: 'Premium Business Account',
            institution: 'Premier Bank',
            purpose: 'High-value financial services',
            riskLevel: 'high',
            creditLimit: 50000,
            requirements: {
                identity: 'Full KYC verification',
                age: 'Legal adult status',
                business: 'Registered business entity',
                insurance: 'Professional liability coverage'
            }
        }
    });
    
    console.log('1. Premium financial services request');
    const request = decodeQRProofRequest(financialQR);
    console.log(`   Service: ${request.metadata?.service}`);
    console.log(`   Credit limit: $${request.metadata?.creditLimit}`);
    
    // Business customer verification
    const businessDeck = {
        ...comprehensiveDeck,
        business_verified: true,
        insurance_active: true,
        professional_license: true
    };
    
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, businessDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Financial bundle verification:', verification.valid ? '✅ APPROVED' : '❌ REJECTED');
    
    if (verification.valid) {
        console.log('3. Financial services enabled:');
        console.log('   ✅ Identity: Full KYC complete');
        console.log('   ✅ Age: Legal adult confirmed');
        console.log('   ✅ Business: Entity verified');
        console.log('   ✅ Insurance: Coverage active');
        console.log('   💳 Credit limit: $50,000 approved');
        console.log('   🏦 Premium account opened');
        console.log('   📊 Investment access granted');
        
        return {
            service: request.metadata?.service,
            status: 'premium_approved',
            creditLimit: request.metadata?.creditLimit,
            accountType: 'premium_business'
        };
    }
    
    return { service: request.metadata?.service, status: 'standard_only' };
}

/**
 * Example 3: Healthcare Access Bundle
 */
export function healthcareAccessBundle() {
    console.log('\n=== Healthcare Access Bundle ===');
    
    // Healthcare system with multiple requirements
    const healthcareQR = createQRProofRequest({
        audience: 'regional-hospital.com',
        requiredPermissions: [
            'age_over_18',
            'kyc_verified',
            'insurance_active',
            'vaccination_status',
            'region_us'
        ],
        protocolVersion: '1.0.0',
        metadata: {
            service: 'Specialized Medical Treatment',
            provider: 'Regional Medical Center',
            department: 'Specialized Care Unit',
            purpose: 'Medical treatment verification',
            urgency: 'standard',
            requirements: {
                age: 'Adult consent required',
                identity: 'Patient identification',
                insurance: 'Valid coverage required',
                health: 'Vaccination record',
                residency: 'Local resident required'
            }
        }
    });
    
    console.log('1. Healthcare access verification request');
    const request = decodeQRProofRequest(healthcareQR);
    console.log(`   Department: ${request.metadata?.department}`);
    console.log(`   Requirements: ${request.requiredPermissions.length} checks`);
    
    // Patient verification
    const patientDeck = {
        ...comprehensiveDeck,
        age_over_18: true,
        kyc_verified: true,
        insurance_active: true,
        vaccination_status: true,
        region_us: true
    };
    
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, patientDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Healthcare bundle verification:', verification.valid ? '✅ CLEARED' : '❌ BLOCKED');
    
    if (verification.valid) {
        console.log('3. Healthcare access granted:');
        console.log('   ✅ Age: Adult consent confirmed');
        console.log('   ✅ Identity: Patient verified');
        console.log('   ✅ Insurance: Coverage active');
        console.log('   ✅ Health: Vaccination current');
        console.log('   ✅ Residency: Local patient');
        console.log('   🏥 Treatment access approved');
        console.log('   💊 Pharmacy access enabled');
        console.log('   📋 Electronic health record linked');
        
        return {
            provider: request.metadata?.provider,
            status: 'treatment_approved',
            department: request.metadata?.department,
            accessLevel: 'full'
        };
    }
    
    return { provider: request.metadata?.provider, status: 'verification_required' };
}

/**
 * Example 4: Education Verification Bundle
 */
export function educationVerificationBundle() {
    console.log('\n=== Education Verification Bundle ===');
    
    // Educational institution with multiple requirements
    const educationQR = createQRProofRequest({
        audience: 'university.edu',
        requiredPermissions: [
            'age_over_18',
            'kyc_verified',
            'student_status',
            'region_us'
        ],
        protocolVersion: '1.0.0',
        metadata: {
            institution: 'State University',
            program: 'Graduate Studies Program',
            purpose: 'Student enrollment verification',
            semester: 'Fall 2024',
            requirements: {
                age: 'Adult student status',
                identity: 'Student identification',
                enrollment: 'Active student status',
                residency: 'In-state tuition eligibility'
            }
        }
    });
    
    console.log('1. University enrollment verification');
    const request = decodeQRProofRequest(educationQR);
    console.log(`   Program: ${request.metadata?.program}`);
    console.log(`   Semester: ${request.metadata?.semester}`);
    
    // Student verification
    const studentDeck = {
        ...comprehensiveDeck,
        age_over_18: true,
        kyc_verified: true,
        student_status: true,
        region_us: true
    };
    
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, studentDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Education bundle verification:', verification.valid ? '✅ ENROLLED' : '❌ REJECTED');
    
    if (verification.valid) {
        console.log('3. Educational access granted:');
        console.log('   ✅ Age: Adult student confirmed');
        console.log('   ✅ Identity: Student verified');
        console.log('   ✅ Enrollment: Active status');
        console.log('   ✅ Residency: In-state eligibility');
        console.log('   🎓 Student ID issued');
        console.log('   📚 Library access enabled');
        console.log('   💻 Campus network access');
        console.log('   🎨 Student discounts available');
        
        return {
            institution: request.metadata?.institution,
            status: 'enrolled',
            program: request.metadata?.program,
            tuitionRate: 'in_state'
        };
    }
    
    return { institution: request.metadata?.institution, status: 'enrollment_failed' };
}

/**
 * Example 5: Event Access Tiers
 */
export function eventAccessTiers() {
    console.log('\n=== Event Access Tiers ===');
    
    // Multi-tier event with different access levels
    const eventTiers = [
        {
            name: 'General Admission',
            permissions: ['age_over_18'],
            metadata: { tier: 'general', areas: ['Main Stage', 'Food Court'] }
        },
        {
            name: 'VIP Access',
            permissions: ['age_over_21', 'premium_member'],
            metadata: { tier: 'vip', areas: ['VIP Lounge', 'Bar', 'Backstage'] }
        },
        {
            name: 'All Access Pass',
            permissions: ['age_over_21', 'premium_member', 'business_verified'],
            metadata: { tier: 'all_access', areas: ['All Areas', 'Artist Meet & Greet'] }
        }
    ];
    
    console.log('1. Multi-tier event verification');
    
    const results = eventTiers.map(tier => {
        const tierQR = createQRProofRequest({
            audience: 'music-festival.com',
            requiredPermissions: tier.permissions,
            protocolVersion: '1.0.0',
            metadata: {
                event: 'Summer Music Festival 2024',
                ...tier.metadata
            }
        });
        
        const request = decodeQRProofRequest(tierQR);
        const grant = generateMockConsentGrant(request);
        const proof = generateMockProof(request, comprehensiveDeck);
        const responseQR = createQRProofResponse({ request, grant, proof });
        const verification = verifyQRProofResponse(request, responseQR);
        
        console.log(`   ${tier.name}: ${verification.valid ? '✅ GRANTED' : '❌ DENIED'}`);
        
        return {
            tier: tier.name,
            permissions: tier.permissions,
            granted: verification.valid,
            areas: tier.metadata.areas
        };
    });
    
    const grantedTiers = results.filter(r => r.granted);
    console.log(`2. Access summary: ${grantedTiers.length}/${results.length} tiers granted`);
    
    grantedTiers.forEach(tier => {
        console.log(`   ✅ ${tier.tier}: ${tier.areas.join(', ')}`);
    });
    
    return { results, grantedTiers, maxTier: grantedTiers[grantedTiers.length - 1]?.tier };
}

/**
 * Example 6: Government Services Bundle
 */
export function governmentServicesBundle() {
    console.log('\n=== Government Services Bundle ===');
    
    // Complex government service requirements
    const governmentQR = createQRProofRequest({
        audience: 'gov-services.gov',
        requiredPermissions: [
            'age_over_18',
            'kyc_verified',
            'region_us',
            'veteran_status'
        ],
        protocolVersion: '1.0.0',
        metadata: {
            service: 'Veterans Benefits Program',
            agency: 'Department of Veterans Affairs',
            purpose: 'Benefits eligibility verification',
            benefitType: 'comprehensive',
            requirements: {
                age: 'Adult citizen',
                identity: 'Federal verification',
                residency: 'US resident',
                service: 'Veteran status confirmation'
            }
        }
    });
    
    console.log('1. Government benefits verification');
    const request = decodeQRProofRequest(governmentQR);
    console.log(`   Agency: ${request.metadata?.agency}`);
    console.log(`   Benefit: ${request.metadata?.benefitType}`);
    
    // Veteran verification (will fail - not a veteran in mock deck)
    const veteranDeck = {
        ...comprehensiveDeck,
        veteran_status: false // Not a veteran
    };
    
    const grant = generateMockConsentGrant(request);
    const proof = generateMockProof(request, veteranDeck);
    const responseQR = createQRProofResponse({ request, grant, proof });
    
    const verification = verifyQRProofResponse(request, responseQR);
    console.log('2. Government bundle verification:', verification.valid ? '✅ ELIGIBLE' : '❌ INELIGIBLE');
    
    if (!verification.valid) {
        console.log('   Missing veteran status - benefits not available');
        
        // Try standard citizen benefits instead
        const citizenQR = createQRProofRequest({
            audience: 'gov-services.gov',
            requiredPermissions: ['age_over_18', 'kyc_verified', 'region_us'],
            protocolVersion: '1.0.0',
            metadata: {
                service: 'Standard Citizen Services',
                agency: 'General Services Administration',
                purpose: 'Basic services access'
            }
        });
        
        const citizenRequest = decodeQRProofRequest(citizenQR);
        const citizenGrant = generateMockConsentGrant(citizenRequest);
        const citizenProof = generateMockProof(citizenRequest, comprehensiveDeck);
        const citizenResponseQR = createQRProofResponse({ 
            request: citizenRequest, 
            grant: citizenGrant, 
            proof: citizenProof 
        });
        
        const citizenVerification = verifyQRProofResponse(citizenRequest, citizenResponseQR);
        console.log('3. Citizen services:', citizenVerification.valid ? '✅ AVAILABLE' : '❌ DENIED');
        
        return {
            veteranBenefits: false,
            citizenServices: citizenVerification.valid,
            recommendation: 'Apply for standard citizen benefits'
        };
    }
    
    return {
        veteranBenefits: true,
        citizenServices: true,
        recommendation: 'Full benefits package available'
    };
}

/**
 * Run all multi-proof examples
 */
export function runMultiProofExamples() {
    console.log('🔗 Multi-Proof Examples\n');
    
    travelVerificationBundle();
    financialServicesBundle();
    healthcareAccessBundle();
    educationVerificationBundle();
    eventAccessTiers();
    governmentServicesBundle();
    
    console.log('\n✅ All multi-proof examples completed');
}

// Export examples for individual testing
export const examples = {
    travelVerificationBundle,
    financialServicesBundle,
    healthcareAccessBundle,
    educationVerificationBundle,
    eventAccessTiers,
    governmentServicesBundle,
    runAll: runMultiProofExamples
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMultiProofExamples();
}
