"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortcutsHelper = void 0;
const electron_1 = require("electron");
const LensHelper_1 = require("../lens/LensHelper");
const gql_electron_1 = require("../gql-electron");
class ShortcutsHelper {
    appState;
    lensOperations;
    lensActivation;
    isEKeyPressed = false;
    eKeyPressTimer = null;
    constructor(appState) {
        this.appState = appState;
        // Initialize lens operations with dependencies
        const dependencies = {
            screenshotHelper: appState.getScreenshotHelper(),
            processingHelper: appState.processingHelper,
            windowHelper: {
                hideMainWindow: () => appState.hideMainWindow(),
                showMainWindow: () => appState.showMainWindow(),
                getMainWindow: () => appState.getMainWindow(),
                setOverlayMouseRegions: (regions) => appState.setOverlayMouseRegions(regions),
                createElementOverlayWindow: (elementId, bounds) => appState.createElementOverlayWindow(elementId, bounds),
                closeElementOverlayWindow: (elementId) => appState.closeElementOverlayWindow(elementId),
                closeAllElementOverlayWindows: () => appState.closeAllElementOverlayWindows()
            }
        };
        this.lensOperations = (0, LensHelper_1.createLensOperations)(dependencies);
        this.lensActivation = (0, LensHelper_1.createLensActivation)(this.lensOperations, dependencies);
    }
    registerGlobalShortcuts() {
        electron_1.globalShortcut.register("CommandOrControl+H", async () => {
            const mainWindow = this.appState.getMainWindow();
            if (mainWindow) {
                console.log("Taking screenshot...");
                try {
                    const screenshotPath = await this.appState.takeScreenshot();
                    const preview = await this.appState.getImagePreview(screenshotPath);
                    mainWindow.webContents.send("screenshot-taken", {
                        path: screenshotPath,
                        preview
                    });
                }
                catch (error) {
                    console.error("Error capturing screenshot:", error);
                }
            }
        });
        // Test overlay windows with Cmd/Ctrl+T
        electron_1.globalShortcut.register("CommandOrControl+T", async () => {
            console.log("🧪 Testing overlay windows...");
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
                    const overlayWindow = this.appState.createElementOverlayWindow(element.id, element.bounds);
                    // Send the element data to the overlay window once it's loaded
                    overlayWindow.webContents.once('did-finish-load', () => {
                        console.log(`📡 Sending element data to overlay window for ${element.id}`);
                        overlayWindow.webContents.send('lens-overlay-element', element);
                    });
                }
                console.log(`✅ Created ${mockElements.length} test overlay windows`);
            }
            catch (error) {
                console.error("Error creating test overlay windows:", error);
            }
        });
        // Close overlay windows with Cmd/Ctrl+Shift+T
        electron_1.globalShortcut.register("CommandOrControl+Shift+T", async () => {
            console.log("🧹 Closing all overlay windows...");
            try {
                this.appState.closeAllElementOverlayWindows();
                console.log("✅ All overlay windows closed");
            }
            catch (error) {
                console.error("Error closing overlay windows:", error);
            }
        });
        // E key for lens drag selection
        electron_1.globalShortcut.register("E", () => {
            this.handleEKeyPress();
        });
        // Test E+drag system with Cmd/Ctrl+D
        electron_1.globalShortcut.register("CommandOrControl+D", () => {
            console.log("🧪 Testing E+drag system...");
            this.handleEKeyPress();
        });
        // Unregister shortcuts when quitting
        electron_1.app.on("will-quit", () => {
            electron_1.globalShortcut.unregisterAll();
        });
    }
    async handleEKeyPress() {
        if (this.isEKeyPressed) {
            console.log('E key still held, ignoring duplicate press');
            return;
        }
        this.isEKeyPressed = true;
        try {
            console.log('🎯 E key pressed - enabling overlay interaction and starting selection mode');
            // Enable overlay interaction when key is pressed
            this.appState.enableOverlayInteraction();
            // Get main window and send selection activation event
            const mainWindow = this.appState.getMainWindow();
            if (!mainWindow || mainWindow.isDestroyed()) {
                console.error('❌ Main window not available');
                this.appState.disableOverlayInteraction(); // Clean up on error
                this.isEKeyPressed = false;
                return;
            }
            // Send selection activation to main window
            mainWindow.webContents.send('lens-selection-activate');
            // Listen for selection completion from main window
            const handleSelectionComplete = async (_event, rectangle) => {
                console.log('🔲 Selection completed:', rectangle);
                try {
                    // Activate lens with drag selection
                    const result = await this.lensActivation.activateLensWithDragSelection(rectangle, 'athena');
                    if (result.isErr()) {
                        console.error('❌ Lens drag activation failed:', result.error.message);
                        // Send error back to main window
                        mainWindow.webContents.send('lens-analysis-error', result.error.message);
                        return;
                    }
                    console.log('✅ result:', JSON.stringify(result, null, 4));
                    const analysisResult = result.value;
                    console.log('✅ Focused analysis completed:', analysisResult.element.type);
                    console.log('🔍 Analysis result structure:', JSON.stringify(analysisResult, null, 2));
                    // Check if patient_name exists in detected_structure
                    const patientNameData = analysisResult.element.detected_structure?.patient_name;
                    if (!patientNameData || !patientNameData.text) {
                        console.error('❌ No patient name found in analysis result');
                        mainWindow.webContents.send('lens-analysis-error', 'No patient name detected in selection');
                        return;
                    }
                    const [firstname, lastname] = patientNameData.text.split(' ');
                    console.log('👤 Looking up patient:', firstname, lastname);
                    const consumer = await (0, gql_electron_1.findConsumerByName)(firstname, lastname);
                    console.log('👤 Consumer found:', consumer);
                    const boughtTreatments = await (0, gql_electron_1.findBoughtTreatmentByConsumerId)(consumer.findFirstConsumer.id);
                    console.log('💊 Treatments found:', boughtTreatments);
                    // Create contextual popup window with analysis results
                    const popupData = { ...analysisResult, metadata: { consumer, boughtTreatments } };
                    // Calculate position based on the selection rectangle
                    const popupPosition = {
                        x: rectangle.x + rectangle.width + 10, // Position to the right of the selection
                        y: rectangle.y + rectangle.height / 2 // Center vertically on the selection
                    };
                    console.log('🗨️ Creating contextual popup at position:', popupPosition);
                    this.appState.createContextualPopupWindow(popupData, popupPosition);
                    // Notify main window that analysis is complete and popup is shown
                    console.log('📤 Sending contextual-popup-opened event');
                    mainWindow.webContents.send('contextual-popup-opened');
                }
                catch (error) {
                    console.error('💥 Error processing selection:', error);
                    mainWindow.webContents.send('lens-analysis-error', error.message);
                }
                finally {
                    // Always disable overlay interaction after selection completes
                    this.appState.disableOverlayInteraction();
                    this.isEKeyPressed = false;
                }
            };
            const handleSelectionCancel = () => {
                console.log('❌ Selection cancelled - disabling overlay interaction');
                // Disable overlay interaction when selection is cancelled
                this.appState.disableOverlayInteraction();
                this.isEKeyPressed = false;
            };
            // Set up IPC listeners (temporarily)
            const { ipcMain } = require('electron');
            ipcMain.once('lens-selection-complete', handleSelectionComplete);
            ipcMain.once('lens-selection-cancel', handleSelectionCancel);
        }
        catch (error) {
            console.error('💥 Unexpected error in E key handler:', error);
            this.appState.disableOverlayInteraction(); // Clean up on error
            this.isEKeyPressed = false;
        }
    }
    // Clean up method
    cleanup() {
        if (this.eKeyPressTimer) {
            clearTimeout(this.eKeyPressTimer);
            this.eKeyPressTimer = null;
        }
        this.isEKeyPressed = false;
        this.appState.disableOverlayInteraction();
    }
}
exports.ShortcutsHelper = ShortcutsHelper;
//# sourceMappingURL=shortcuts.js.map