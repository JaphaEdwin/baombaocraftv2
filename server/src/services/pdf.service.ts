/**
 * PDF Service
 * Generate PDFs for quotations, receipts, reports
 */

import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger.js';

interface QuotationData {
  quotationNumber: string;
  createdAt: Date;
  validUntil: Date;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    productName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  terms?: string;
}

interface ReceiptData {
  receiptNumber: string;
  paymentDate: Date;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  amount: number;
  paymentMethod: string;
  transactionRef: string;
  projectTitle?: string;
}

export class PdfService {
  private companyInfo = {
    name: 'BaoMbao Craft',
    tagline: 'Quality Artisan Furniture',
    address: 'Kampala, Uganda',
    phone: '+256 XXX XXX XXX',
    email: 'hello@baombao.com',
    website: 'www.baombao.com',
  };

  /**
   * Generate quotation PDF
   */
  async generateQuotation(data: QuotationData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.addHeader(doc);

        // Quotation title
        doc.fontSize(20).text('QUOTATION', { align: 'center' });
        doc.moveDown(0.5);

        // Quotation details
        doc.fontSize(10);
        doc.text(`Quotation #: ${data.quotationNumber}`);
        doc.text(`Date: ${data.createdAt.toLocaleDateString()}`);
        doc.text(`Valid Until: ${data.validUntil.toLocaleDateString()}`);
        doc.moveDown();

        // Customer info
        doc.fontSize(12).text('Bill To:', { underline: true });
        doc.fontSize(10);
        doc.text(data.customer.name);
        if (data.customer.phone) doc.text(data.customer.phone);
        doc.text(data.customer.email);
        if (data.customer.address) doc.text(data.customer.address);
        doc.moveDown();

        // Items table
        this.addItemsTable(doc, data.items);

        // Totals
        doc.moveDown();
        const totalsX = 400;
        doc.fontSize(10);
        doc.text(`Subtotal:`, totalsX, doc.y, { continued: true });
        doc.text(`UGX ${data.subtotal.toLocaleString()}`, { align: 'right' });
        
        if (data.tax > 0) {
          doc.text(`VAT (18%):`, totalsX, doc.y, { continued: true });
          doc.text(`UGX ${data.tax.toLocaleString()}`, { align: 'right' });
        }
        
        if (data.discount > 0) {
          doc.text(`Discount:`, totalsX, doc.y, { continued: true });
          doc.text(`-UGX ${data.discount.toLocaleString()}`, { align: 'right' });
        }

        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`TOTAL:`, totalsX, doc.y, { continued: true });
        doc.text(`UGX ${data.total.toLocaleString()}`, { align: 'right' });
        doc.font('Helvetica');

        // Notes
        if (data.notes) {
          doc.moveDown(2);
          doc.fontSize(10).text('Notes:', { underline: true });
          doc.text(data.notes);
        }

        // Terms
        doc.moveDown();
        doc.fontSize(8).text('Terms & Conditions:', { underline: true });
        doc.text(data.terms || this.getDefaultTerms());

        // Footer
        this.addFooter(doc);

        doc.end();

      } catch (error) {
        logger.error('PDF generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate payment receipt PDF
   */
  async generateReceipt(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A5', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(16).font('Helvetica-Bold').text('BaoMbao Craft', { align: 'center' });
        doc.fontSize(8).font('Helvetica').text(this.companyInfo.tagline, { align: 'center' });
        doc.moveDown();

        // Receipt title
        doc.fontSize(14).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown();

        // Receipt details
        doc.fontSize(10).font('Helvetica');
        
        const labelX = 40;
        const valueX = 150;
        let y = doc.y;

        doc.text('Receipt #:', labelX, y);
        doc.text(data.receiptNumber, valueX, y);
        y += 15;

        doc.text('Date:', labelX, y);
        doc.text(data.paymentDate.toLocaleDateString(), valueX, y);
        y += 15;

        doc.text('Customer:', labelX, y);
        doc.text(data.customer.name, valueX, y);
        y += 15;

        if (data.projectTitle) {
          doc.text('Project:', labelX, y);
          doc.text(data.projectTitle, valueX, y);
          y += 15;
        }

        doc.text('Payment Method:', labelX, y);
        doc.text(data.paymentMethod, valueX, y);
        y += 15;

        doc.text('Transaction Ref:', labelX, y);
        doc.text(data.transactionRef, valueX, y);
        y += 25;

        // Amount
        doc.rect(40, y, doc.page.width - 80, 40).stroke();
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('AMOUNT PAID:', 50, y + 12, { continued: true });
        doc.text(`UGX ${data.amount.toLocaleString()}`, { align: 'right' });

        // Thank you
        doc.moveDown(3);
        doc.fontSize(10).font('Helvetica').text('Thank you for your business!', { align: 'center' });

        // Contact
        doc.moveDown();
        doc.fontSize(8).text(`${this.companyInfo.phone} | ${this.companyInfo.email}`, { align: 'center' });

        doc.end();

      } catch (error) {
        logger.error('Receipt PDF generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Add company header to PDF
   */
  private addHeader(doc: PDFKit.PDFDocument): void {
    doc.fontSize(18).font('Helvetica-Bold').text(this.companyInfo.name);
    doc.fontSize(10).font('Helvetica').text(this.companyInfo.tagline);
    doc.fontSize(8);
    doc.text(this.companyInfo.address);
    doc.text(`${this.companyInfo.phone} | ${this.companyInfo.email}`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();
  }

  /**
   * Add items table to quotation
   */
  private addItemsTable(doc: PDFKit.PDFDocument, items: QuotationData['items']): void {
    const tableTop = doc.y;
    const colWidths = [200, 60, 100, 100];
    const startX = 50;

    // Header
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Item', startX, tableTop);
    doc.text('Qty', startX + colWidths[0], tableTop);
    doc.text('Unit Price', startX + colWidths[0] + colWidths[1], tableTop);
    doc.text('Total', startX + colWidths[0] + colWidths[1] + colWidths[2], tableTop);

    doc.moveTo(startX, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.moveDown(0.5);

    // Items
    doc.font('Helvetica').fontSize(9);
    
    items.forEach(item => {
      const y = doc.y;
      doc.text(item.productName, startX, y, { width: colWidths[0] - 10 });
      if (item.description) {
        doc.fontSize(8).text(item.description, startX, doc.y, { width: colWidths[0] - 10 });
        doc.fontSize(9);
      }
      doc.text(item.quantity.toString(), startX + colWidths[0], y);
      doc.text(`UGX ${item.unitPrice.toLocaleString()}`, startX + colWidths[0] + colWidths[1], y);
      doc.text(`UGX ${item.totalPrice.toLocaleString()}`, startX + colWidths[0] + colWidths[1] + colWidths[2], y);
      doc.moveDown(0.5);
    });

    doc.moveTo(startX, doc.y).lineTo(545, doc.y).stroke();
  }

  /**
   * Add footer to PDF
   */
  private addFooter(doc: PDFKit.PDFDocument): void {
    const bottom = doc.page.height - 50;
    doc.fontSize(8);
    doc.text(
      `${this.companyInfo.name} | ${this.companyInfo.website}`,
      50,
      bottom,
      { align: 'center' }
    );
  }

  /**
   * Default terms and conditions
   */
  private getDefaultTerms(): string {
    return `1. This quotation is valid for 30 days from the date of issue.
2. A 50% deposit is required to commence work.
3. Delivery times are estimates and may vary based on material availability.
4. Prices are in Ugandan Shillings (UGX) and include VAT where applicable.
5. Custom orders are non-refundable once production has begun.`;
  }
}

export const pdfService = new PdfService();
