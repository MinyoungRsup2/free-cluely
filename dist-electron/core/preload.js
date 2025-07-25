"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROCESSING_EVENTS = void 0;
const electron_1 = require("electron");
exports.PROCESSING_EVENTS = {
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
// Expose the Electron API to the renderer process
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    updateContentDimensions: (dimensions) => electron_1.ipcRenderer.invoke("update-content-dimensions", dimensions),
    takeScreenshot: () => electron_1.ipcRenderer.invoke("take-screenshot"),
    getScreenshots: () => electron_1.ipcRenderer.invoke("get-screenshots"),
    deleteScreenshot: (path) => electron_1.ipcRenderer.invoke("delete-screenshot", path),
    // Event listeners
    onScreenshotTaken: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on("screenshot-taken", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("screenshot-taken", subscription);
        };
    },
    onSolutionsReady: (callback) => {
        const subscription = (_, solutions) => callback(solutions);
        electron_1.ipcRenderer.on("solutions-ready", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("solutions-ready", subscription);
        };
    },
    onResetView: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("reset-view", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("reset-view", subscription);
        };
    },
    onSolutionStart: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.INITIAL_START, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.INITIAL_START, subscription);
        };
    },
    onDebugStart: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.DEBUG_START, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.DEBUG_START, subscription);
        };
    },
    onDebugSuccess: (callback) => {
        electron_1.ipcRenderer.on("debug-success", (_event, data) => callback(data));
        return () => {
            electron_1.ipcRenderer.removeListener("debug-success", (_event, data) => callback(data));
        };
    },
    onDebugError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.DEBUG_ERROR, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.DEBUG_ERROR, subscription);
        };
    },
    onSolutionError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription);
        };
    },
    onProcessingNoScreenshots: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.NO_SCREENSHOTS, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.NO_SCREENSHOTS, subscription);
        };
    },
    onProblemExtracted: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription);
        };
    },
    onSolutionSuccess: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription);
        };
    },
    onUnauthorized: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.UNAUTHORIZED, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.UNAUTHORIZED, subscription);
        };
    },
    moveWindowLeft: () => electron_1.ipcRenderer.invoke("move-window-left"),
    moveWindowRight: () => electron_1.ipcRenderer.invoke("move-window-right"),
    analyzeAudioFromBase64: (data, mimeType) => electron_1.ipcRenderer.invoke("analyze-audio-base64", data, mimeType),
    analyzeAudioFile: (path) => electron_1.ipcRenderer.invoke("analyze-audio-file", path),
    analyzeImageFile: (path) => electron_1.ipcRenderer.invoke("analyze-image-file", path),
    quitApp: () => electron_1.ipcRenderer.invoke("quit-app"),
    // Realtime monitoring
    startRealtimeMonitoring: () => electron_1.ipcRenderer.invoke("start-realtime-monitoring"),
    stopRealtimeMonitoring: () => electron_1.ipcRenderer.invoke("stop-realtime-monitoring"),
    executeAction: (actionId) => electron_1.ipcRenderer.invoke("execute-action", actionId),
    isMonitoring: () => electron_1.ipcRenderer.invoke("is-monitoring"),
    onActionsDetected: (callback) => {
        const subscription = (_, actions) => callback(actions);
        electron_1.ipcRenderer.on("actions-detected", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("actions-detected", subscription);
        };
    },
    onActionExecuted: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on("action-executed", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("action-executed", subscription);
        };
    },
    analyzeCurrentScreen: () => electron_1.ipcRenderer.invoke("analyze-current-screen"),
    // Lens system events
    onLensOverlayElements: (callback) => {
        const subscription = (_, elements) => callback(elements);
        electron_1.ipcRenderer.on("lens-overlay-elements", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-overlay-elements", subscription);
        };
    },
    onLensOrbitalShow: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("lens-orbital-show", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-orbital-show", subscription);
        };
    },
    onLensOrbitalHide: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("lens-orbital-hide", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-orbital-hide", subscription);
        };
    },
    // Single element event for individual overlay windows
    onLensOverlayElement: (callback) => {
        const subscription = (_, element) => callback(element);
        electron_1.ipcRenderer.on("lens-overlay-element", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-overlay-element", subscription);
        };
    },
    // Overlay window management
    setOverlayMouseRegions: (regions) => electron_1.ipcRenderer.invoke("set-overlay-mouse-regions", regions),
    // Test methods for setIgnoreMouseEvents
    testEnableClickCapture: () => electron_1.ipcRenderer.invoke("test-enable-click-capture"),
    testEnableClickThrough: () => electron_1.ipcRenderer.invoke("test-enable-click-through"),
    testToggleClickMode: () => electron_1.ipcRenderer.invoke("test-toggle-click-mode"),
    // Test methods for overlay windows
    testCreateOverlayWindows: () => electron_1.ipcRenderer.invoke("test-create-overlay-windows"),
    testCloseOverlayWindows: () => electron_1.ipcRenderer.invoke("test-close-overlay-windows"),
    // Overlay window resizing
    resizeOverlayWindow: (dimensions) => electron_1.ipcRenderer.invoke("resize-overlay-window", dimensions),
    // Lens activation events (placeholders for now)
    onLensActivationStart: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("lens-activation-start", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-activation-start", subscription);
        };
    },
    onLensActivationSuccess: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on("lens-activation-success", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-activation-success", subscription);
        };
    },
    onLensActivationError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on("lens-activation-error", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-activation-error", subscription);
        };
    },
    onLensDeactivated: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("lens-deactivated", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-deactivated", subscription);
        };
    },
    // Selection overlay events
    onLensSelectionActivate: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("lens-selection-activate", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-selection-activate", subscription);
        };
    },
    sendSelectionComplete: (rectangle) => electron_1.ipcRenderer.invoke("lens-selection-complete", rectangle),
    sendSelectionCancel: () => electron_1.ipcRenderer.invoke("lens-selection-cancel"),
    // Analysis result events
    onLensAnalysisResult: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on("lens-analysis-result", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-analysis-result", subscription);
        };
    },
    // Analysis error events  
    onLensAnalysisError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on("lens-analysis-error", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("lens-analysis-error", subscription);
        };
    }
});
//# sourceMappingURL=preload.js.map