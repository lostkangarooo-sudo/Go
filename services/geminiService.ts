
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const analyzeMarketCatalyst = async (headline: string, marketContext: string, retries = 3) => {
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
      
      const errorData = e?.error || e;
      const code = errorData?.code || (typeof e?.message === 'string' && e.message.includes('429') ? 429 : 0);
      const status = errorData?.status || "";
      const message = errorData?.message || e?.message || String(e);

      const isRateLimit = code === 429 || status === "RESOURCE_EXHAUSTED" || message.toLowerCase().includes('quota');
      
      if (isRateLimit) {
        // Higher initial wait for quota issues
        const waitTime = Math.pow(3, i) * 5000 + Math.random() * 2000;
        console.warn(`Quota limited. Backing off ${Math.round(waitTime)}ms...`);
        await delay(waitTime);
        continue;
      }
      
      if (code === 503 || status === "UNAVAILABLE") {
        await delay(2000);
        continue;
      }

      throw e;
    }
  }
  
  throw lastError;
};
