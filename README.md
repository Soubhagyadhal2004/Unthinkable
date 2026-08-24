# Document Summary Assistant

A technical assessment project for uploading PDFs or scanned images, extracting readable text, and generating AI-powered smart summaries with key points and improvement suggestions.

## Features

- Drag-and-drop and file picker upload for PDF and image files.
- PDF text extraction with Mozilla PDF.js.
- OCR for scanned images with Tesseract.js.
- Short, medium, and long summary options.
- AI-powered smart overview with document type detection.
- Key point, main theme, and action item extraction.
- Document improvement suggestions.
- Editable extracted text before regenerating a summary.
- Loading states, validation, and basic error handling.
- Responsive layout for desktop and mobile.

## Tech Stack

- HTML, CSS, and JavaScript
- PDF.js for browser PDF parsing
- Tesseract.js for browser OCR
- Vercel Serverless Function for secure AI summary generation
- Gemini API for smart summaries

## Approach

PDF files are parsed in the browser with PDF.js, while scanned images are processed with Tesseract.js OCR. The extracted text can be reviewed and edited before summarization. For smart summaries, the frontend sends only the extracted text to a Vercel serverless API route, where the Gemini API key is kept securely as an environment variable. Gemini returns structured JSON containing an overview, key points, themes, action items, and improvement suggestions, which the frontend renders directly. This approach balances practical document processing, secure API usage, deployment simplicity, and a clean UX.

## Notes

- OCR accuracy depends on scan quality and language. This version is configured for English.
- Very large files are limited to 20 MB for browser performance.
- On Gemini's free tier, submitted content may be used according to Google's free-tier data policy.
- Since summarization relies entirely on the Gemini API, a valid `GEMINI_API_KEY` is required for the summary feature to work.