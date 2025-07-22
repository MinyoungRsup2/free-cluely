import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import fs from "fs"

export class LLMHelper {
  private model: GenerativeModel
  private readonly systemPrompt = `You are Wingman AI, a helpful, proactive assistant for any kind of problem or situation (not just coding). For any user input, analyze the situation, provide a clear problem statement, relevant context, and suggest several possible responses or actions the user could take next. Always explain your reasoning. Present your suggestions as a list of options or next steps.`

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  }

  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath)
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png"
      }
    }
  }

  private cleanJsonResponse(text: string): string {
    // Remove markdown code block syntax if present
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    // Remove any leading/trailing whitespace
    text = text.trim();
    return text;
  }

  /**
   * Analyze a screenshot buffer with a custom prompt - used by lens system
   */
  public async analyzeScreenshotWithPrompt(screenshotBuffer: Buffer, customPrompt: string): Promise<string> {
    try {
      const imagePart = {
        inlineData: {
          data: screenshotBuffer.toString("base64"),
          mimeType: "image/png"
        }
      };
      
      const result = await this.model.generateContent([customPrompt, imagePart]);
      const response = await result.response;
      const rawText = response.text();
      
      // Clean JSON response to remove markdown code blocks
      return this.cleanJsonResponse(rawText);
    } catch (error) {
      console.error("Error analyzing screenshot with custom prompt:", error);
      throw error;
    }
  }
} 