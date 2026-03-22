import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const projectRoot = path.resolve(process.cwd());
const envFilePath = path.join(projectRoot, ".env");
const repsFilePath = path.join(projectRoot, "data", "reps.json");
const outputFilePath = path.join(projectRoot, "src", "util", "sampleAIresponses.json");

function loadEnvFile(filePath) {
  const envText = fs.readFileSync(filePath, "utf8");
  const entries = {};

  for (const line of envText.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const variableName = trimmedLine.slice(0, separatorIndex).trim();
    const variableValue = trimmedLine.slice(separatorIndex + 1).trim();
    entries[variableName] = variableValue;
  }

  return entries;
}

function extractArrayFromResponse(responseData) {
  if (!responseData) {
    return [];
  }

  if (Array.isArray(responseData)) {
    return responseData;
  }

  for (const key of Object.keys(responseData)) {
    if (Array.isArray(responseData[key])) {
      return responseData[key];
    }
  }

  return [];
}

function filterValidBills(items) {
  return items.filter(item => item && item.number != null && item.title != null && item.type != null);
}

function extractBillTitles(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter(bill => bill && bill.number != null && bill.title != null)
    .map(bill => ({
      number: bill.number,
      title: bill.title,
      type: bill.type
    }));
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "is",
  "of", "on", "or", "the", "their", "to", "through", "with", "against", "all", "any",
  "bill", "district", "families", "fight", "fund", "grow", "lower", "pass", "protect",
  "support", "secure", "expand", "advance", "defend", "oppose", "ensure", "hold", "reduce"
]);

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeText(text) {
  return normalizeText(text)
    .split(" ")
    .filter(token => token.length >= 4 && !STOP_WORDS.has(token));
}

function buildPromiseSearchTerms(promise) {
  const explicitKeywords = Array.isArray(promise.keywords) ? promise.keywords : [];
  const phraseTerms = [...explicitKeywords, promise.topic, promise.text]
    .map(term => normalizeText(term))
    .filter(Boolean);

  const tokenTerms = new Set();
  for (const term of phraseTerms) {
    for (const token of tokenizeText(term)) {
      tokenTerms.add(token);
    }
  }

  return {
    phraseTerms: [...new Set(phraseTerms)].filter(term => term.length >= 4),
    tokenTerms: [...tokenTerms]
  };
}

function scoreBillAgainstPromise(promise, bill) {
  const searchTerms = buildPromiseSearchTerms(promise);
  const normalizedBillTitle = normalizeText(bill.title);
  const billTokens = new Set(tokenizeText(bill.title));
  const matchedPhrases = [];
  const matchedTokens = [];

  for (const phraseTerm of searchTerms.phraseTerms) {
    if (phraseTerm.includes(" ") && normalizedBillTitle.includes(phraseTerm)) {
      matchedPhrases.push(phraseTerm);
    }
  }

  for (const tokenTerm of searchTerms.tokenTerms) {
    if (billTokens.has(tokenTerm)) {
      matchedTokens.push(tokenTerm);
    }
  }

  const score = (matchedPhrases.length * 3) + matchedTokens.length;

  return {
    score,
    matchedPhrases,
    matchedTokens
  };
}

function buildReasoning(promise, correlatedBills) {
  if (correlatedBills.length === 0) {
    return `No strong title-level overlap was found between the sampled sponsored bills and the promise on ${promise.topic}. The representative may still have worked on this issue, but the bill titles alone did not provide direct evidence.`;
  }

  const topBill = correlatedBills[0];
  const evidenceTerms = [...topBill.matchedPhrases, ...topBill.matchedTokens].slice(0, 4);
  const evidenceText = evidenceTerms.length > 0
    ? `matching terms such as ${evidenceTerms.map(term => `"${term}"`).join(", ")}`
    : "general subject overlap";

  return `The strongest alignment is with ${topBill.bill.type} ${topBill.bill.number}, whose title suggests overlap with ${promise.topic} through ${evidenceText}. Additional matched bills reinforce the same topic area, so this promise received credit based on the available bill titles.`;
}

function analyzeRepresentative(promises, billTitles) {
  const breakdown = promises.map(promise => {
    const scoredBills = billTitles
      .map(bill => ({ bill, ...scoreBillAgainstPromise(promise, bill) }))
      .filter(result => result.score > 0)
      .sort((leftResult, rightResult) => rightResult.score - leftResult.score)
      .slice(0, 4);

    return {
      promiseTopic: promise.topic,
      promiseText: promise.text,
      correlatingBills: scoredBills.map(result => String(result.bill.number)),
      reasoning: buildReasoning(promise, scoredBills)
    };
  });

  const matchedPromisesCount = breakdown.filter(item => item.correlatingBills.length > 0).length;
  const totalPromisesCount = promises.length || 1;
  const totalBillMatches = breakdown.reduce((count, item) => count + item.correlatingBills.length, 0);
  const breadthComponent = (matchedPromisesCount / totalPromisesCount) * 70;
  const depthComponent = Math.min(30, totalBillMatches * 3);
  const score = Math.max(0, Math.min(100, Math.round(breadthComponent + depthComponent)));

  return {
    score,
    breakdown
  };
}

function buildThinking(rep, billTitles, response) {
  const matchedPromisesCount = response.breakdown.filter(item => item.correlatingBills.length > 0).length;

  return [
    `Local heuristic analysis for ${rep.name}.`,
    `Reviewed ${rep.promises.length} promises against ${billTitles.length} sponsored bill titles.`,
    `Matched ${matchedPromisesCount} promises to at least one bill using overlap between promise keywords/topic text and bill-title wording.`,
    `Final score emphasized promise coverage first, then number of supporting bill matches.`
  ].join("\n");
}

async function getSponsoredLegislation(congressClient, bioguideId) {
  const response = await congressClient.get(`/member/${bioguideId}/sponsored-legislation`, {
    params: { limit: 50 }
  });

  const responseArray = extractArrayFromResponse(response.data);
  const validBills = filterValidBills(responseArray);
  return validBills.slice(0, 10);
}

async function main() {
  const envValues = loadEnvFile(envFilePath);
  const repsByDistrict = JSON.parse(fs.readFileSync(repsFilePath, "utf8"));

  const congressClient = axios.create({
    baseURL: "https://api.congress.gov/v3",
    timeout: 15000,
    params: {
      format: "json",
      api_key: envValues.VITE_CONGRESS_API_KEY
    }
  });

  const results = [];
  const districts = Object.keys(repsByDistrict)
    .map(Number)
    .sort((leftDistrict, rightDistrict) => leftDistrict - rightDistrict);

  for (const districtNumber of districts) {
    const representative = repsByDistrict[String(districtNumber)];
    console.log(`Processing VA-${districtNumber}: ${representative.name}`);

    const bills = await getSponsoredLegislation(congressClient, representative.bioguideId);
    const billTitles = extractBillTitles(bills);
    const parsedResponse = analyzeRepresentative(representative.promises, billTitles);
    const thinking = buildThinking(representative, billTitles, parsedResponse);
    const rawResponseText = JSON.stringify(parsedResponse, null, 2);

    results.push({
      district: districtNumber,
      representative: representative.name,
      party: representative.party,
      bioguideId: representative.bioguideId,
      billTitles,
      thinking,
      response: parsedResponse,
      rawResponseText,
      parseError: null
    });
  }

  fs.writeFileSync(outputFilePath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  console.log(`Saved ${results.length} local AI-style responses to ${outputFilePath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});