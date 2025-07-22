// ProcessingHelper.ts

import { AppState } from "../core/main"
import { LLMHelper } from "./LLMHelper"
import dotenv from "dotenv"

dotenv.config()

const isDev = process.env.NODE_ENV === "development"
const isDevTest = process.env.IS_DEV_TEST === "true"
const MOCK_API_WAIT_TIME = Number(process.env.MOCK_API_WAIT_TIME) || 500

export class ProcessingHelper {
  private appState: AppState
  private llmHelper: LLMHelper

  constructor(appState: AppState) {
    this.appState = appState
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables")
    }
    this.llmHelper = new LLMHelper(apiKey)
  }


  public getLLMHelper() {
    return this.llmHelper;
  }

  /**
   * Analyze a screenshot buffer with custom prompt - used by lens system
   */
  public async analyzeScreenshot(screenshotBuffer: Buffer, prompt: string): Promise<string> {
    return this.llmHelper.analyzeScreenshotWithPrompt(screenshotBuffer, prompt);
  }
}
