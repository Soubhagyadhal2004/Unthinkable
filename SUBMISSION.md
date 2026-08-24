# Submission Notes

## Receipt Confirmation Email

Subject: Re: Technical Assessment Project - Software Engineering Position

Dear Team,

Thank you for sharing the technical assessment details. I confirm receipt of the assignment for the Document Summary Assistant project and will submit the GitHub repository link and hosted application URL by the deadline.

Best regards,  
[Your Name]

## Final Submission Email

Subject: Document Summary Assistant - Technical Assessment Submission

Dear Team,

Please find my technical assessment submission below:

- GitHub Repository: [Add repository link]
- Hosted Application: [Add deployed URL]

I have also included the project approach, setup steps, and deployment notes in the README.

Best regards,  
[Your Name]

## Approach

PDF files are parsed in the browser with PDF.js, while scanned images are processed with Tesseract.js OCR. The extracted text can be reviewed and edited before summarization. For smart summaries, the frontend sends only the extracted text to a Vercel serverless API route, where the Gemini API key is kept securely as an environment variable. Gemini returns structured JSON containing an overview, key points, themes, action items, and improvement suggestions. If the AI request fails or the key is missing, the app falls back to a local extractive summarizer so the core experience still works. This approach balances practical document processing, secure API usage, deployment simplicity, and reliable UX.
