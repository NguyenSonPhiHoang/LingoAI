
'use server';
/**
 * @fileOverview A flow for extracting text content from an image.
 *
 * - extractTextFromFile - A function that handles text extraction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTextInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextInput = z.infer<typeof ExtractTextInputSchema>;

const ExtractTextOutputSchema = z.object({
  text: z.string().describe('The extracted text content from the image.'),
});
export type ExtractTextOutput = z.infer<typeof ExtractTextOutputSchema>;

export async function extractTextFromFile(input: ExtractTextInput): Promise<ExtractTextOutput> {
  return extractTextFromFileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTextFromFilePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: ExtractTextInputSchema},
  output: {schema: ExtractTextOutputSchema},
  prompt: `You are an OCR (Optical Character Recognition) expert. Your task is to extract all text from the provided image accurately. Preserve the original formatting, including paragraphs and line breaks, as much as possible.

Image Content:
{{media url=imageDataUri}}`,
});

const extractTextFromFileFlow = ai.defineFlow(
  {
    name: 'extractTextFromFileFlow',
    inputSchema: ExtractTextInputSchema,
    outputSchema: ExtractTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
