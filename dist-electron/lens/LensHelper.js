"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLensActivation = exports.createLensOperations = void 0;
const neverthrow_1 = require("neverthrow");
const EHRMappings_1 = require("./EHRMappings");
const LensSchemas_1 = require("./LensSchemas");
// Factory function that creates our lens operations with captured dependencies
const createLensOperations = (dependencies) => {
    const { screenshotHelper, processingHelper, windowHelper } = dependencies;
    // Pure functions for each lens operation
    const takeScreenshot = async () => {
        try {
            const buffer = await screenshotHelper.takeScreenshotAsBuffer(() => windowHelper.hideMainWindow(), () => windowHelper.showMainWindow());
            return (0, neverthrow_1.ok)(buffer);
        }
        catch (error) {
            return (0, neverthrow_1.err)({
                type: 'SCREENSHOT_FAILED',
                message: 'Failed to capture screenshot',
                details: error
            });
        }
    };
    const detectRoute = async (screenshot, ehrSystem = 'athena') => {
        try {
            // Use structured prompt from EHR mapping
            const routePrompt = EHRMappings_1.promptGenerators.createRoutePrompt(ehrSystem);
            const result = await processingHelper.analyzeScreenshot(screenshot, routePrompt);
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
            const parseResult = LensSchemas_1.parseWithWarnings.route(parsedData);
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
            const elements = parseResult.data.map((el, index) => ({
                id: `element-${index}`,
                type: el.type,
                bounds: {
                    x: el.bounds.x,
                    y: el.bounds.y,
                    width: el.bounds.width,
                    height: el.bounds.height
                },
                confidence: el.confidence,
                actions: el.suggested_actions || []
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
            // Instead of creating a separate window, use the main window for overlay
            const mainWindow = windowHelper.getMainWindow ? windowHelper.getMainWindow() : null;
            console.log('DEBUG: windowHelper.getMainWindow exists?', !!windowHelper.getMainWindow);
            console.log('DEBUG: mainWindow:', !!mainWindow);
            if (!mainWindow || mainWindow.isDestroyed()) {
                return (0, neverthrow_1.err)({
                    type: 'OVERLAY_CREATION_FAILED',
                    message: `Main window not available for overlay. Window exists: ${!!mainWindow}, windowHelper has getMainWindow: ${!!windowHelper.getMainWindow}`,
                    details: { hasGetMainWindow: !!windowHelper.getMainWindow, windowExists: !!mainWindow }
                });
            }
            // Send overlay data to the main React renderer
            console.log('DEBUG: Sending lens-overlay-elements with', elements.length, 'elements');
            mainWindow.webContents.send('lens-overlay-elements', elements);
            return (0, neverthrow_1.ok)(mainWindow);
        }
        catch (error) {
            return (0, neverthrow_1.err)({
                type: 'OVERLAY_CREATION_FAILED',
                message: 'Failed to create overlay window',
                details: error
            });
        }
    };
    // Comprehensive analysis - route + elements in one call for better performance
    const analyzeScreenComprehensively = async (screenshot, ehrSystem = 'athena') => {
        try {
            const comprehensivePrompt = EHRMappings_1.promptGenerators.createComprehensivePrompt(ehrSystem);
            const result = await processingHelper.analyzeScreenshot(screenshot, comprehensivePrompt);
            console.log(result);
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
                actions: el.suggested_actions || []
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
        createOrbital,
        createOverlay
    };
};
exports.createLensOperations = createLensOperations;
// Composed lens activation function
const createLensActivation = (operations) => {
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
        console.log('Route detected:', routeResult);
        const elementsResult = await operations.detectElements(screenshotResult.value, routeResult.value);
        console.log('Elements detected:', elementsResult);
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
            overlayWindow: overlayResult.value,
            currentRoute: routeResult.value,
            elements: elementsResult.value,
            cache: new Map()
        });
    };
    const deactivateLens = (state) => {
        try {
            if (state.overlayWindow && !state.overlayWindow.isDestroyed()) {
                state.overlayWindow.close();
            }
            return (0, neverthrow_1.ok)({
                ...state,
                isActive: false,
                overlayWindow: null,
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
    return { activateLensStepByStep, deactivateLens };
};
exports.createLensActivation = createLensActivation;
//# sourceMappingURL=LensHelper.js.map