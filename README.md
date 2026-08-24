# Document Summary Assistant

A document summarization application that allows users to upload PDFs or scanned images, extract their text, and generate AI-powered summaries along with important insights and suggestions.

## Features
-   Upload PDF and image files using drag-and-drop or a file picker.
-   Extract text from PDFs using Mozilla PDF.js.
-   Extract text from scanned documents using Tesseract.js OCR.
-   Generate short, medium, or detailed summaries.
-   Create AI-powered document overviews with automatic document type identification.
-   Identify key points, central themes, and action items.
-   Provide suggestions for improving the document.
-   Review and edit extracted text before generating a summary.
-   Includes loading indicators, input validation, and basic error handling.
-   Responsive interface that works across desktop and mobile devices.

## Tech Stack
-   HTML, CSS, and JavaScript
-   PDF.js for PDF text extraction
-   Tesseract.js for OCR-based image text recognition
-   Vercel Serverless Functions for backend API handling
-   Gemini API for AI-powered document summarization

## How It Works

The application processes documents directly in the browser. PDF files are handled using PDF.js, while scanned images are converted into readable text through Tesseract.js OCR.

After extraction, users can review and modify the text before requesting a summary. The extracted content is then sent to a Vercel Serverless Function rather than directly exposing the API credentials in the browser.

The serverless function securely accesses the Gemini API using an environment variable containing the API key. Gemini processes the document and returns structured information such as an overview, key points, main themes, action items, and improvement suggestions. The frontend then displays these results in an organized format.

This architecture provides a simple deployment process while maintaining secure API-key handling and a user-friendly document summarization workflow.

## Notes
-   OCR results depend on the quality and clarity of the scanned document. The current implementation is configured   for English.
-   Documents larger than 20 MB are restricted to maintain reasonable browser performance.
-   Content submitted through Gemini's free tier is subject to Google's applicable free-ti-er data usage policies.
-   A valid GEMINI_API_KEY must be configured for the AI summarization functionality to work.