
import { GoogleGenAI } from "@google/genai";

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

export const findNearbyHubs = async (query: string, latitude: number, longitude: number) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `List verified medical clinics, pharmacies, or medicine drop-boxes specifically in "${query}". 
      Return a RAW BULLET LIST. 
      Format: * [Name] | [Address] | [Hours] | [Rating]
      
      CRITICAL: No intro, no outro, no conversational filler. Just the list.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude,
              longitude
            }
          }
        }
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    return {
      text,
      sources: groundingChunks?.map((chunk: any) => ({
        title: chunk.maps?.title || "Medical Center",
        uri: chunk.maps?.uri
      })) || []
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
      console.warn("Maps Grounding: Quota exceeded, using fallback data.");
      return { 
        text: "* City General Hospital | 123 Main St | 24/7 | 4.8\n* Community Wellness Pharmacy | 456 Oak Ave | 9AM-9PM | 4.5\n* MedRoute Drop-box | Central Metro Station | 24/7 | 5.0", 
        sources: [],
        isFallback: true 
      };
    }
    
    console.error("Maps Grounding Error:", error);
    return { text: "Search currently unavailable. Please try again later.", sources: [] };
  }
};

export const getDisasterZoneFacilities = async (zoneName: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `List major hospitals and medical emergency centers in "${zoneName}". 
      Return a RAW JSON ARRAY of objects with name, lat, lng.
      Example: [{"name": "City Hospital", "lat": 12.34, "lng": 56.78}]
      
      CRITICAL: No intro, no outro, just the JSON array.`,
      config: {
        tools: [{ googleMaps: {} }]
      },
    });

    const text = response.text || "[]";
    try {
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']') + 1;
      if (jsonStart === -1 || jsonEnd === 0) return [];
      return JSON.parse(text.substring(jsonStart, jsonEnd));
    } catch {
      return [];
    }
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
      console.warn("Disaster Grounding: Quota exceeded, using fallback data.");
      if (zoneName.toLowerCase().includes("kerala")) {
        return [
          { name: "General Hospital Pathanamthitta", lat: 9.2648, lng: 76.7870 },
          { name: "Muthoot Medical Centre", lat: 9.2712, lng: 76.7815 },
          { name: "St. Gregorios Hospital", lat: 9.2580, lng: 76.7920 }
        ];
      }
      // Generic fallback
      return [
        { name: "Emergency Relief Hub A", lat: 20.5937, lng: 78.9629 },
        { name: "Mobile Medical Unit 1", lat: 20.6000, lng: 78.9700 }
      ];
    }
    
    console.error("Disaster Grounding Error:", error);
    return [];
  }
};

export const getRoadRoute = async (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Provide a detailed list of 15-20 lat/lng coordinates that follow ACTUAL ROADS between start point (${start.lat}, ${start.lng}) and end point (${end.lat}, ${end.lng}). 
      The coordinates must follow real streets, highways, and turns. 
      Return a RAW JSON ARRAY of objects with lat and lng.
      Example: [{"lat": 28.61, "lng": 77.20}, {"lat": 28.62, "lng": 77.21}]
      
      CRITICAL: No intro, no outro, just the JSON array.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: start.lat,
              longitude: start.lng
            }
          }
        }
      },
    });

    const text = response.text || "[]";
    try {
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']') + 1;
      if (jsonStart === -1 || jsonEnd === 0) return [];
      return JSON.parse(text.substring(jsonStart, jsonEnd));
    } catch {
      return [];
    }
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
      console.warn("Routing: Quota exceeded, using fallback straight path.");
      return [
        start,
        { lat: start.lat + (end.lat - start.lat) * 0.33, lng: start.lng + (end.lng - start.lng) * 0.1 },
        { lat: start.lat + (end.lat - start.lat) * 0.66, lng: start.lng + (end.lng - start.lng) * 0.9 },
        end
      ];
    }
    
    console.error("Routing Error:", error);
    // Fallback simple grid path if AI fails
    return [
      start,
      { lat: start.lat + (end.lat - start.lat) * 0.5, lng: start.lng },
      { lat: start.lat + (end.lat - start.lat) * 0.5, lng: end.lng },
      end
    ];
  }
};
