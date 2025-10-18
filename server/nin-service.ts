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
 * - NIMC_API_URL: NIMC API base URL (e.g., https://api.nimc.gov.ng/v1)
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

  // NIN must be exactly 11 digits
  const ninRegex = /^\d{11}$/;
  return ninRegex.test(nin.trim());
}

/**
 * NIN Verification Service
 * Handles verification of National Identification Numbers against NIMC API
 */
export class NINService {
  private readonly nimcApiKey: string;
  private readonly nimcApiUrl: string;

  constructor() {
    // Environment variables for NIMC API integration
    this.nimcApiKey = process.env.NIMC_API_KEY || "";
    this.nimcApiUrl = process.env.NIMC_API_URL || "";
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

    // Validate NIN format
    if (!validateNINFormat(request.nin)) {
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
      if (!this.nimcApiKey || !this.nimcApiUrl) {
        console.error("NIMC API credentials not configured");
        return {
          success: false,
          code: NINVerificationErrorCode.API_ERROR,
          message: "NIN verification service is not configured. Please contact support.",
        };
      }

      const response = await fetch(`${this.nimcApiUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.nimcApiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nin: request.nin,
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
        nin: request.nin,
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
