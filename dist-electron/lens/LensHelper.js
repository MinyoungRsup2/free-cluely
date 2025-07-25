"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLensActivation = exports.createLensOperations = void 0;
const neverthrow_1 = require("neverthrow");
const electron_1 = require("electron");
const EHRMappings_1 = require("./EHRMappings");
const LensSchemas_1 = require("./LensSchemas");
const fs = require('fs');
const path = require('path');
const performanceLog = [];
const startTimer = (operation, metadata) => {
    const startTime = performance.now();
    performanceLog.push({
        operation,
        startTime,
        metadata
    });
    console.log(`🚀 [${operation}] Started${metadata ? ` (${JSON.stringify(metadata)})` : ''}`);
    return startTime;
};
const endTimer = (operation, startTime) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    // Find and update the log entry
    const logEntry = performanceLog.find(entry => entry.operation === operation && entry.startTime === startTime);
    if (logEntry) {
        logEntry.endTime = endTime;
        logEntry.duration = duration;
    }
    console.log(`✅ [${operation}] Completed in ${duration.toFixed(2)}ms`);
    return duration;
};
const getPerformanceReport = () => {
    return performanceLog.slice(-20); // Return last 20 operations
};
// Factory function that creates our lens operations with captured dependencies
const createLensOperations = (dependencies) => {
    const { screenshotHelper, processingHelper, windowHelper } = dependencies;
    // Pure functions for each lens operation
    const takeScreenshot = async () => {
        const startTime = startTimer('Screenshot Capture');
        try {
            const buffer = await screenshotHelper.takeScreenshotAsBuffer(() => windowHelper.hideMainWindow(), () => windowHelper.showMainWindow());
            endTimer('Screenshot Capture', startTime);
            return (0, neverthrow_1.ok)(buffer);
        }
        catch (error) {
            endTimer('Screenshot Capture', startTime);
            return (0, neverthrow_1.err)({
                type: 'SCREENSHOT_FAILED',
                message: 'Failed to capture screenshot',
                details: error
            });
        }
    };
    const detectRoute = async (screenshot, ehrSystem = 'athena') => {
        const startTime = startTimer('Route Detection', { ehrSystem, bufferSize: screenshot.length });
        try {
            // Use structured prompt from EHR mapping
            const promptStartTime = startTimer('Route Prompt Generation', { ehrSystem });
            const routePrompt = EHRMappings_1.promptGenerators.createRoutePrompt(ehrSystem);
            endTimer('Route Prompt Generation', promptStartTime);
            const aiStartTime = startTimer('AI Route Analysis', { promptLength: routePrompt.length });
            const result = await processingHelper.analyzeScreenshot(screenshot, routePrompt);
            endTimer('AI Route Analysis', aiStartTime);
            let parsedData;
            const jsonParseStartTime = startTimer('JSON Parse (Route)', { responseLength: result.length });
            try {
                parsedData = JSON.parse(result);
                endTimer('JSON Parse (Route)', jsonParseStartTime);
            }
            catch (jsonError) {
                endTimer('JSON Parse (Route)', jsonParseStartTime);
                endTimer('Route Detection', startTime);
                return (0, neverthrow_1.err)({
                    type: 'AI_ANALYSIS_FAILED',
                    message: `Failed to parse JSON response: ${jsonError}`,
                    details: { originalResponse: result, jsonError }
                });
            }
            // Use Zod for safe parsing with warnings
            const zodParseStartTime = startTimer('Zod Validation (Route)');
            const parseResult = LensSchemas_1.parseWithWarnings.route(parsedData);
            endTimer('Zod Validation (Route)', zodParseStartTime);
            if (parseResult.warnings.length > 0) {
                console.warn('⚠️ Route parsing warnings:', parseResult.warnings);
                // Send warnings to renderer for debugging
                const mainWindow = dependencies.windowHelper.getMainWindow?.();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('lens-parsing-warnings', {
                        type: 'route',
                        warnings: parseResult.warnings
                    });
                }
            }
            if (!parseResult.data) {
                return (0, neverthrow_1.err)({
                    type: 'AI_ANALYSIS_FAILED',
                    message: 'Failed to parse route data even with fallbacks',
                    details: { warnings: parseResult.warnings, originalData: parsedData }
                });
            }
            const routeInfo = {
                type: parseResult.data.type,
                confidence: parseResult.data.confidence,
                ehrSystem: parseResult.data.ehrSystem,
                timestamp: Date.now()
            };
            return (0, neverthrow_1.ok)(routeInfo);
        }
        catch (error) {
            return (0, neverthrow_1.err)({
                type: 'AI_ANALYSIS_FAILED',
                message: 'Failed to detect route using EHR mapping',
                details: error
            });
        }
    };
    const detectElements = async (screenshot, route) => {
        try {
            // Use structured prompt from EHR mapping for specific page
            const elementPrompt = EHRMappings_1.promptGenerators.createElementPrompt(route.type, route.ehrSystem);
            // Save the original screenshot buffer to the current directory for debugging
            const screenshotPath = path.join(process.cwd(), 'debug-screenshot.png');
            fs.writeFileSync(screenshotPath, screenshot);
            console.log(`Saved screenshot to ${screenshotPath}`);
            const result = await processingHelper.analyzeScreenshot(screenshot, elementPrompt);
            let parsedData;
            try {
                parsedData = JSON.parse(result);
            }
            catch (jsonError) {
                return (0, neverthrow_1.err)({
                    type: 'AI_ANALYSIS_FAILED',
                    message: `Failed to parse JSON response: ${jsonError}`,
                    details: { originalResponse: result, jsonError }
                });
            }
            // Use Zod for safe parsing with warnings
            const parseResult = LensSchemas_1.parseWithWarnings.elements(parsedData);
            if (parseResult.warnings.length > 0) {
                console.warn('⚠️ Elements parsing warnings:', parseResult.warnings);
                // Send warnings to renderer for debugging
                const mainWindow = dependencies.windowHelper.getMainWindow?.();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('lens-parsing-warnings', {
                        type: 'elements',
                        warnings: parseResult.warnings
                    });
                }
            }
            // Get browser chrome offset (can be made configurable later)
            const browserChromeOffset = 90; // TODO: Make this configurable based on browser type
            const elements = parseResult.data.map((el, index) => ({
                id: `element-${index}`,
                type: el.type,
                bounds: {
                    x: el.bounds.x,
                    y: el.bounds.y + browserChromeOffset,
                    width: el.bounds.width,
                    height: el.bounds.height
                },
                confidence: el.confidence,
                actions: el.suggested_actions || [],
                detected_structure: el.detected_structure || {}
            }));
            return (0, neverthrow_1.ok)(elements);
        }
        catch (error) {
            return (0, neverthrow_1.err)({
                type: 'AI_ANALYSIS_FAILED',
                message: 'Failed to detect elements using EHR mapping',
                details: error
            });
        }
    };
    const createOrbital = () => {
        try {
            // Use main window for orbital indicator instead of separate window
            const mainWindow = windowHelper.getMainWindow?.();
            if (!mainWindow || mainWindow.isDestroyed()) {
                return (0, neverthrow_1.err)({
                    type: 'OVERLAY_CREATION_FAILED',
                    message: 'Main window not available for orbital',
                    details: null
                });
            }
            // Send orbital show command to React renderer
            mainWindow.webContents.send('lens-orbital-show');
            return (0, neverthrow_1.ok)(mainWindow);
        }
        catch (error) {
            return (0, neverthrow_1.err)({
                type: 'OVERLAY_CREATION_FAILED',
                message: 'Failed to create orbital indicator',
                details: error
            });
        }
    };
    const createOverlay = (elements) => {
        try {
            console.log(`🎯 Creating overlays for ${elements.length} elements`);
            // Close any existing overlay windows first
            windowHelper.closeAllElementOverlayWindows();
            // Create one overlay window per element
            const overlayWindows = new Map();
            for (const element of elements) {
                const overlayWindow = windowHelper.createElementOverlayWindow(element.id, element.bounds);
                // Send the specific element data to this overlay window
                overlayWindow.webContents.once('did-finish-load', () => {
                    console.log(`📡 Sending element data to overlay window for ${element.id}`);
                    overlayWindow.webContents.send('lens-overlay-element', element);
                });
                overlayWindows.set(element.id, overlayWindow);
            }
            console.log(`✅ Created ${overlayWindows.size} overlay windows`);
            return (0, neverthrow_1.ok)(overlayWindows);
        }
        catch (error) {
            return (0, neverthrow_1.err)({
                type: 'OVERLAY_CREATION_FAILED',
                message: 'Failed to create overlay windows',
                details: error
            });
        }
    };
    // Focused rectangle analysis for E + drag functionality
    const analyzeFocusedRectangle = async (croppedScreenshot, pageId, rectangle, ehrSystem = 'athena') => {
        const startTime = startTimer('Focused Rectangle Analysis', {
            pageId,
            rectangle: `${rectangle.width}x${rectangle.height}`,
            ehrSystem
        });
        try {
            // Save the cropped screenshot buffer for debugging
            const croppedScreenshotPath = path.join(process.cwd(), 'debug-cropped-screenshot.png');
            fs.writeFileSync(croppedScreenshotPath, croppedScreenshot);
            console.log(`Saved cropped screenshot to ${croppedScreenshotPath}`);
            // Use focused prompt for the cropped area
            const focusedPrompt = EHRMappings_1.promptGenerators.createFocusedRectanglePrompt(pageId, rectangle, ehrSystem);
            const aiStartTime = startTimer('AI Focused Analysis', { promptLength: focusedPrompt.length });
            const result = await processingHelper.analyzeScreenshot(croppedScreenshot, focusedPrompt);
            endTimer('AI Focused Analysis', aiStartTime);
            let parsedData;
            const jsonParseStartTime = startTimer('JSON Parse (Focused)', { responseLength: result.length });
            try {
                parsedData = JSON.parse(result);
                endTimer('JSON Parse (Focused)', jsonParseStartTime);
            }
            catch (jsonError) {
                endTimer('JSON Parse (Focused)', jsonParseStartTime);
                endTimer('Focused Rectangle Analysis', startTime);
                return (0, neverthrow_1.err)({
                    type: 'AI_ANALYSIS_FAILED',
                    message: `Failed to parse JSON response: ${jsonError}`,
                    details: { originalResponse: result, jsonError }
                });
            }
            // Use Zod for safe parsing with warnings
            const zodParseStartTime = startTimer('Zod Validation (Focused)');
            const parseResult = LensSchemas_1.parseWithWarnings.focusedElement(parsedData);
            endTimer('Zod Validation (Focused)', zodParseStartTime);
            if (parseResult.warnings.length > 0) {
                console.warn('⚠️ Focused element parsing warnings:', parseResult.warnings);
                // Send warnings to renderer for debugging
                const mainWindow = dependencies.windowHelper.getMainWindow?.();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('lens-parsing-warnings', {
                        type: 'focused',
                        warnings: parseResult.warnings
                    });
                }
            }
            if (!parseResult.data) {
                endTimer('Focused Rectangle Analysis', startTime);
                return (0, neverthrow_1.err)({
                    type: 'AI_ANALYSIS_FAILED',
                    message: 'Failed to parse focused element data even with fallbacks',
                    details: { warnings: parseResult.warnings, originalData: parsedData }
                });
            }
            endTimer('Focused Rectangle Analysis', startTime);
            return (0, neverthrow_1.ok)(parseResult.data);
        }
        catch (error) {
            endTimer('Focused Rectangle Analysis', startTime);
            return (0, neverthrow_1.err)({
                type: 'AI_ANALYSIS_FAILED',
                message: 'Failed to analyze focused rectangle',
                details: error
            });
        }
    };
    // Comprehensive analysis - route + elements in one call for better performance
    const analyzeScreenComprehensively = async (screenshot, ehrSystem = 'athena') => {
        try {
            const comprehensivePrompt = EHRMappings_1.promptGenerators.createComprehensivePrompt(ehrSystem);
            const result = await processingHelper.analyzeScreenshot(screenshot, comprehensivePrompt);
            let parsedData;
            try {
                parsedData = JSON.parse(result);
            }
            catch (jsonError) {
                return (0, neverthrow_1.err)({
                    type: 'AI_ANALYSIS_FAILED',
                    message: `Failed to parse JSON response: ${jsonError}`,
                    details: { originalResponse: result, jsonError }
                });
            }
            // Use Zod for safe parsing with warnings
            const parseResult = LensSchemas_1.parseWithWarnings.comprehensive(parsedData);
            if (parseResult.warnings.length > 0) {
                console.warn('⚠️ Comprehensive parsing warnings:', parseResult.warnings);
                // Send warnings to renderer for debugging
                const mainWindow = dependencies.windowHelper.getMainWindow?.();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('lens-parsing-warnings', {
                        type: 'comprehensive',
                        warnings: parseResult.warnings
                    });
                }
            }
            if (!parseResult.data) {
                return (0, neverthrow_1.err)({
                    type: 'AI_ANALYSIS_FAILED',
                    message: 'Failed to parse comprehensive data even with fallbacks',
                    details: { warnings: parseResult.warnings, originalData: parsedData }
                });
            }
            const route = {
                type: parseResult.data.route.type,
                confidence: parseResult.data.route.confidence,
                ehrSystem: parseResult.data.route.ehrSystem,
                timestamp: Date.now()
            };
            const elements = parseResult.data.elements.map((el, index) => ({
                id: `element-${index}`,
                type: el.type,
                bounds: {
                    x: el.bounds.x,
                    y: el.bounds.y,
                    width: el.bounds.width,
                    height: el.bounds.height
                },
                confidence: el.confidence,
                actions: el.suggested_actions || [],
                detected_structure: el.detected_structure || {}
            }));
            return (0, neverthrow_1.ok)({ route, elements });
        }
        catch (error) {
            return (0, neverthrow_1.err)({
                type: 'AI_ANALYSIS_FAILED',
                message: 'Failed comprehensive screen analysis',
                details: error
            });
        }
    };
    // Cache management now handled by Zustand store
    return {
        takeScreenshot,
        detectRoute,
        detectElements,
        analyzeScreenComprehensively,
        analyzeFocusedRectangle,
        createOrbital,
        createOverlay,
        windowHelper // Expose windowHelper for use in deactivation
    };
};
exports.createLensOperations = createLensOperations;
// Composed lens activation function  
const createLensActivation = (operations, dependencies) => {
    // Alternative activation using separate route/element calls (for testing/debugging)
    const activateLensStepByStep = async (ehrSystem = 'athena') => {
        const screenshotResult = await operations.takeScreenshot();
        if (screenshotResult.isErr()) {
            return (0, neverthrow_1.err)(screenshotResult.error);
        }
        const routeResult = await operations.detectRoute(screenshotResult.value, ehrSystem);
        if (routeResult.isErr()) {
            return (0, neverthrow_1.err)(routeResult.error);
        }
        const elementsResult = await operations.detectElements(screenshotResult.value, routeResult.value);
        if (elementsResult.isErr()) {
            return (0, neverthrow_1.err)(elementsResult.error);
        }
        const overlayResult = operations.createOverlay(elementsResult.value);
        if (overlayResult.isErr()) {
            return (0, neverthrow_1.err)(overlayResult.error);
        }
        return (0, neverthrow_1.ok)({
            isActive: true,
            orbitalVisible: false,
            overlayWindows: overlayResult.value,
            currentRoute: routeResult.value,
            elements: elementsResult.value,
            cache: new Map()
        });
    };
    // New E + drag activation workflow
    const activateLensWithDragSelection = async (rectangle, ehrSystem = 'athena') => {
        const screenshotResult = await operations.takeScreenshot();
        if (screenshotResult.isErr()) {
            return (0, neverthrow_1.err)(screenshotResult.error);
        }
        // First detect the route to understand what page we're on
        const routeResult = await operations.detectRoute(screenshotResult.value, ehrSystem);
        if (routeResult.isErr()) {
            return (0, neverthrow_1.err)(routeResult.error);
        }
        // Get display info for proper coordinate scaling
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const scaleFactor = primaryDisplay.scaleFactor;
        // Apply scale factor to rectangle coordinates from client
        const scaledRectangle = {
            x: Math.round(rectangle.x * scaleFactor),
            y: Math.round(rectangle.y * scaleFactor),
            width: Math.round(rectangle.width * scaleFactor),
            height: Math.round(rectangle.height * scaleFactor)
        };
        console.log(`🎯 Original rectangle: ${rectangle.x},${rectangle.y} ${rectangle.width}x${rectangle.height}`);
        console.log(`📏 Scale factor: ${scaleFactor}x`);
        console.log(`📐 Scaled rectangle: ${scaledRectangle.x},${scaledRectangle.y} ${scaledRectangle.width}x${scaledRectangle.height}`);
        // Crop the screenshot to the scaled rectangle
        try {
            const cropResult = await dependencies.screenshotHelper.cropImage(screenshotResult.value, scaledRectangle);
            // Analyze the focused rectangle
            const analysisResult = await operations.analyzeFocusedRectangle(cropResult, routeResult.value.type, scaledRectangle, ehrSystem);
            return analysisResult;
        }
        catch (error) {
            return (0, neverthrow_1.err)({
                type: 'SCREENSHOT_FAILED',
                message: 'Failed to crop screenshot to rectangle',
                details: error
            });
        }
    };
    const deactivateLens = (state) => {
        try {
            console.log("🔄 Deactivating lens - closing all overlay windows");
            // Close all individual overlay windows
            state.overlayWindows.forEach((window, elementId) => {
                if (!window.isDestroyed()) {
                    console.log(`🗑️ Closing overlay window for element: ${elementId}`);
                    window.close();
                }
            });
            // Also call the helper method to ensure cleanup
            operations.windowHelper.closeAllElementOverlayWindows();
            // Clear mouse regions (if this is still needed for any remaining UI)
            operations.windowHelper.setOverlayMouseRegions([]);
            return (0, neverthrow_1.ok)({
                ...state,
                isActive: false,
                overlayWindows: new Map(),
                elements: []
            });
        }
        catch (error) {
            return (0, neverthrow_1.err)({
                type: 'OVERLAY_CREATION_FAILED',
                message: 'Failed to deactivate lens',
                details: error
            });
        }
    };
    return {
        activateLensStepByStep,
        activateLensWithDragSelection,
        deactivateLens
    };
};
exports.createLensActivation = createLensActivation;
//# sourceMappingURL=LensHelper.js.map