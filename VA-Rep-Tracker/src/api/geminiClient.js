import axios from "axios";

const geminiClient = axios.create({
  baseURL: "https://generativelanguage.googleapis.com/v1beta",
  headers: {
    "Content-Type": "application/json",
    "x-goog-api-key": import.meta.env.VITE_GEMINI_KEY
  }
});

geminiClient.interceptors.request.use(config => {
  if (import.meta.env.DEV) {
    console.log(`[Gemini] → ${config.method.toUpperCase()} ${config.url}`);
  }
  return config;
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
          thinkingBudget: 1024 //token limit
        }
      }
    }
  );

  return data.candidates[0].content.parts[0].text;
}

/**
 * Analyze how well a representative upheld their campaign promises
 * based on their sponsored bill titles.
 * Returns a percentage (0-100) as a number.
 */
export async function analyzePromisesFulfillment(rep, billTitles) {
  const promiseTexts = rep.promises.map(p => `${p.topic}: ${p.text}`).join("\n");
  const billTexts = billTitles
    .map(b => `${b.number} (${b.type}): ${b.title}`)
    .join("\n");

  const prompt = `
You are analyzing whether a political representative upheld their campaign promises based on their sponsored bills.

Representative: ${rep.name} (District ${rep.district}, ${rep.party})

Campaign Promises:
${promiseTexts}

Sponsored Bills (by title):
${billTexts || "(No bills found)"}

Based on the bill titles, estimate a percentage (0-100) of how well this representative upheld their campaign promises. 
Consider alignment between bill titles/topics and the stated promises. 
`;

  const response = await generateContent(prompt);
  console.log("[Gemini Response]", response); 
  const score = parseInt(response.trim(), 10);
  return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
}

export default geminiClient;