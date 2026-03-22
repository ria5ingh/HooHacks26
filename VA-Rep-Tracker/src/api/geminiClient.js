import axios from "axios";

const geminiClient = axios.create({
  baseURL: "https://generativelanguage.googleapis.com/v1beta",
  headers: {
    "Content-Type": "application/json",
    "x-goog-api-key": import.meta.env.VITE_GEMINI_KEY
  }
});

geminiClient.interceptors.request.use(requestConfig => {
  if (import.meta.env.DEV) {
    console.log(`[Gemini] → ${requestConfig.method.toUpperCase()} ${requestConfig.url}`);
  }
  return requestConfig;
});

geminiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const status = error.response.status;
      if (status === 400) {
        console.error("[Gemini] Bad request — check your prompt shape");
      } else if (status === 403) {
        console.error("[Gemini] Bad API key — check VITE_GEMINI_KEY in .env");
      } else if (status === 404) {
        console.error("[Gemini] Model not found — check model name in the URL");
      } else if (status === 429) {
        console.warn("[Gemini] Rate limited");
      } else {
        console.error(`[Gemini] HTTP ${status}`, error.response.data);
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("[Gemini] Request timed out");
    } else {
      console.error("[Gemini] Network error", error.message);
    }
    return Promise.reject(error);
  }
);

export async function generateContent(prompt) {
  const { data } = await geminiClient.post(
    "/models/gemini-2.5-flash:generateContent",
    {
      contents: [
        { parts: [{ text: prompt }] }
      ],
      generationConfig: {
        thinkingConfig: {
          thinkingBudget: 1024
        }
      }
    }
  );

  const parts = data.candidates[0].content.parts;
  const thinkingParts = parts.filter(part => part.thought === true);
  const responseParts = parts.filter(part => part.thought !== true);

  const thinking = thinkingParts.map(part => part.text).join("\n");
  const text = responseParts.map(part => part.text).join("\n");

  return { text, thinking };
}

/**
 * Analyze how well a representative upheld their campaign promises
 * based on their sponsored bill titles.
 * Returns { score, breakdown, thinking } where:
 *   score: number 0-100
 *   thinking: Gemini's reasoning text
 *   breakdown: array of { promiseTopic, promiseText, correlatingBills: [{number,type,title}], reasoning }
 */
export async function analyzePromisesFulfillment(rep, billTitles) {
  const promiseTexts = rep.promises.map((promise, index) => `${index + 1}. ${promise.topic}: ${promise.text}`).join("\n");
  const billTexts = billTitles
    .map(bill => `${bill.number} (${bill.type}): ${bill.title}`)
    .join("\n");

  const prompt = `
You are analyzing whether a political representative upheld their campaign promises based on their sponsored bills.

Representative: ${rep.name} (District ${rep.district}, ${rep.party})

Campaign Promises (numbered):
${promiseTexts}

Sponsored Bills (bill number followed by type and title):
${billTexts || "(No bills found)"}

Return ONLY a raw JSON object (no markdown, no code fences) in this exact shape:
{
  "score": <integer 0-100>,
  "breakdown": [
    {
      "promiseTopic": "<topic from promise>",
      "promiseText": "<full promise text>",
      "correlatingBills": ["<bill number>"],
      "reasoning": "<one or two sentence explanation>"
    }
  ]
}

For each campaign promise, list the bill numbers (from the Sponsored Bills list) that best correlate to it. A bill may appear under multiple promises. If no bills correlate, use an empty array.
`;

  const { text, thinking } = await generateContent(prompt);
  console.log("[Gemini Thinking]", thinking);
  console.log("[Gemini Response]", text);

  try {
    // Strip possible markdown code fences if model adds them anyway
    const clean = text.replace(/^```[\w]*\n?|```$/gm, "").trim();
    const parsed = JSON.parse(clean);
    const score = Math.max(0, Math.min(100, parseInt(parsed.score, 10) || 50));

    // Attach full bill objects to each breakdown item for the UI
    const breakdown = (parsed.breakdown || []).map(item => ({
      ...item,
      correlatingBills: (item.correlatingBills || []).map(billNumber =>
        billTitles.find(bill => String(bill.number) === String(billNumber)) || { number: billNumber, type: "", title: billNumber }
      )
    }));

    return { score, breakdown, thinking };
  } catch (error) {
    console.error("[Gemini] Failed to parse JSON response", error);
    const score = parseInt(text.trim(), 10);
    return { score: isNaN(score) ? 50 : Math.max(0, Math.min(100, score)), breakdown: [], thinking };
  }
}

export default geminiClient;