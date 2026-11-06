'use server';

/**
 * @fileOverview An AI flow to parse details from an invoice PDF.
 * - parseInvoicePdf - a function that takes a PDF data URI and returns structured invoice data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  ParseInvoicePdfInputSchema,
  type ParseInvoicePdfInput,
  ParseInvoicePdfOutputSchema,
  type ParseInvoicePdfOutput,
} from './parse-invoice-pdf-types';

export async function parseInvoicePdf(input: ParseInvoicePdfInput): Promise<ParseInvoicePdfOutput> {
  return await parseInvoicePdfFlow(input);
}

const invoiceParsingPrompt = ai.definePrompt({
  name: 'invoiceParsingPrompt',
  model: 'gemini-2.5-flash',
  input: { schema: ParseInvoicePdfInputSchema },
  output: { schema: ParseInvoicePdfOutputSchema },
  prompt: `You are an expert data extraction tool. Analyze the provided invoice PDF and extract the following information.

  PDF to analyze:
  {{media url=pdfDataUri}}

  Extract the following fields accurately:
  -   **invoiceNumber**: The unique identifier for the invoice.
  -   **date**: The main date of the invoice. Format it as YYYY-MM-DD.
  -   **supplierName**: The name of the company or person who issued the invoice.
  -   **lineItems**: A list of all items purchased. For each item, extract its 'description' and 'price'.
  -   **taxAmount**: The total amount of tax charged.
  -   **shippingCost**: The cost for shipping. If not present, default to 0.
  -   **buyersPremium**: The buyer's premium amount, often found in auction invoices. If not present, default to 0.
  -   **totalAmount**: The final, total amount due on the invoice.

  Return the data in the specified JSON format. If a field is not present in the document, omit it or set it to a reasonable default (e.g., 0 for numerical costs). Pay close attention to extracting all line items correctly.
  `,
});

const parseInvoicePdfFlow = ai.defineFlow(
  {
    name: 'parseInvoicePdfFlow',
    inputSchema: ParseInvoicePdfInputSchema,
    outputSchema: ParseInvoicePdfOutputSchema,
  },
  async (input: ParseInvoicePdfInput) => {
    try {
      const { output } = await invoiceParsingPrompt(input);
      if (!output) {
        throw new Error("AI failed to provide an output for invoice parsing.");
      }

      const validatedOutput = ParseInvoicePdfOutputSchema.safeParse(output);
      if (!validatedOutput.success) {
          console.error("Output schema validation failed for PDF parsing:", validatedOutput.error.issues);
          throw new Error(`AI output did not match expected structure. Details: ${validatedOutput.error.message}`);
      }

      return validatedOutput.data;

    } catch (error) {
      console.error("Error during invoiceParsingPrompt execution:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`An unexpected error occurred during invoice parsing. ${errorMessage}`);
    }
  }
);