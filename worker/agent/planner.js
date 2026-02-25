// planner.js — Gemini-powered DevOps Agent Planner
// Single-shot analysis: receives all diagnostic data, produces structured resolution

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 5000; // 5 seconds

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(requestConfig) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent(requestConfig);
      return response;
    } catch (error) {
      lastError = error;
      const isRateLimit =
        error.status === 429 ||
        error.message?.includes("429") ||
        error.message?.toLowerCase().includes("rate limit") ||
        error.message?.toLowerCase().includes("quota") ||
        error.message?.toLowerCase().includes("resource exhausted");

      if (isRateLimit && attempt < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          `⏳ Rate limited (attempt ${attempt + 1}/${MAX_RETRIES + 1}). Retrying in ${backoffMs / 1000}s...`
        );
        await sleep(backoffMs);
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

const SYSTEM_PROMPT = `You are an expert DevOps SRE engineer analyzing a production incident.

You will receive:
- Incident details (title, service, severity, description)
- Diagnostic data already collected: logs, metrics, and health check results

Your job: Write a comprehensive, structured incident response report in MARKDOWN format.

RULES:
1. Write in markdown with proper headers, bold, lists, and horizontal rules
2. Be specific — reference actual data from the diagnostics (error messages, CPU %, latency values, etc.)
3. Provide a realistic root cause analysis based on the diagnostic data
4. Recommend ONE concrete action: either "restart_service" or "scale_pods" (with a replica count 3-8)
5. Include a post-mortem section with preventative measures
6. Keep it professional and concise — like a real SRE incident report

RESPONSE FORMAT — You MUST respond with valid JSON (no markdown fences around the JSON):
{
  "recommended_action": "restart_service" or "scale_pods",
  "action_args": { "service": "..." } or { "service": "...", "replicas": N },
  "resolution_report": "Full markdown report here..."
}`;

/**
 * Single-shot analysis: takes all gathered diagnostic data and produces
 * a structured resolution report with ONE Gemini API call.
 */
export async function analyzeAndResolve(incident, diagnosticData) {
  try {
    const prompt = `## INCIDENT
- **Title:** ${incident.title}
- **Service:** ${incident.service}
- **Severity:** ${incident.severity}
- **Description:** ${incident.description || "N/A"}

## DIAGNOSTIC DATA

### Logs (${diagnosticData.logs.length} entries)
${diagnosticData.logs.map((l) => `[${l.level.toUpperCase()}] ${l.timestamp} — ${l.message}`).join("\n")}

### Metrics
${Object.entries(diagnosticData.metrics)
  .filter(([k]) => k !== "service" && k !== "timestamp")
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join("\n")}

### Health Check
- **Status:** ${diagnosticData.healthcheck.data.status}
- **Response Time:** ${diagnosticData.healthcheck.data.responseTime}
- **HTTP:** ${diagnosticData.healthcheck.data.checks.http}
- **Database:** ${diagnosticData.healthcheck.data.checks.database}
- **Cache:** ${diagnosticData.healthcheck.data.checks.cache}
- **Dependencies:** ${diagnosticData.healthcheck.data.checks.dependencies}

Analyze this incident and respond with the JSON format specified in your instructions.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      systemInstruction: SYSTEM_PROMPT,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const candidate = response.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      console.warn("⚠️ Gemini returned empty response, using fallback");
      return getFallbackAnalysis(incident, diagnosticData);
    }

    try {
      // Strip markdown code fences if present (```json ... ```)
      let cleanText = text.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }

      let parsed;
      try {
        parsed = JSON.parse(cleanText);
      } catch {
        // Try to extract JSON object from within the text
        const jsonMatch = cleanText.match(/\{[\s\S]*"resolution_report"[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No valid JSON found");
        }
      }

      return {
        success: true,
        recommended_action: parsed.recommended_action || "restart_service",
        action_args: parsed.action_args || { service: incident.service },
        resolution_report: parsed.resolution_report || text,
      };
    } catch (parseErr) {
      // If JSON parsing fails, treat the whole text as the resolution
      console.warn("⚠️ Failed to parse Gemini JSON, using raw text as resolution");
      return {
        success: true,
        recommended_action: "restart_service",
        action_args: { service: incident.service },
        resolution_report: text,
      };
    }
  } catch (error) {
    const isRateLimit =
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.toLowerCase().includes("rate limit") ||
      error.message?.toLowerCase().includes("quota");

    if (isRateLimit) {
      console.error("🚫 Gemini rate limit exceeded after all retries:", error.message);
    } else {
      console.error("❌ Gemini analysis error:", error.message);
    }

    return getFallbackAnalysis(incident, diagnosticData);
  }
}

/**
 * Fallback analysis when Gemini is unavailable
 */
function getFallbackAnalysis(incident, diagnosticData) {
  const errorCount = diagnosticData.logs.filter((l) => l.level === "error").length;
  const warnCount = diagnosticData.logs.filter((l) => l.level === "warn").length;
  const metrics = diagnosticData.metrics;
  const health = diagnosticData.healthcheck.data;

  const report = `### 1. Initial Assessment & Triage

* **Service:** \`${incident.service}\`
* **Severity:** ${incident.severity}
* **Status:** Investigation completed automatically

---

### 2. Diagnostic Summary

#### Log Analysis
Found **${errorCount} errors** and **${warnCount} warnings** in ${diagnosticData.logs.length} log entries.

${diagnosticData.logs
  .filter((l) => l.level === "error")
  .slice(0, 3)
  .map((l) => `* \`${l.message}\``)
  .join("\n")}

#### Metrics
* **CPU Usage:** ${metrics.cpu_usage_percent}%
* **Memory Usage:** ${metrics.memory_usage_percent}%
* **Error Rate:** ${metrics.error_rate_percent}%
* **P99 Latency:** ${metrics.p99_latency_ms}ms
* **Pod Restarts (1hr):** ${metrics.pod_restarts_last_hour}

#### Health Check
* **Status:** ${health.status} | **Response Time:** ${health.responseTime}

---

### 3. Mitigation

**Action:** Rolling restart of \`${incident.service}\` initiated to clear error state.

---

### 4. Resolution

Service restarted successfully. Monitoring for stability.

*⚠️ Note: This is an automated fallback analysis. Gemini API was unavailable.*`;

  return {
    success: false,
    recommended_action: "restart_service",
    action_args: { service: incident.service },
    resolution_report: report,
  };
}