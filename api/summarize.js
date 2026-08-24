import fs from "node:fs";
import path from "node:path";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const MAX_INPUT_CHARS = 30000;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY || getLocalEnvValue("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || getLocalEnvValue("GEMINI_MODEL") || DEFAULT_GEMINI_MODEL;
  if (!apiKey) {
    return response.status(500).json({ error: "GEMINI_API_KEY is not configured." });
  }

  const body = parseRequestBody(request.body);
  const { text, length = "medium", fileName = "document" } = body;
  if (!text || typeof text !== "string" || text.trim().length < 30) {
    return response.status(400).json({ error: "Document text is too short to summarize." });
  }

  try {
    const prompt = buildPrompt({
      text: text.slice(0, MAX_INPUT_CHARS),
      length,
      fileName,
    });
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return response.status(geminiResponse.status).json({
        error: data.error?.message || "Gemini API request failed.",
      });
    }

    const output = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";
    const summary = parseGeminiJson(output);

    return response.status(200).json({ summary });
  } catch (error) {
    return response.status(500).json({
      error: error.message || "Unable to generate AI summary.",
    });
  }
}

function getLocalEnvValue(name) {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envFile = fs.readFileSync(envPath, "utf8");
    const line = envFile
      .split(/\r?\n/)
      .find((currentLine) => currentLine.trim().startsWith(`${name}=`));

    if (!line) {
      return "";
    }

    return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return "";
  }
}

function parseRequestBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return body;
}

function buildPrompt({ text, length, fileName }) {
  const lengthGuide = {
    short: "Keep the overview to 2-3 sentences and each list to 3-4 strong items.",
    medium: "Keep the overview to 4-5 sentences and each list to 4-6 strong items.",
    long: "Keep the overview to 6-8 sentences and each list to 6-8 strong items.",
  };

  return `
You are a document summary assistant. Create a genuinely useful smart summary for any document type:
resume, report, assignment brief, research paper, invoice, policy, meeting notes, scanned notice, or general text.

Rules:
- Do not copy large blocks from the document.
- Write natural, polished English.
- Keep every array item concise.
- Preserve important facts, names, dates, numbers, skills, deadlines, and requirements.
- If the document is a resume, summarize the candidate profile, strengths, education/experience, and projects naturally.
- If the document is an assignment or requirement document, summarize goal, required features, deliverables, deadline, and evaluation criteria.
- If no action items exist, say "No explicit action items found."
- Return only valid JSON. Do not wrap it in markdown.

JSON shape:
{
  "title": "short title",
  "overview": "smart paragraph summary",
  "keyPoints": ["important point"],
  "themes": ["main theme"],
  "actions": ["action item or deadline"],
  "suggestions": ["improvement suggestion"]
}

Summary length: ${length}
Length guidance: ${lengthGuide[length] || lengthGuide.medium}
File name: ${fileName}

Document text:
${text}
`.trim();
}

function parseGeminiJson(output) {
  const cleaned = output
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  return JSON.parse(cleaned);
}
