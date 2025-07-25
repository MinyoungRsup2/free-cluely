"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppState = void 0;
const electron_1 = require("electron");
const ipcHandlers_1 = require("./ipcHandlers");
const WindowHelper_1 = require("../helpers/WindowHelper");
const ScreenshotHelper_1 = require("../helpers/ScreenshotHelper");
const shortcuts_1 = require("./shortcuts");
const ProcessingHelper_1 = require("../helpers/ProcessingHelper");
const RealtimeScreenHelper_1 = require("../helpers/RealtimeScreenHelper");
class AppState {
    static instance = null;
    windowHelper;
    screenshotHelper;
    shortcutsHelper;
    processingHelper;
    realtimeScreenHelper;
    // View management
    view = "queue";
    problemInfo = null; // Allow null
    hasDebugged = false;
    // Processing events
    PROCESSING_EVENTS = {
        //global states
        UNAUTHORIZED: "procesing-unauthorized",
        NO_SCREENSHOTS: "processing-no-screenshots",
        //states for generating the initial solution
        INITIAL_START: "initial-start",
        PROBLEM_EXTRACTED: "problem-extracted",
        SOLUTION_SUCCESS: "solution-success",
        INITIAL_SOLUTION_ERROR: "solution-error",
        //states for processing the debugging
        DEBUG_START: "debug-start",
        DEBUG_SUCCESS: "debug-success",
        DEBUG_ERROR: "debug-error"
    };
    constructor() {
        // Initialize WindowHelper with this
        this.windowHelper = new WindowHelper_1.WindowHelper(this);
        // Initialize ScreenshotHelper
        this.screenshotHelper = new ScreenshotHelper_1.ScreenshotHelper(this.view);
        // Initialize ProcessingHelper
        this.processingHelper = new ProcessingHelper_1.ProcessingHelper(this);
        // Initialize RealtimeScreenHelper
        this.realtimeScreenHelper = new RealtimeScreenHelper_1.RealtimeScreenHelper(this);
        // Initialize ShortcutsHelper
        this.shortcutsHelper = new shortcuts_1.ShortcutsHelper(this);
    }
    static getInstance() {
        if (!AppState.instance) {
            AppState.instance = new AppState();
        }
        return AppState.instance;
    }
    // Getters and Setters
    getMainWindow() {
        return this.windowHelper.getMainWindow();
    }
    createWindow() {
        this.windowHelper.createWindow();
    }
    getView() {
        return this.view;
    }
    setView(view) {
        this.view = view;
        this.screenshotHelper.setView(view);
    }
    isVisible() {
        return this.windowHelper.isVisible();
    }
    getScreenshotHelper() {
        return this.screenshotHelper;
    }
    getProblemInfo() {
        return this.problemInfo;
    }
    setProblemInfo(problemInfo) {
        this.problemInfo = problemInfo;
    }
    getScreenshotQueue() {
        return this.screenshotHelper.getScreenshotQueue();
    }
    getExtraScreenshotQueue() {
        return this.screenshotHelper.getExtraScreenshotQueue();
    }
    hideMainWindow() {
        this.windowHelper.hideMainWindow();
    }
    showMainWindow() {
        this.windowHelper.showMainWindow();
    }
    toggleMainWindow() {
        console.log("Screenshots: ", this.screenshotHelper.getScreenshotQueue().length, "Extra screenshots: ", this.screenshotHelper.getExtraScreenshotQueue().length);
        this.windowHelper.toggleMainWindow();
    }
    setWindowDimensions(width, height) {
        this.windowHelper.setWindowDimensions(width, height);
    }
    clearQueues() {
        this.screenshotHelper.clearQueues();
        // Clear problem info
        this.problemInfo = null;
        // Reset view to initial state
        this.setView("queue");
    }
    // Screenshot management methods
    async takeScreenshot() {
        if (!this.getMainWindow())
            throw new Error("No main window available");
        const screenshotPath = await this.screenshotHelper.takeScreenshot(() => this.hideMainWindow(), () => this.showMainWindow());
        return screenshotPath;
    }
    async getImagePreview(filepath) {
        return this.screenshotHelper.getImagePreview(filepath);
    }
    async deleteScreenshot(path) {
        return this.screenshotHelper.deleteScreenshot(path);
    }
    // New methods to move the window
    moveWindowLeft() {
        this.windowHelper.moveWindowLeft();
    }
    moveWindowRight() {
        this.windowHelper.moveWindowRight();
    }
    moveWindowDown() {
        this.windowHelper.moveWindowDown();
    }
    moveWindowUp() {
        this.windowHelper.moveWindowUp();
    }
    setHasDebugged(value) {
        this.hasDebugged = value;
    }
    getHasDebugged() {
        return this.hasDebugged;
    }
    // Overlay window management
    setOverlayMouseRegions(regions) {
        this.windowHelper.setOverlayMouseRegions(regions);
    }
    createOverlayWindow() {
        return this.windowHelper.createOverlayWindow();
    }
    getOverlayWindow() {
        return this.windowHelper.getOverlayWindow();
    }
    showOverlayWindow() {
        this.windowHelper.showOverlayWindow();
    }
    hideOverlayWindow() {
        this.windowHelper.hideOverlayWindow();
    }
    destroyOverlayWindow() {
        this.windowHelper.destroyOverlayWindow();
    }
    // Test methods for setIgnoreMouseEvents functionality
    enableClickCapture() {
        this.windowHelper.enableClickCapture();
    }
    enableClickThrough() {
        this.windowHelper.enableClickThrough();
    }
    toggleClickMode() {
        this.windowHelper.toggleClickMode();
    }
    // E key interaction control methods
    enableOverlayInteraction() {
        this.windowHelper.enableOverlayInteraction();
    }
    disableOverlayInteraction() {
        this.windowHelper.disableOverlayInteraction();
    }
    // Element overlay window management
    createElementOverlayWindow(elementId, bounds) {
        return this.windowHelper.createElementOverlayWindow(elementId, bounds);
    }
    closeElementOverlayWindow(elementId) {
        this.windowHelper.closeElementOverlayWindow(elementId);
    }
    closeAllElementOverlayWindows() {
        this.windowHelper.closeAllElementOverlayWindows();
    }
    resizeElementOverlayWindow(window, width, height) {
        this.windowHelper.resizeElementOverlayWindow(window, width, height);
    }
    // Selection overlay window management for E + drag functionality
    createSelectionOverlayWindow() {
        return this.windowHelper.createSelectionOverlayWindow();
    }
    getSelectionOverlayWindow() {
        return this.windowHelper.getSelectionOverlayWindow();
    }
    // Contextual popup window management
    createContextualPopupWindow(data, position) {
        return this.windowHelper.createContextualPopupWindow(data, position);
    }
    closeContextualPopupWindow() {
        this.windowHelper.closeContextualPopupWindow();
    }
    getContextualPopupWindow() {
        return this.windowHelper.getContextualPopupWindow();
    }
    closeSelectionOverlayWindow() {
        this.windowHelper.closeSelectionOverlayWindow();
    }
    createContextualPopupOverlay(x, y, width, height) {
        return this.windowHelper.createContextualPopupOverlay(x, y, width, height);
    }
    // Screenshot cropping functionality
    async cropScreenshotToRectangle(screenshotBuffer, rectangle) {
        // Use the screenshot helper to crop the image
        return this.screenshotHelper.cropImage(screenshotBuffer, rectangle);
    }
}
exports.AppState = AppState;
// Application initialization
async function initializeApp() {
    const appState = AppState.getInstance();
    // Initialize IPC handlers before window creation
    (0, ipcHandlers_1.initializeIpcHandlers)(appState);
    electron_1.app.whenReady().then(() => {
        console.log("App is ready");
        // Create main window for the new binary state system
        appState.createWindow();
        // Register global shortcuts using ShortcutsHelper
        appState.shortcutsHelper.registerGlobalShortcuts();
    });
    electron_1.app.on("activate", () => {
        console.log("App activated");
        if (appState.getMainWindow() === null) {
            appState.createWindow();
        }
    });
    // Quit when all windows are closed, except on macOS
    electron_1.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            electron_1.app.quit();
        }
    });
    electron_1.app.dock?.hide(); // Hide dock icon (optional)
    electron_1.app.commandLine.appendSwitch("disable-background-timer-throttling");
}
// Start the application
initializeApp().catch(console.error);
//# sourceMappingURL=main.js.map