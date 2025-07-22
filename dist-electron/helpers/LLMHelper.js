"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMHelper = void 0;
const generative_ai_1 = require("@google/generative-ai");
const fs_1 = __importDefault(require("fs"));
class LLMHelper {
    model;
    systemPrompt = `You are Wingman AI, a helpful, proactive assistant for any kind of problem or situation (not just coding). For any user input, analyze the situation, provide a clear problem statement, relevant context, and suggest several possible responses or actions the user could take next. Always explain your reasoning. Present your suggestions as a list of options or next steps.`;
    constructor(apiKey) {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }
    async fileToGenerativePart(imagePath) {
        const imageData = await fs_1.default.promises.readFile(imagePath);
        return {
            inlineData: {
                data: imageData.toString("base64"),
                mimeType: "image/png"
            }
        };
    }
    cleanJsonResponse(text) {
        // Remove markdown code block syntax if present
        text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
        // Remove any leading/trailing whitespace
        text = text.trim();
        return text;
    }
    /**
     * Analyze a screenshot buffer with a custom prompt - used by lens system
     */
    async analyzeScreenshotWithPrompt(screenshotBuffer, customPrompt) {
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
        }
        catch (error) {
            console.error("Error analyzing screenshot with custom prompt:", error);
            throw error;
        }
    }
}
exports.LLMHelper = LLMHelper;
//# sourceMappingURL=LLMHelper.js.map