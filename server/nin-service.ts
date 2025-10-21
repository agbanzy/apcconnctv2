/**
 * NIN (National Identification Number) Verification Service
 * 
 * This service provides integration framework for Nigerian NIMC (National Identity Management Commission) API.
 * 
 * NIMC API Integration Setup:
 * ===========================
 * 
 * Required Environment Variables:
 * - NIMC_API_KEY: Your NIMC API authentication key
 * - NIMC_API_SECRET: Your NIMC API secret for request signing
 * - NIMC_BASE_URL: NIMC API base URL (e.g., https://api.nimc.gov.ng/v1)
 * 
 * NIMC API Endpoints:
 * - POST /verify - Verify NIN against personal details
 * 
 * Example NIMC API Request:
 * {
 *   "nin": "12345678901",
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "dateOfBirth": "1990-01-01"
 * }
 * 
 * Example NIMC API Response (Success):
 * {
 *   "status": "success",
 *   "data": {
 *     "verified": true,
 *     "nin": "12345678901",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "dateOfBirth": "1990-01-01",
 *     "phone": "080********",
 *     "photo": "base64_encoded_photo"
 *   }
 * }
 * 
 * Example NIMC API Response (Mismatch):
 * {
 *   "status": "error",
 *   "code": "MISMATCH",
 *   "message": "The provided details do not match the NIN record"
 * }
 */

export enum NINVerificationErrorCode {
  INVALID_FORMAT = "INVALID_FORMAT",
  API_ERROR = "API_ERROR",
  MISMATCH = "MISMATCH",
  VERIFIED = "VERIFIED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
}

export interface NINVerificationRequest {
  nin: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Format: YYYY-MM-DD
}

export interface NINVerificationResponse {
  success: boolean;
  code: NINVerificationErrorCode;
  message: string;
  data?: {
    nin: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    verified: boolean;
    verifiedAt?: Date;
  };
}

/**
 * Sanitizes NIN by removing spaces, dashes, and other non-numeric characters
 * 
 * @param nin - National Identification Number to sanitize
 * @returns Sanitized NIN containing only digits
 */
export function sanitizeNIN(nin: string): string {
  if (!nin || typeof nin !== 'string') {
    return '';
  }

  // Remove all non-numeric characters (spaces, dashes, etc.)
  return nin.replace(/\D/g, '');
}

/**
 * Validates NIN format
 * Nigerian NIN is 11 digits, numbers only
 * 
 * @param nin - National Identification Number to validate
 * @returns true if valid format, false otherwise
 */
export function validateNINFormat(nin: string): boolean {
  if (!nin || typeof nin !== 'string') {
    return false;
  }

  // Sanitize first, then validate
  const sanitized = sanitizeNIN(nin);
  
  // NIN must be exactly 11 digits
  const ninRegex = /^\d{11}$/;
  return ninRegex.test(sanitized);
}

/**
 * NIN Verification Service
 * Handles verification of National Identification Numbers against NIMC API
 */
export class NINService {
  private readonly nimcApiKey: string;
  private readonly nimcApiSecret: string;
  private readonly nimcBaseUrl: string;

  constructor() {
    // Environment variables for NIMC API integration
    this.nimcApiKey = process.env.NIMC_API_KEY || "";
    this.nimcApiSecret = process.env.NIMC_API_SECRET || "";
    this.nimcBaseUrl = process.env.NIMC_BASE_URL || "";

    // Validate configuration and log warnings
    this.validateConfiguration();
  }

  /**
   * Validate NIN service configuration
   * Logs warnings if running in simulation mode or missing required variables
   */
  private validateConfiguration(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const isConfigured = !!(this.nimcApiKey && this.nimcApiSecret && this.nimcBaseUrl);

    if (!isConfigured) {
      if (isProduction) {
        console.warn('\n⚠️  WARNING: NIN verification service running in SIMULATION mode in production');
        console.warn('   NIN verifications will use mock responses, not real NIMC API');
        console.warn('   Set NIMC_API_KEY, NIMC_API_SECRET, and NIMC_BASE_URL environment variables\n');
      } else {
        console.log('🆔 NIN Service: Simulation mode (NIMC API not configured)');
      }
    } else {
      console.log(`🆔 NIN Service: Configured (${this.nimcBaseUrl})`);
    }
  }

  /**
   * Health check method to verify NIN service configuration
   * @returns Object with health status and details
   */
  getHealthCheck(): {
    status: 'ok' | 'warning' | 'error';
    configured: boolean;
    simulation: boolean;
    message: string;
  } {
    const isConfigured = !!(this.nimcApiKey && this.nimcApiSecret && this.nimcBaseUrl);

    if (!isConfigured) {
      return {
        status: 'warning',
        configured: false,
        simulation: true,
        message: 'NIN verification service running in simulation mode - NIMC API not configured'
      };
    }

    return {
      status: 'ok',
      configured: true,
      simulation: false,
      message: 'NIN verification service configured with NIMC API'
    };
  }

  /**
   * Check if a NIN is already verified in the database
   * 
   * This method queries the database to determine if a given NIN
   * has already been verified for any member in the system.
   * 
   * Use Cases:
   * - Prevent duplicate NIN usage across multiple accounts
   * - Check verification status before initiating new verification
   * - Display verification status to users
   * 
   * @param nin - National Identification Number to check
   * @returns Object containing verification status and member details if found
   */
  async checkNINStatus(nin: string): Promise<{
    isVerified: boolean;
    exists: boolean;
    memberId?: string;
    verifiedAt?: Date;
    attempts?: number;
  }> {
    // This method requires database access
    // Import required: import { db } from './db';
    // Import required: import { members } from '@shared/schema';
    // Import required: import { eq } from 'drizzle-orm';
    
    console.log("=== Checking NIN Status ===");
    console.log("NIN:", nin);
    
    // Sanitize NIN before checking
    const sanitizedNIN = sanitizeNIN(nin);
    
    if (!validateNINFormat(sanitizedNIN)) {
      console.log("Invalid NIN format");
      return {
        isVerified: false,
        exists: false,
      };
    }

    // DATABASE INTEGRATION POINT:
    // ============================
    // Uncomment the following code when ready to integrate with database:
    /*
    try {
      const member = await db.query.members.findFirst({
        where: eq(members.nin, sanitizedNIN),
      });

      if (!member) {
        console.log("NIN not found in database");
        return {
          isVerified: false,
          exists: false,
        };
      }

      console.log("NIN found in database");
      console.log("Member ID:", member.memberId);
      console.log("Verified:", member.ninVerified);
      console.log("Attempts:", member.ninVerificationAttempts);

      return {
        isVerified: member.ninVerified || false,
        exists: true,
        memberId: member.memberId,
        verifiedAt: member.ninVerifiedAt || undefined,
        attempts: member.ninVerificationAttempts || 0,
      };
    } catch (error) {
      console.error("Database error while checking NIN status:", error);
      return {
        isVerified: false,
        exists: false,
      };
    }
    */

    // Mock response (for testing without database)
    console.log("MOCK: NIN not found in database");
    return {
      isVerified: false,
      exists: false,
    };
  }

  /**
   * Verify NIN against personal details
   * 
   * Rate Limiting Considerations:
   * - Maximum 10 NIN verification attempts per member (enforced at database level)
   * - Maximum 3 verification attempts per day (enforced at API endpoint level)
   * 
   * @param request - NIN verification request containing NIN and personal details
   * @returns Verification response with success status and details
   */
  async verifyNIN(request: NINVerificationRequest): Promise<NINVerificationResponse> {
    console.log("=== NIN Verification Request ===");
    console.log("NIN:", request.nin);
    console.log("First Name:", request.firstName);
    console.log("Last Name:", request.lastName);
    console.log("Date of Birth:", request.dateOfBirth);
    console.log("===============================");

    // Sanitize NIN (remove spaces, dashes, etc.)
    const sanitizedNIN = sanitizeNIN(request.nin);
    console.log("Sanitized NIN:", sanitizedNIN);

    // Validate NIN format
    if (!validateNINFormat(sanitizedNIN)) {
      console.log("Validation Failed: Invalid NIN format");
      return {
        success: false,
        code: NINVerificationErrorCode.INVALID_FORMAT,
        message: "Invalid NIN format. NIN must be exactly 11 digits.",
      };
    }

    // NIMC API Integration Point
    // ===========================
    // Uncomment the following code when ready to integrate with actual NIMC API:
    /*
    try {
      if (!this.nimcApiKey || !this.nimcApiSecret || !this.nimcBaseUrl) {
        console.error("NIMC API credentials not configured");
        return {
          success: false,
          code: NINVerificationErrorCode.API_ERROR,
          message: "NIN verification service is not configured. Please contact support.",
        };
      }

      const response = await fetch(`${this.nimcBaseUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.nimcApiKey}`,
          'X-API-Secret': this.nimcApiSecret,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nin: sanitizedNIN,
          firstName: request.firstName,
          lastName: request.lastName,
          dateOfBirth: request.dateOfBirth,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("NIMC API Error:", response.status, errorData);
        
        return {
          success: false,
          code: NINVerificationErrorCode.API_ERROR,
          message: errorData.message || "Failed to verify NIN with NIMC service.",
        };
      }

      const data = await response.json();

      if (data.status === 'success' && data.data.verified) {
        console.log("NIMC Verification Successful");
        return {
          success: true,
          code: NINVerificationErrorCode.VERIFIED,
          message: "NIN verified successfully",
          data: {
            nin: data.data.nin,
            firstName: data.data.firstName,
            lastName: data.data.lastName,
            dateOfBirth: data.data.dateOfBirth,
            verified: true,
            verifiedAt: new Date(),
          },
        };
      } else {
        console.log("NIMC Verification Failed: Details mismatch");
        return {
          success: false,
          code: NINVerificationErrorCode.MISMATCH,
          message: "The provided details do not match the NIN record.",
        };
      }
    } catch (error) {
      console.error("NIMC API Request Error:", error);
      return {
        success: false,
        code: NINVerificationErrorCode.API_ERROR,
        message: "An error occurred while verifying NIN. Please try again later.",
      };
    }
    */

    // Mock Verification Logic (for testing purposes)
    // ===============================================
    // This mock logic simulates successful verification for testing.
    // Remove this when integrating with actual NIMC API.

    console.log("Using MOCK verification (for testing)");
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock successful verification for all valid NIN formats
    console.log("MOCK: Verification successful");
    return {
      success: true,
      code: NINVerificationErrorCode.VERIFIED,
      message: "NIN verified successfully (MOCK)",
      data: {
        nin: sanitizedNIN,
        firstName: request.firstName,
        lastName: request.lastName,
        dateOfBirth: request.dateOfBirth,
        verified: true,
        verifiedAt: new Date(),
      },
    };

    // To simulate mismatch error for testing, you can use:
    // return {
    //   success: false,
    //   code: NINVerificationErrorCode.MISMATCH,
    //   message: "The provided details do not match the NIN record (MOCK).",
    // };
  }
}

// Export singleton instance
export const ninService = new NINService();
