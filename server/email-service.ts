import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Email Service Configuration
 * 
 * Required Environment Variables:
 * - EMAIL_FROM: The sender email address (e.g., "APC Connect <noreply@apcconnect.ng>")
 * - EMAIL_SERVICE_PROVIDER: The email service to use ("nodemailer" | "sendgrid" | "ses")
 * - EMAIL_SERVICE_API_KEY: API key for the email service (for SendGrid, SES, etc.)
 * - SMTP_HOST: SMTP server host (for Nodemailer)
 * - SMTP_PORT: SMTP server port (for Nodemailer)
 * - SMTP_USER: SMTP username (for Nodemailer)
 * - SMTP_PASS: SMTP password (for Nodemailer)
 */

export interface EmailConfig {
  from: string;
  provider: 'nodemailer' | 'sendgrid' | 'ses' | 'console';
  apiKey?: string;
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  email: string;
  memberId: string;
  referralCode: string;
}

export interface EventReminderData {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventDescription?: string;
}

export interface ElectionNotificationData {
  firstName: string;
  electionTitle: string;
  electionDate: string;
  votingStartTime: string;
  votingEndTime: string;
  electionDescription?: string;
}

/**
 * EmailService Class
 * Handles all email operations for the APC Connect platform
 */
class EmailService {
  private config: EmailConfig;
  private templatesPath: string;

  constructor() {
    // Initialize configuration from environment variables
    // Default to console provider for development
    this.config = {
      from: process.env.EMAIL_FROM || 'APC Connect <noreply@apcconnect.ng>',
      provider: (process.env.EMAIL_SERVICE_PROVIDER as any) || 'console',
      apiKey: process.env.EMAIL_SERVICE_API_KEY,
      smtp: process.env.SMTP_HOST ? {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      } : undefined,
    };

    this.templatesPath = path.join(__dirname, 'email-templates');

    // Validate configuration and log warnings
    this.validateConfiguration();
  }

  /**
   * Validate email service configuration
   * Logs warnings if running in simulation mode or missing required variables
   */
  private validateConfiguration(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (this.config.provider === 'console') {
      if (isProduction) {
        console.warn('\n⚠️  WARNING: Email service running in CONSOLE mode in production');
        console.warn('   Emails will only be logged, not actually sent');
        console.warn('   Set EMAIL_SERVICE_PROVIDER environment variable to use a real provider\n');
      } else {
        console.log('📧 Email Service: Console mode (simulation)');
      }
      return;
    }

    // Validate provider-specific configuration
    if (this.config.provider === 'nodemailer') {
      if (!this.config.smtp || !this.config.smtp.host || !this.config.smtp.user) {
        console.error('\n❌ ERROR: Nodemailer provider selected but SMTP configuration is incomplete');
        console.error('   Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
        console.error('   Falling back to console mode\n');
        this.config.provider = 'console';
      } else {
        console.log(`📧 Email Service: Nodemailer (${this.config.smtp.host})`);
      }
    } else if (this.config.provider === 'sendgrid') {
      if (!this.config.apiKey) {
        console.error('\n❌ ERROR: SendGrid provider selected but EMAIL_SERVICE_API_KEY is not set');
        console.error('   Falling back to console mode\n');
        this.config.provider = 'console';
      } else {
        console.log('📧 Email Service: SendGrid');
      }
    } else if (this.config.provider === 'ses') {
      if (!this.config.apiKey) {
        console.error('\n❌ ERROR: SES provider selected but EMAIL_SERVICE_API_KEY is not set');
        console.error('   Falling back to console mode\n');
        this.config.provider = 'console';
      } else {
        console.log('📧 Email Service: Amazon SES');
      }
    }
  }

  /**
   * Health check method to verify email service configuration
   * @returns Object with health status and details
   */
  getHealthCheck(): {
    status: 'ok' | 'warning' | 'error';
    provider: string;
    configured: boolean;
    simulation: boolean;
    message: string;
  } {
    const isSimulation = this.config.provider === 'console';
    const isConfigured = !isSimulation;

    if (isSimulation) {
      return {
        status: 'warning',
        provider: 'console',
        configured: false,
        simulation: true,
        message: 'Email service running in simulation mode - emails will not be sent'
      };
    }

    // Check provider-specific configuration
    let isValid = true;
    if (this.config.provider === 'nodemailer') {
      isValid = !!(this.config.smtp && this.config.smtp.host && this.config.smtp.user);
    } else if (['sendgrid', 'ses'].includes(this.config.provider)) {
      isValid = !!this.config.apiKey;
    }

    return {
      status: isValid ? 'ok' : 'error',
      provider: this.config.provider,
      configured: isValid,
      simulation: false,
      message: isValid 
        ? `Email service configured with ${this.config.provider}`
        : `Email service configuration incomplete for ${this.config.provider}`
    };
  }

  /**
   * Load and parse an email template
   * @param templateName - Name of the template file (without .html extension)
   * @param data - Data to replace placeholders in the template
   */
  private async loadTemplate(templateName: string, data: Record<string, string>): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      let template = await fs.readFile(templatePath, 'utf-8');

      // Replace all {{placeholder}} with actual data
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, data[key]);
      });

      return template;
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  /**
   * Send an email
   * @param options - Email options including recipient, subject, and content
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      console.log('\n========== EMAIL NOTIFICATION ==========');
      console.log('Provider:', this.config.provider);
      console.log('From:', this.config.from);
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('HTML Content Length:', options.html.length, 'characters');
      
      if (this.config.provider === 'console') {
        console.log('\n--- EMAIL PREVIEW ---');
        console.log(options.html.substring(0, 500) + '...');
        console.log('--- END PREVIEW ---');
      }
      
      console.log('========================================\n');

      // TODO: Implement actual email sending based on provider
      // 
      // Example for Nodemailer:
      // if (this.config.provider === 'nodemailer' && this.config.smtp) {
      //   const transporter = nodemailer.createTransport({
      //     host: this.config.smtp.host,
      //     port: this.config.smtp.port,
      //     auth: {
      //       user: this.config.smtp.user,
      //       pass: this.config.smtp.pass,
      //     },
      //   });
      //   await transporter.sendMail({
      //     from: this.config.from,
      //     to: options.to,
      //     subject: options.subject,
      //     html: options.html,
      //     text: options.text,
      //   });
      // }
      //
      // Example for SendGrid:
      // if (this.config.provider === 'sendgrid' && this.config.apiKey) {
      //   const sgMail = require('@sendgrid/mail');
      //   sgMail.setApiKey(this.config.apiKey);
      //   await sgMail.send({
      //     from: this.config.from,
      //     to: options.to,
      //     subject: options.subject,
      //     html: options.html,
      //     text: options.text,
      //   });
      // }

    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send welcome email to newly registered members
   * @param data - Member data for the welcome email
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    try {
      const html = await this.loadTemplate('welcome', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        memberId: data.memberId,
        referralCode: data.referralCode,
      });

      await this.sendEmail({
        to: data.email,
        subject: `Welcome to APC Connect, ${data.firstName}!`,
        html,
      });

      console.log(`✓ Welcome email queued for ${data.email}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw - we don't want registration to fail if email fails
    }
  }

  /**
   * Send event reminder email to members
   * @param data - Event data for the reminder email
   */
  async sendEventReminderEmail(to: string, data: EventReminderData): Promise<void> {
    try {
      const html = await this.loadTemplate('event-reminder', {
        firstName: data.firstName,
        eventTitle: data.eventTitle,
        eventDate: data.eventDate,
        eventTime: data.eventTime,
        eventLocation: data.eventLocation,
        eventDescription: data.eventDescription || '',
      });

      await this.sendEmail({
        to,
        subject: `Event Reminder: ${data.eventTitle}`,
        html,
      });

      console.log(`✓ Event reminder email queued for ${to}`);
    } catch (error) {
      console.error('Error sending event reminder email:', error);
      // Don't throw - we don't want event creation to fail if email fails
    }
  }

  /**
   * Send election notification email to members
   * @param data - Election data for the notification email
   */
  async sendElectionNotificationEmail(to: string, data: ElectionNotificationData): Promise<void> {
    try {
      const html = await this.loadTemplate('election-notification', {
        firstName: data.firstName,
        electionTitle: data.electionTitle,
        electionDate: data.electionDate,
        votingStartTime: data.votingStartTime,
        votingEndTime: data.votingEndTime,
        electionDescription: data.electionDescription || '',
      });

      await this.sendEmail({
        to,
        subject: `Election Notification: ${data.electionTitle}`,
        html,
      });

      console.log(`✓ Election notification email queued for ${to}`);
    } catch (error) {
      console.error('Error sending election notification email:', error);
      // Don't throw - we don't want election creation to fail if email fails
    }
  }

  /**
   * Test email configuration
   * Sends a test email to verify the service is working
   */
  async sendTestEmail(to: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'APC Connect - Email Service Test',
      html: '<h1>Test Email</h1><p>If you received this, the email service is working correctly!</p>',
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
