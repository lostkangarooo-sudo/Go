
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const analyzeMarketCatalyst = async (headline: string, marketContext: string, retries = 5) => {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the following news headline for a prediction market: "${headline}". 
        The market context is: "${marketContext}". 
        Provide a quantitative Bayesian update for the probability of the outcome occurring.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              modelProbability: {
                type: Type.NUMBER,
                description: "Probability between 0.0 and 1.0 based on historical news reactions."
              },
              sentimentScore: {
                type: Type.NUMBER,
                description: "Normalized sentiment from -1.0 to 1.0."
              },
              reasoning: {
                type: Type.STRING,
                description: "Short explanation of the Bayesian shift."
              },
              confidence: {
                type: Type.NUMBER,
                description: "Confidence in this assessment (0.0 to 1.0)."
              }
            },
            required: ["modelProbability", "sentimentScore", "reasoning", "confidence"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response from Gemini");
      }

      return JSON.parse(response.text.trim());
    } catch (e: any) {
      lastError = e;
      
      // Robust error detection for GenAI SDK
      const errorData = e?.error || e;
      const code = errorData?.code || (typeof e?.message === 'string' && e.message.includes('429') ? 429 : 0);
      const status = errorData?.status || "";
      const message = errorData?.message || e?.message || String(e);

      const isRateLimit = code === 429 || status === "RESOURCE_EXHAUSTED" || message.toLowerCase().includes('quota');
      const isUnavailable = code === 503 || status === "UNAVAILABLE" || message.toLowerCase().includes('unavailable');
      
      if (isRateLimit || isUnavailable) {
        if (i < retries - 1) {
          // Jittered Exponential Backoff
          const waitTime = Math.pow(2, i) * 3000 + Math.random() * 2000;
          const statusText = isRateLimit ? "Quota Exhausted (429)" : "Service Unavailable (503)";
          console.warn(`${statusText}: ${message}. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${retries})`);
          await delay(waitTime);
          continue;
        }
      }
      
      console.error("Gemini API Error Detail:", { code, status, message });
      throw e;
    }
  }
  
  throw lastError;
};
