import { z } from 'genkit';

const ParsedLineItemSchema = z.object({
  description: z.string().describe('The description of the line item.'),
  price: z.number().describe('The price of the line item.'),
});

export const ParseInvoicePdfOutputSchema = z.object({
  invoiceNumber: z.string().optional().describe('The invoice number.'),
  date: z.string().optional().describe('The invoice date in YYYY-MM-DD format.'),
  supplierName: z.string().optional().describe('The name of the supplier or vendor.'),
  lineItems: z.array(ParsedLineItemSchema).optional().describe('An array of line items from the invoice.'),
  taxAmount: z.number().optional().describe('The total tax amount.'),
  shippingCost: z.number().optional().describe('The shipping cost.'),
  buyersPremium: z.number().optional().describe('The buyers premium, if any.'),
  totalAmount: z.number().optional().describe('The final, total amount of the invoice.'),
});
export type ParseInvoicePdfOutput = z.infer<typeof ParseInvoicePdfOutputSchema>;

export const ParseInvoicePdfInputSchema = z.object({
  pdfDataUri: z.string().describe("A PDF file of an invoice, as a data URI that must include the application/pdf MIME type and use Base64 encoding. Format: 'data:application/pdf;base64,<encoded_data>'."),
});
export type ParseInvoicePdfInput = z.infer<typeof ParseInvoicePdfInputSchema>;
