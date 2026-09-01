export interface EmailMessageOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

export interface WhatsAppMessageOptions {
  toPhone: string;
  templateName: string;
  parameters: string[];
}

export interface IEmailProvider {
  sendEmail(options: EmailMessageOptions): Promise<{ success: boolean; messageId?: string }>;
}

export interface IWhatsAppProvider {
  sendWhatsApp(options: WhatsAppMessageOptions): Promise<{ success: boolean; messageId?: string }>;
}

export class MockEmailProvider implements IEmailProvider {
  async sendEmail(options: EmailMessageOptions): Promise<{ success: boolean; messageId: string }> {
    console.log(`[Email Dispatch] To: ${options.to} | Subject: ${options.subject}`);
    return { success: true, messageId: `msg-${Date.now()}` };
  }
}

export class MockWhatsAppProvider implements IWhatsAppProvider {
  async sendWhatsApp(options: WhatsAppMessageOptions): Promise<{ success: boolean; messageId: string }> {
    console.log(`[WhatsApp Dispatch] To: ${options.toPhone} | Template: ${options.templateName}`);
    return { success: true, messageId: `wa-${Date.now()}` };
  }
}

export class NotificationService {
  private emailProvider: IEmailProvider;
  private whatsappProvider: IWhatsAppProvider;

  constructor() {
    this.emailProvider = new MockEmailProvider();
    this.whatsappProvider = new MockWhatsAppProvider();
  }

  async sendInvoiceNotification(
    customerEmail: string,
    invoiceNumber: string,
    amountRupees: number,
    publicShareUrl: string
  ): Promise<boolean> {
    if (!customerEmail) return false;

    const result = await this.emailProvider.sendEmail({
      to: customerEmail,
      subject: `Invoice ${invoiceNumber} from your supplier`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Tax Invoice: ${invoiceNumber}</h2>
          <p>Dear Customer,</p>
          <p>Your invoice for <strong>₹${amountRupees.toFixed(2)}</strong> is ready.</p>
          <p><a href="${publicShareUrl}" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View & Download Invoice</a></p>
        </div>
      `,
    });

    return result.success;
  }

  async sendPaymentReceiptNotification(
    customerEmail: string,
    receiptNumber: string,
    amountPaidRupees: number
  ): Promise<boolean> {
    if (!customerEmail) return false;

    const result = await this.emailProvider.sendEmail({
      to: customerEmail,
      subject: `Payment Receipt ${receiptNumber}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Payment Receipt: ${receiptNumber}</h2>
          <p>Thank you for your payment of <strong>₹${amountPaidRupees.toFixed(2)}</strong>.</p>
        </div>
      `,
    });

    return result.success;
  }
}

export const notificationService = new NotificationService();
