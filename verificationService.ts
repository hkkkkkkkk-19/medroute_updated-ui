/**
 * Smart Medicine Redistribution Network - Clinical Verification Engine
 * Powered by AI Engine.
 */

import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("AI_API_KEY is not defined. Please set it in your environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const extractMedicineDetails = async (base64Image: string) => {
  try {
    console.log("[Verification] Phase 1: Analyzing image with AI Engine...");
    const ai = getAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: "image/jpeg",
            },
          },
          {
            text: `
              STRICT PHARMACEUTICAL AUDIT.
              Analyze the provided image of a medicine packet or label.
              
              TASK: Extract metadata for safety verification and inventory audit.
              Analyze the number of tablets visible.
              Identify if the medicine pack appears opened or partially used.
              
              RETURN JSON ONLY:
              {
                "name": "Full medicine name",
                "expiryDate": "YYYY-MM-DD",
                "strength": "Dosage/Concentration",
                "brand": "Manufacturer",
                "tabletCount": 10,
                "isOpened": false,
                "isReadable": true,
                "reasoning": "Clinical summary"
              }
              Set isReadable: false if the product is expired, the label is unreadable, or it is an invalid item.
            `,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            strength: { type: Type.STRING },
            brand: { type: Type.STRING },
            tabletCount: { type: Type.NUMBER },
            isOpened: { type: Type.BOOLEAN },
            isReadable: { type: Type.BOOLEAN },
            reasoning: { type: Type.STRING }
          },
          required: ["name", "expiryDate", "strength", "brand", "tabletCount", "isOpened", "isReadable", "reasoning"],
        },
      },
    });

    const clinicalData = JSON.parse(response.text || "{}");
    
    // Clinical Validation: Expiry Check
    // Current Date: 2026-03-09
    // Threshold: 1 month from now (2026-04-09)
    if (clinicalData.isReadable && clinicalData.expiryDate) {
      const expiry = new Date(clinicalData.expiryDate);
      const today = new Date("2026-03-09");
      const oneMonthFromNow = new Date("2026-04-09");

      if (isNaN(expiry.getTime())) {
        clinicalData.isReadable = false;
        clinicalData.reasoning = "Invalid expiry date format detected.";
      } else if (expiry <= today) {
        clinicalData.isReadable = false;
        clinicalData.reasoning = `Audit Failed: Medicine has expired (Expiry: ${clinicalData.expiryDate}). We cannot accept expired medications for safety reasons.`;
      } else if (expiry <= oneMonthFromNow) {
        clinicalData.isReadable = false;
        clinicalData.reasoning = `Audit Failed: Medicine expires too soon (Expiry: ${clinicalData.expiryDate}). We require at least 1 month of shelf life for redistribution.`;
      }
    }
    
    return {
      ...clinicalData,
      isReadable: clinicalData.isReadable ?? true,
      name: clinicalData.name || "Identified Item"
    };

  } catch (error: any) {
    // Robust check for quota exhaustion
    const isQuotaError = 
      error?.status === "RESOURCE_EXHAUSTED" || 
      error?.code === 429 ||
      error?.error?.status === "RESOURCE_EXHAUSTED" ||
      error?.error?.code === 429 ||
      JSON.stringify(error).includes("RESOURCE_EXHAUSTED") ||
      JSON.stringify(error).includes("429");

    if (isQuotaError) {
      console.warn("[Verification] Quota exceeded.");
      return { 
        isReadable: false, 
        reasoning: "AI Verification is currently at capacity. Please wait a few seconds and try again. We are working to restore full extraction capabilities." 
      };
    }

    console.error("[Verification] Error:", error);
    return { isReadable: false, reasoning: "Clinical analysis failed. Please ensure the image is clear and well-lit." };
  }
};
