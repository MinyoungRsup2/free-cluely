"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortcutsHelper = void 0;
const electron_1 = require("electron");
const LensHelper_1 = require("../lens/LensHelper");
const LensStore_1 = require("../lens/LensStore");
class ShortcutsHelper {
    appState;
    lensOperations;
    lensActivation;
    isEKeyPressed = false;
    constructor(appState) {
        this.appState = appState;
        // Initialize lens operations with dependencies
        const dependencies = {
            screenshotHelper: appState.getScreenshotHelper(),
            processingHelper: appState.processingHelper,
            windowHelper: {
                hideMainWindow: () => appState.hideMainWindow(),
                showMainWindow: () => appState.showMainWindow(),
                getMainWindow: () => appState.getMainWindow()
            }
        };
        this.lensOperations = (0, LensHelper_1.createLensOperations)(dependencies);
        this.lensActivation = (0, LensHelper_1.createLensActivation)(this.lensOperations);
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
        // globalShortcut.register("CommandOrControl+Enter", async () => {
        //   await this.appState.processingHelper.processScreenshots()
        // })
        // New shortcuts for moving the window
        // globalShortcut.register("CommandOrControl+Left", () => {
        //   console.log("Command/Ctrl + Left pressed. Moving window left.")
        //   this.appState.moveWindowLeft()
        // })
        // globalShortcut.register("CommandOrControl+Right", () => {
        //   console.log("Command/Ctrl + Right pressed. Moving window right.")
        //   this.appState.moveWindowRight()
        // })
        // globalShortcut.register("CommandOrControl+Down", () => {
        //   console.log("Command/Ctrl + down pressed. Moving window down.")
        //   this.appState.moveWindowDown()
        // })
        // globalShortcut.register("CommandOrControl+Up", () => {
        //   console.log("Command/Ctrl + Up pressed. Moving window Up.")
        //   this.appState.moveWindowUp()
        // })
        // globalShortcut.register("CommandOrControl+B", () => {
        //   this.appState.toggleMainWindow()
        //   // If window exists and we're showing it, bring it to front
        //   const mainWindow = this.appState.getMainWindow()
        //   if (mainWindow && !this.appState.isVisible()) {
        //     // Force the window to the front on macOS
        //     if (process.platform === "darwin") {
        //       mainWindow.setAlwaysOnTop(true, "normal")
        //       // Reset alwaysOnTop after a brief delay
        //       setTimeout(() => {
        //         if (mainWindow && !mainWindow.isDestroyed()) {
        //           mainWindow.setAlwaysOnTop(true, "floating")
        //         }
        //       }, 100)
        //     }
        //   }
        // })
        // Shift+E lens activation shortcut
        electron_1.globalShortcut.register("Shift+E", () => {
            this.handleShiftEKeyPress();
        });
        // Unregister shortcuts when quitting
        electron_1.app.on("will-quit", () => {
            electron_1.globalShortcut.unregisterAll();
        });
    }
    async handleShiftEKeyPress() {
        if (this.isEKeyPressed) {
            console.log('Shift+E still held, ignoring duplicate press');
            return;
        }
        this.isEKeyPressed = true;
        const store = LensStore_1.useLensStore.getState();
        try {
            console.log('🔍 Shift+E pressed - activating lens mode');
            // Set lens as active and show orbital loading
            store.setActive(true);
            store.setOrbitalVisible(true);
            // Notify renderer of lens activation start
            const mainWindow = this.appState.getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('lens-activation-start');
            }
            // Activate lens with comprehensive analysis
            const result = await this.lensActivation.activateLensStepByStep('athena');
            if (result.isErr()) {
                console.error('❌ Lens activation failed:', result.error.message);
                // Notify renderer of error
                if (mainWindow) {
                    mainWindow.webContents.send('lens-activation-error', {
                        message: result.error.message,
                        type: result.error.type
                    });
                }
                // Reset state
                store.setActive(false);
                store.setOrbitalVisible(false);
                return;
            }
            const lensState = result.value;
            console.log('✅ Lens activated successfully:', {
                route: lensState.currentRoute?.type,
                elements: lensState.elements.length
            });
            // Update store with results
            store.setCurrentRoute(lensState.currentRoute);
            store.setElements(lensState.elements);
            store.setOverlayWindow(lensState.overlayWindow);
            store.setOrbitalVisible(false); // Hide loading, show overlay
            // Notify renderer of successful activation
            if (mainWindow) {
                mainWindow.webContents.send('lens-activation-success', {
                    route: lensState.currentRoute,
                    elementsCount: lensState.elements.length
                });
            }
            // Set up Shift+E release handler (simplified - in real implementation would need key event handling)
            setTimeout(() => {
                this.handleShiftEKeyRelease();
            }, 5000); // Auto-release after 5 seconds for testing
        }
        catch (error) {
            console.error('💥 Unexpected error in lens activation:', error);
            // Reset state on error
            store.setActive(false);
            store.setOrbitalVisible(false);
            const errorWindow = this.appState.getMainWindow();
            if (errorWindow && !errorWindow.isDestroyed()) {
                errorWindow.webContents.send('lens-activation-error', {
                    message: 'Unexpected error during lens activation',
                    type: 'UNKNOWN_ERROR'
                });
            }
        }
        finally {
            this.isEKeyPressed = false;
        }
    }
    handleShiftEKeyRelease() {
        console.log('🔍 Shift+E released - deactivating lens mode');
        const store = LensStore_1.useLensStore.getState();
        const currentState = {
            isActive: store.isActive,
            orbitalVisible: store.orbitalVisible,
            overlayWindow: store.overlayWindow,
            currentRoute: store.currentRoute,
            elements: store.elements,
            cache: new Map() // TODO: get from store
        };
        // Deactivate lens
        const result = this.lensActivation.deactivateLens(currentState);
        if (result.isErr()) {
            console.error('❌ Lens deactivation failed:', result.error.message);
        }
        else {
            console.log('✅ Lens deactivated successfully');
        }
        // Reset store state
        store.setActive(false);
        store.setOrbitalVisible(false);
        store.setOverlayWindow(null);
        // Notify renderer
        const mainWindow = this.appState.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('lens-deactivated');
        }
    }
}
exports.ShortcutsHelper = ShortcutsHelper;
//# sourceMappingURL=shortcuts.js.map