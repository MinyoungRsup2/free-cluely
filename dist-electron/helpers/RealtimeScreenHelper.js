"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeScreenHelper = void 0;
const electron_1 = require("electron");
class RealtimeScreenHelper {
    isMonitoring = false;
    appState;
    constructor(appState) {
        this.appState = appState;
    }
    async startMonitoring() {
        if (this.isMonitoring)
            return;
        this.isMonitoring = true;
        console.log("Starting real-time screen monitoring...");
        console.log("Recording mode active - ready for manual actions");
    }
    stopMonitoring() {
        if (!this.isMonitoring)
            return;
        this.isMonitoring = false;
        console.log("Stopped real-time screen monitoring");
    }
    async captureCurrentScreen() {
        try {
            // Hide main window to avoid capturing it
            this.appState.hideMainWindow();
            // Small delay to ensure window is hidden
            await new Promise(resolve => setTimeout(resolve, 100));
            // Get primary display
            const primaryDisplay = electron_1.screen.getPrimaryDisplay();
            // Capture entire screen using desktopCapturer
            const sources = await electron_1.desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: {
                    width: primaryDisplay.workAreaSize.width,
                    height: primaryDisplay.workAreaSize.height
                }
            });
            if (sources.length === 0) {
                throw new Error("No screen sources available");
            }
            const screenCapture = sources[0];
            const imageDataUrl = screenCapture.thumbnail.toDataURL();
            // Show main window again
            this.appState.showMainWindow();
            return imageDataUrl;
        }
        catch (error) {
            // Ensure window is shown even on error
            this.appState.showMainWindow();
            throw error;
        }
    }
    async analyzeCurrentScreenForActions() {
        if (!this.isMonitoring) {
            throw new Error("Monitoring is not active");
        }
        try {
            const imageDataUrl = await this.captureCurrentScreen();
            // Check if this looks like an Athena EHR screen with patient data
            const prompt = `Analyze this screen capture and determine if this appears to be an Athena EHR screen with patient information visible.
      
      Look for the typical Athena EHR patient information pattern:
      [Patient Name]
      [Middle Name/Identifier or "NA"]
      [Age]yo [Gender][DOB]#[ID Numbers]
      
      If you can see this pattern or similar patient information layout, respond with "YES".
      If this doesn't look like an Athena EHR patient screen, respond with "NO".
      
      Response format: Just "YES" or "NO", nothing else.`;
            // Convert data URL to base64 for Gemini
            const base64Data = imageDataUrl.split(',')[1];
            // Use the LLMHelper directly with image data
            const llmHelper = this.appState.processingHelper.getLLMHelper();
            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/png"
                }
            };
            const result = await llmHelper.model.generateContent([prompt, imagePart]);
            const response = result.response;
            const text = response.text().trim().toUpperCase();
            // If it looks like Athena EHR with patient data, return the action
            if (text === "YES") {
                return [{
                        id: "get-patient-info",
                        label: "Get Patient Name and ID",
                        description: "Extract patient name and ID from Athena EHR",
                        confidence: 0.95
                    }];
            }
            else {
                return [];
            }
        }
        catch (error) {
            console.error("Error analyzing screen for actions:", error);
            return [];
        }
    }
    async executeAction(actionId) {
        console.log(`Executing action: ${actionId}`);
        try {
            // Get the detected patient info from Athena EHR screen
            const detectedInfo = await this.getNameFromScreen();
            console.log(`Detected patient info: ${detectedInfo}`);
            // Extract patient ID from the detected info
            const patientId = this.extractPatientId(detectedInfo);
            if (patientId) {
                console.log(`Extracted patient ID: ${patientId}`);
                // Query GraphQL API to find consumer by EHR patient ID
                const consumerData = await this.findConsumerByEhrPatientId(patientId);
                // Navigate to companion URL if consumer found
                if (consumerData?.findFirstConsumer?.id) {
                    const consumerId = consumerData.findFirstConsumer.id;
                    await this.navigateToCompanionUrl(consumerId);
                }
                // Send the complete data to renderer
                this.appState.getMainWindow()?.webContents.send('action-executed', {
                    actionId,
                    detectedName: detectedInfo,
                    patientId,
                    consumerData,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                // No patient ID found, send just the detected info
                this.appState.getMainWindow()?.webContents.send('action-executed', {
                    actionId,
                    detectedName: detectedInfo,
                    error: "Could not extract patient ID from detected info",
                    timestamp: new Date().toISOString()
                });
            }
        }
        catch (error) {
            console.error("Error executing action:", error);
            this.appState.getMainWindow()?.webContents.send('action-executed', {
                actionId,
                error: "Failed to extract patient info from Athena EHR",
                timestamp: new Date().toISOString()
            });
        }
    }
    async getNameFromScreen() {
        try {
            const imageDataUrl = await this.captureCurrentScreen();
            // Use AI to extract patient name and ID from Athena EHR screen
            const prompt = `Analyze this screen capture and look for an Athena EHR patient information block that follows this specific pattern:

      [Patient Name]
      [Middle Name/Identifier or "NA"]
      [Age]yo [Gender][DOB]#[ID Numbers]

      Example pattern:
      Minyoungo
      NA
      69yo F09-03-1955#27103 E#27103

      Find this exact 3-line pattern on the screen and extract the patient name and ID.
      
      Rules:
      - Look for the 3-line patient info block described above
      - Extract the patient name (first line) and the patient ID numbers (from the third line after #)
      - Return in format: "Name: [PatientName], ID: [PatientID]"
      - If this specific pattern is not found, return "No patient found"
      - If name is found but ID is unclear, return "Name: [PatientName], ID: Unknown"
      
      Response format: "Name: [PatientName], ID: [PatientID]"`;
            // Convert data URL to base64 for Gemini
            const base64Data = imageDataUrl.split(',')[1];
            // Use the LLMHelper directly with image data
            const llmHelper = this.appState.processingHelper.getLLMHelper();
            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/png"
                }
            };
            const result = await llmHelper.model.generateContent([prompt, imagePart]);
            const response = result.response;
            const detectedInfo = response.text().trim();
            return detectedInfo || "No patient found";
        }
        catch (error) {
            console.error("Error extracting patient name from Athena EHR:", error);
            return "Error extracting patient name";
        }
    }
    isCurrentlyMonitoring() {
        return this.isMonitoring;
    }
    extractPatientId(detectedInfo) {
        // Extract patient ID from format: "Name: Minyoungo, ID: 27103"
        const idMatch = detectedInfo.match(/ID:\s*(\d+)/i);
        return idMatch ? idMatch[1] : null;
    }
    async findConsumerByEhrPatientId(ehrPatientId) {
        try {
            const apiUrl = process.env.USERS_API_URL;
            if (!apiUrl) {
                throw new Error("USERS_API_URL environment variable not set");
            }
            // Use native fetch for GraphQL query
            const query = `
        query findConsumerByEhrPatientId($ehrPatientId: String!) {
          findFirstConsumer(where: { ehrPatientId: { equals: $ehrPatientId } }) {
            id
          }
        }
      `;
            const variables = { ehrPatientId };
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
            }
            console.log(`GraphQL response:`, data);
            return data.data;
        }
        catch (error) {
            console.error("Error querying GraphQL API:", error);
            throw error;
        }
    }
    async navigateToCompanionUrl(consumerId) {
        try {
            const companionUrl = process.env.COMPANION_URL;
            if (!companionUrl) {
                console.warn("COMPANION_URL environment variable not set, skipping navigation");
                return;
            }
            // Build the full URL: {COMPANION_URL}/home/consumer/{consumerId}?tab=upcoming
            const fullUrl = `${companionUrl}/home/consumer/${consumerId}?tab=upcoming`;
            console.log(`Navigating to companion URL: ${fullUrl}`);
            // Open URL in default browser
            electron_1.shell.openExternal(fullUrl);
        }
        catch (error) {
            console.error("Error navigating to companion URL:", error);
        }
    }
}
exports.RealtimeScreenHelper = RealtimeScreenHelper;
//# sourceMappingURL=RealtimeScreenHelper.js.map