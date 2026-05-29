import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        "Please analyze these two receipt images from 'จีรกิตติ์ ไม้แบบพลาสติก อุตรดิตถ์'. " +
        "Image 1 URL: https://gastric-orange-yspco0uroh.edgeone.app/53042B07-35D2-4395-8BAF-EB1E197D2EBC.jpg " +
        "Image 2 URL: https://lively-coral-sbmrw6xmzy.edgeone.app/IMG_0824.jpeg " +
        "Describe exactly how the layout looks in each image, including: " +
        "1. All Thai labels, text headers, titles, and text blocks " +
        "2. The table column names, sizes, or line formats " +
        "3. Any signatures, checkboxes, stamps, or text in margins " +
        "4. Any discrepancy between standard layouts and this specific printed receipt (e.g. what's printed, what's missing, is there any specific alignment, etc.). " +
        "Output the analysis in detail so I can translate it to perfect CSS/HTML styles."
      ]
    });
    console.log("=== GEMINI ANALYSIS ===");
    console.log(response.text);
  } catch (error) {
    console.error("Error communicating with Gemini:", error);
  }
}

run();
