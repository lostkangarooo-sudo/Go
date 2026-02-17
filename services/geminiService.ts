
import { GoogleGenAI, Type } from "@google/genai";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const analyzeMarketCatalyst = async (headline: string, marketContext: string, retries = 5) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze: "${headline}" in context of ${marketContext}.`,
        config: {
          systemInstruction: "You are a senior quantitative analyst. Provide a quantitative Bayesian update (0.0 to 1.0) for the probability of a bullish outcome based on the news provided. Respond strictly in JSON format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              modelProbability: {
                type: Type.NUMBER,
                description: "Probability between 0.0 and 1.0."
              },
              sentimentScore: {
                type: Type.NUMBER,
                description: "Sentiment from -1.0 to 1.0."
              },
              reasoning: {
                type: Type.STRING,
                description: "Brief quantitative justification."
              },
              confidence: {
                type: Type.NUMBER,
                description: "Model confidence in this specific event analysis."
              }
            },
            required: ["modelProbability", "sentimentScore", "reasoning", "confidence"]
          }
        }
      });

      if (!response.text) throw new Error("Empty response");
      return JSON.parse(response.text.trim());
      
    } catch (e: any) {
      lastError = e;
      const errorData = e?.error || e;
      const code = errorData?.code || (e.message?.includes('429') ? 429 : 0);
      
      if (code === 429 || errorData?.status === "RESOURCE_EXHAUSTED") {
        const waitTime = Math.pow(2.5, i) * 4000 + Math.random() * 2000;
        console.warn(`Rate limit (429) hit. Attempt ${i + 1}/${retries}. Waiting ${Math.round(waitTime)}ms...`);
        await delay(waitTime);
        continue;
      }
      
      if (code === 503 || errorData?.status === "UNAVAILABLE") {
        await delay(3000);
        continue;
      }

      throw e;
    }
  }
  
  throw lastError;
};
