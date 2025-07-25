"use strict";
// ipcHandlers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeIpcHandlers = initializeIpcHandlers;
const electron_1 = require("electron");
function initializeIpcHandlers(appState) {
    electron_1.ipcMain.handle("update-content-dimensions", async (event, { width, height }) => {
        if (width && height) {
            appState.setWindowDimensions(width, height);
        }
    });
    electron_1.ipcMain.handle("delete-screenshot", async (event, path) => {
        return appState.deleteScreenshot(path);
    });
    electron_1.ipcMain.handle("take-screenshot", async () => {
        try {
            const screenshotPath = await appState.takeScreenshot();
            const preview = await appState.getImagePreview(screenshotPath);
            return { path: screenshotPath, preview };
        }
        catch (error) {
            console.error("Error taking screenshot:", error);
            throw error;
        }
    });
    electron_1.ipcMain.handle("get-screenshots", async () => {
        console.log({ view: appState.getView() });
        try {
            let previews = [];
            if (appState.getView() === "queue") {
                previews = await Promise.all(appState.getScreenshotQueue().map(async (path) => ({
                    path,
                    preview: await appState.getImagePreview(path)
                })));
            }
            else {
                previews = await Promise.all(appState.getExtraScreenshotQueue().map(async (path) => ({
                    path,
                    preview: await appState.getImagePreview(path)
                })));
            }
            previews.forEach((preview) => console.log(preview.path));
            return previews;
        }
        catch (error) {
            console.error("Error getting screenshots:", error);
            throw error;
        }
    });
    electron_1.ipcMain.handle("toggle-window", async () => {
        appState.toggleMainWindow();
    });
    electron_1.ipcMain.handle("reset-queues", async () => {
        try {
            appState.clearQueues();
            console.log("Screenshot queues have been cleared.");
            return { success: true };
        }
        catch (error) {
            console.error("Error resetting queues:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("quit-app", () => {
        electron_1.app.quit();
    });
    // Realtime screen monitoring handlers
    electron_1.ipcMain.handle("start-realtime-monitoring", async () => {
        try {
            await appState.realtimeScreenHelper.startMonitoring();
            return { success: true };
        }
        catch (error) {
            console.error("Error starting realtime monitoring:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("stop-realtime-monitoring", () => {
        try {
            appState.realtimeScreenHelper.stopMonitoring();
            return { success: true };
        }
        catch (error) {
            console.error("Error stopping realtime monitoring:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("execute-action", async (event, actionId) => {
        try {
            await appState.realtimeScreenHelper.executeAction(actionId);
            return { success: true };
        }
        catch (error) {
            console.error("Error executing action:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("is-monitoring", () => {
        return appState.realtimeScreenHelper.isCurrentlyMonitoring();
    });
    electron_1.ipcMain.handle("analyze-current-screen", async () => {
        try {
            const actions = await appState.realtimeScreenHelper.analyzeCurrentScreenForActions();
            return { success: true, actions };
        }
        catch (error) {
            console.error("Error analyzing current screen:", error);
            return { success: false, error: error.message };
        }
    });
    // Overlay window management
    electron_1.ipcMain.handle("set-overlay-mouse-regions", async (event, regions) => {
        try {
            appState.setOverlayMouseRegions(regions);
            return { success: true };
        }
        catch (error) {
            console.error("Error setting overlay mouse regions:", error);
            return { success: false, error: error.message };
        }
    });
    // Test methods for setIgnoreMouseEvents
    electron_1.ipcMain.handle("test-enable-click-capture", async () => {
        try {
            appState.enableClickCapture();
            return { success: true };
        }
        catch (error) {
            console.error("Error enabling click capture:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("test-enable-click-through", async () => {
        try {
            appState.enableClickThrough();
            return { success: true };
        }
        catch (error) {
            console.error("Error enabling click through:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("test-toggle-click-mode", async () => {
        try {
            appState.toggleClickMode();
            return { success: true };
        }
        catch (error) {
            console.error("Error toggling click mode:", error);
            return { success: false, error: error.message };
        }
    });
    // Test method to create overlay windows with mock data
    electron_1.ipcMain.handle("test-create-overlay-windows", async () => {
        try {
            // Mock lens elements for testing
            const mockElements = [
                {
                    id: "test-element-1",
                    type: "Button",
                    bounds: { x: 100, y: 100, width: 200, height: 50 },
                    confidence: 0.95,
                    actions: ["Click", "Hover"],
                    detected_structure: {
                        "Label": { text: "Submit Button", confidence: 0.98 }
                    }
                },
                {
                    id: "test-element-2",
                    type: "Input Field",
                    bounds: { x: 100, y: 200, width: 300, height: 40 },
                    confidence: 0.88,
                    actions: ["Type", "Clear", "Focus"],
                    detected_structure: {
                        "Placeholder": { text: "Enter your name", confidence: 0.92 }
                    }
                },
                {
                    id: "test-element-3",
                    type: "Dropdown",
                    bounds: { x: 100, y: 300, width: 150, height: 35 },
                    confidence: 0.92,
                    actions: ["Click", "Select"],
                    detected_structure: {
                        "Label": { text: "Select Country", confidence: 0.89 }
                    }
                }
            ];
            // Create overlay windows for each element
            for (const element of mockElements) {
                appState.createElementOverlayWindow(element.id, element.bounds);
            }
            console.log(`✅ Created ${mockElements.length} test overlay windows`);
            return { success: true, elements: mockElements };
        }
        catch (error) {
            console.error("Error creating test overlay windows:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("test-close-overlay-windows", async () => {
        try {
            appState.closeAllElementOverlayWindows();
            console.log("🧹 Closed all test overlay windows");
            return { success: true };
        }
        catch (error) {
            console.error("Error closing test overlay windows:", error);
            return { success: false, error: error.message };
        }
    });
    // Overlay window resize handler
    electron_1.ipcMain.handle("resize-overlay-window", async (event, { elementId, width, height }) => {
        try {
            // Get the overlay window from the sender
            const senderWindow = electron_1.BrowserWindow.fromWebContents(event.sender);
            if (!senderWindow || senderWindow.isDestroyed()) {
                return { success: false, error: "Sender window not found" };
            }
            // Resize the overlay window
            appState.resizeElementOverlayWindow(senderWindow, width, height);
            return { success: true };
        }
        catch (error) {
            console.error("Error resizing overlay window:", error);
            return { success: false, error: error.message };
        }
    });
    // Lens selection handlers
    electron_1.ipcMain.handle("lens-selection-complete", async (event, rectangle) => {
        try {
            console.log("📋 Received selection completion:", rectangle);
            // Emit to main process listeners
            electron_1.ipcMain.emit('lens-selection-complete', event, rectangle);
            return { success: true };
        }
        catch (error) {
            console.error("Error handling selection complete:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("lens-selection-cancel", async (event) => {
        try {
            console.log("❌ Received selection cancellation");
            // Emit to main process listeners
            electron_1.ipcMain.emit('lens-selection-cancel', event);
            return { success: true };
        }
        catch (error) {
            console.error("Error handling selection cancel:", error);
            return { success: false, error: error.message };
        }
    });
    // Contextual popup handlers
    electron_1.ipcMain.handle("create-contextual-popup", async (event, { data, position }) => {
        try {
            console.log("🗨️ Creating contextual popup window");
            const popupWindow = appState.createContextualPopupWindow(data, position);
            return { success: true, windowId: popupWindow?.id };
        }
        catch (error) {
            console.error("Error creating contextual popup:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("close-contextual-popup", async () => {
        try {
            console.log("🗑️ Closing contextual popup window");
            appState.closeContextualPopupWindow();
            return { success: true };
        }
        catch (error) {
            console.error("Error closing contextual popup:", error);
            return { success: false, error: error.message };
        }
    });
    // Handle actions from contextual popup
    electron_1.ipcMain.on("contextual-popup-action", (event, action) => {
        console.log("🎯 Received action from contextual popup:", action);
        // Forward the action to all windows
        electron_1.BrowserWindow.getAllWindows().forEach(window => {
            if (!window.isDestroyed() && window.webContents !== event.sender) {
                window.webContents.send("contextual-popup-action", action);
            }
        });
    });
    // Handle contextual popup close event
    electron_1.ipcMain.on("contextual-popup-close", () => {
        console.log("❌ Contextual popup requested close");
        appState.closeContextualPopupWindow();
    });
}
//# sourceMappingURL=ipcHandlers.js.map