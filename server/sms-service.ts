/**
 * SMS Service Module for APC Connect
 * 
 * This module provides SMS notification functionality with support for multiple providers:
 * - Twilio (International standard)
 * - Termii (Nigerian SMS provider)
 * - Africa's Talking (Pan-African provider)
 * 
 * Configuration:
 * Set the following environment variables:
 * - SMS_PROVIDER: "twilio" | "termii" | "africas_talking"
 * - SMS_SENDER_ID: Sender name (e.g., "APC")
 * 
 * For Twilio:
 * - TWILIO_ACCOUNT_SID: Your Twilio account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio auth token
 * - TWILIO_PHONE_NUMBER: Your Twilio phone number
 * 
 * For Termii:
 * - TERMII_API_KEY: Your Termii API key
 * - TERMII_SENDER_ID: Your registered sender ID
 * 
 * For Africa's Talking:
 * - AFRICAS_TALKING_API_KEY: Your Africa's Talking API key
 * - AFRICAS_TALKING_USERNAME: Your Africa's Talking username
 */

// Types for SMS data
export interface EventReminderData {
  name: string;
  event: string;
  date: string;
  location: string;
}

export interface ElectionNoticeData {
  name: string;
  election: string;
  date: string;
}

export interface DuesReminderData {
  name: string;
  amount: string;
  dueDate: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type SMSProvider = "twilio" | "termii" | "africas_talking";

/**
 * SMS Service Class
 * Handles sending SMS notifications through various providers
 */
class SMSService {
  private provider: SMSProvider;
  private senderId: string;
  
  constructor() {
    this.provider = (process.env.SMS_PROVIDER as SMSProvider) || "twilio";
    this.senderId = process.env.SMS_SENDER_ID || "APC";
  }

  /**
   * Format Nigerian phone number to international format
   * Converts formats like:
   * - 08012345678 -> +2348012345678
   * - 2348012345678 -> +2348012345678
   * - +2348012345678 -> +2348012345678
   */
  formatNigerianPhone(phone: string): string {
    // Remove all spaces and dashes
    let cleaned = phone.replace(/[\s-]/g, "");
    
    // If starts with 0, replace with +234
    if (cleaned.startsWith("0")) {
      cleaned = "+234" + cleaned.substring(1);
    }
    // If starts with 234, add +
    else if (cleaned.startsWith("234")) {
      cleaned = "+" + cleaned;
    }
    // If doesn't start with +, assume it needs +234
    else if (!cleaned.startsWith("+")) {
      cleaned = "+234" + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate Nigerian phone number
   * Returns true if the phone number is a valid Nigerian number
   */
  validateNigerianPhone(phone: string): boolean {
    const formatted = this.formatNigerianPhone(phone);
    // Nigerian numbers should be +234 followed by 10 digits
    const regex = /^\+234[0-9]{10}$/;
    return regex.test(formatted);
  }

  /**
   * Core SMS sending method
   * Currently uses console.log for simulation
   * Ready for provider integration
   */
  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    try {
      // Validate and format phone number
      if (!this.validateNigerianPhone(phone)) {
        console.error(`[SMS] Invalid phone number: ${phone}`);
        return {
          success: false,
          error: "Invalid phone number format"
        };
      }

      const formattedPhone = this.formatNigerianPhone(phone);

      // RATE LIMITING CONSIDERATION:
      // In production, implement rate limiting here to prevent abuse
      // Example: Max 10 SMS per phone number per hour
      // Consider using Redis or in-memory cache for tracking

      // Simulate SMS sending with console.log
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`[SMS] Sending via ${this.provider.toUpperCase()}`);
      console.log(`[SMS] To: ${formattedPhone}`);
      console.log(`[SMS] From: ${this.senderId}`);
      console.log(`[SMS] Message: ${message}`);
      console.log(`[SMS] Length: ${message.length} characters`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      // Provider-specific implementation (currently commented out)
      // Uncomment and configure when ready to integrate real providers

      /*
      switch (this.provider) {
        case "twilio":
          return await this.sendViaTwilio(formattedPhone, message);
        case "termii":
          return await this.sendViaTermii(formattedPhone, message);
        case "africas_talking":
          return await this.sendViaAfricasTalking(formattedPhone, message);
        default:
          throw new Error(`Unsupported SMS provider: ${this.provider}`);
      }
      */

      // Simulated success response
      return {
        success: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`
      };

    } catch (error) {
      console.error("[SMS] Error sending SMS:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * TWILIO INTEGRATION (commented out - ready for implementation)
   * 
   * To enable:
   * 1. Install Twilio SDK: npm install twilio
   * 2. Set environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
   * 3. Uncomment this method
   */
  /*
  private async sendViaTwilio(phone: string, message: string): Promise<SMSResult> {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      return {
        success: true,
        messageId: result.sid
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  */

  /**
   * TERMII INTEGRATION (commented out - ready for implementation)
   * 
   * Termii is a popular Nigerian SMS provider with good local coverage
   * 
   * To enable:
   * 1. Sign up at https://termii.com
   * 2. Set environment variables: TERMII_API_KEY, TERMII_SENDER_ID
   * 3. Uncomment this method
   */
  /*
  private async sendViaTermii(phone: string, message: string): Promise<SMSResult> {
    const axios = require('axios');
    
    try {
      const response = await axios.post('https://api.ng.termii.com/api/sms/send', {
        to: phone,
        from: process.env.TERMII_SENDER_ID || this.senderId,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: process.env.TERMII_API_KEY
      });

      if (response.data.message_id) {
        return {
          success: true,
          messageId: response.data.message_id
        };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to send SMS"
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  */

  /**
   * AFRICA'S TALKING INTEGRATION (commented out - ready for implementation)
   * 
   * Africa's Talking provides SMS services across multiple African countries
   * 
   * To enable:
   * 1. Sign up at https://africastalking.com
   * 2. Set environment variables: AFRICAS_TALKING_API_KEY, AFRICAS_TALKING_USERNAME
   * 3. Uncomment this method
   */
  /*
  private async sendViaAfricasTalking(phone: string, message: string): Promise<SMSResult> {
    const AfricasTalking = require('africastalking');
    
    const africastalking = AfricasTalking({
      apiKey: process.env.AFRICAS_TALKING_API_KEY,
      username: process.env.AFRICAS_TALKING_USERNAME
    });

    const sms = africastalking.SMS;

    try {
      const result = await sms.send({
        to: phone,
        message: message,
        from: process.env.AFRICAS_TALKING_SENDER_ID || this.senderId
      });

      if (result.SMSMessageData.Recipients.length > 0) {
        const recipient = result.SMSMessageData.Recipients[0];
        return {
          success: recipient.status === "Success",
          messageId: recipient.messageId,
          error: recipient.status !== "Success" ? recipient.status : undefined
        };
      } else {
        return {
          success: false,
          error: "No recipients processed"
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  */

  /**
   * Send Event Reminder SMS
   * Template: "APC Connect: Hi {{name}}, reminder for {{event}} on {{date}} at {{location}}. Don't miss it!"
   */
  async sendEventReminderSMS(phone: string, data: EventReminderData): Promise<SMSResult> {
    // Keep message under 160 characters for standard SMS
    const message = `APC Connect: Hi ${data.name}, reminder for ${data.event} on ${data.date} at ${data.location}. Don't miss it!`;
    
    if (message.length > 160) {
      console.warn(`[SMS] Event reminder message exceeds 160 characters (${message.length})`);
    }
    
    return this.sendSMS(phone, message);
  }

  /**
   * Send Election Notice SMS
   * Template: "APC Connect: {{name}}, voting for {{election}} starts {{date}}. Cast your vote at apcng.org"
   */
  async sendElectionNoticeSMS(phone: string, data: ElectionNoticeData): Promise<SMSResult> {
    const message = `APC Connect: ${data.name}, voting for ${data.election} starts ${data.date}. Cast your vote at apcng.org`;
    
    if (message.length > 160) {
      console.warn(`[SMS] Election notice message exceeds 160 characters (${message.length})`);
    }
    
    return this.sendSMS(phone, message);
  }

  /**
   * Send OTP SMS
   * Template: "APC Connect: Your verification code is {{code}}. Valid for 10 minutes. Do not share."
   */
  async sendOTPSMS(phone: string, code: string): Promise<SMSResult> {
    const message = `APC Connect: Your verification code is ${code}. Valid for 10 minutes. Do not share.`;
    
    // OTP messages should always be under 160 characters
    if (message.length > 160) {
      console.warn(`[SMS] OTP message exceeds 160 characters (${message.length})`);
    }
    
    return this.sendSMS(phone, message);
  }

  /**
   * Send Membership Dues Reminder SMS
   * Template: "APC Connect: Hi {{name}}, your membership dues of {{amount}} is due on {{dueDate}}. Pay now to stay active."
   */
  async sendDuesReminderSMS(phone: string, data: DuesReminderData): Promise<SMSResult> {
    const message = `APC Connect: Hi ${data.name}, your dues of ${data.amount} is due on ${data.dueDate}. Pay now to stay active.`;
    
    if (message.length > 160) {
      console.warn(`[SMS] Dues reminder message exceeds 160 characters (${message.length})`);
    }
    
    return this.sendSMS(phone, message);
  }
}

// Export singleton instance
export const smsService = new SMSService();
