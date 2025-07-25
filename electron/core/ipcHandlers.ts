// ipcHandlers.ts

import { ipcMain, app, BrowserWindow } from "electron"
import { AppState } from "./main"

export function initializeIpcHandlers(appState: AppState): void {
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        appState.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return appState.deleteScreenshot(path)
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      throw error
    }
  })

  ipcMain.handle("get-screenshots", async () => {
    console.log({ view: appState.getView() })
    try {
      let previews = []
      if (appState.getView() === "queue") {
        previews = await Promise.all(
          appState.getScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      } else {
        previews = await Promise.all(
          appState.getExtraScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      }
      previews.forEach((preview: any) => console.log(preview.path))
      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  ipcMain.handle("toggle-window", async () => {
    appState.toggleMainWindow()
  })

  ipcMain.handle("reset-queues", async () => {
    try {
      appState.clearQueues()
      console.log("Screenshot queues have been cleared.")
      return { success: true }
    } catch (error: any) {
      console.error("Error resetting queues:", error)
      return { success: false, error: error.message }
    }
  })


  ipcMain.handle("quit-app", () => {
    app.quit()
  })

  // Realtime screen monitoring handlers
  ipcMain.handle("start-realtime-monitoring", async () => {
    try {
      await appState.realtimeScreenHelper.startMonitoring()
      return { success: true }
    } catch (error: any) {
      console.error("Error starting realtime monitoring:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("stop-realtime-monitoring", () => {
    try {
      appState.realtimeScreenHelper.stopMonitoring()
      return { success: true }
    } catch (error: any) {
      console.error("Error stopping realtime monitoring:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("execute-action", async (event, actionId: string) => {
    try {
      await appState.realtimeScreenHelper.executeAction(actionId)
      return { success: true }
    } catch (error: any) {
      console.error("Error executing action:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("is-monitoring", () => {
    return appState.realtimeScreenHelper.isCurrentlyMonitoring()
  })

  ipcMain.handle("analyze-current-screen", async () => {
    try {
      const actions = await appState.realtimeScreenHelper.analyzeCurrentScreenForActions()
      return { success: true, actions }
    } catch (error: any) {
      console.error("Error analyzing current screen:", error)
      return { success: false, error: error.message }
    }
  })

  // Overlay window management
  ipcMain.handle("set-overlay-mouse-regions", async (event, regions: Array<{x: number, y: number, width: number, height: number}>) => {
    try {
      appState.setOverlayMouseRegions(regions)
      return { success: true }
    } catch (error: any) {
      console.error("Error setting overlay mouse regions:", error)
      return { success: false, error: error.message }
    }
  })

  // Test methods for setIgnoreMouseEvents
  ipcMain.handle("test-enable-click-capture", async () => {
    try {
      appState.enableClickCapture()
      return { success: true }
    } catch (error: any) {
      console.error("Error enabling click capture:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("test-enable-click-through", async () => {
    try {
      appState.enableClickThrough()
      return { success: true }
    } catch (error: any) {
      console.error("Error enabling click through:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("test-toggle-click-mode", async () => {
    try {
      appState.toggleClickMode()
      return { success: true }
    } catch (error: any) {
      console.error("Error toggling click mode:", error)
      return { success: false, error: error.message }
    }
  })

  // Test method to create overlay windows with mock data
  ipcMain.handle("test-create-overlay-windows", async () => {
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
      ]

      // Create overlay windows for each element
      for (const element of mockElements) {
        appState.createElementOverlayWindow(element.id, element.bounds)
      }

      console.log(`✅ Created ${mockElements.length} test overlay windows`)
      return { success: true, elements: mockElements }
    } catch (error: any) {
      console.error("Error creating test overlay windows:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("test-close-overlay-windows", async () => {
    try {
      appState.closeAllElementOverlayWindows()
      console.log("🧹 Closed all test overlay windows")
      return { success: true }
    } catch (error: any) {
      console.error("Error closing test overlay windows:", error)
      return { success: false, error: error.message }
    }
  })

  // Overlay window resize handler
  ipcMain.handle("resize-overlay-window", async (event, { elementId, width, height }: { elementId?: string, width: number, height: number }) => {
    try {
      // Get the overlay window from the sender
      const senderWindow = BrowserWindow.fromWebContents(event.sender)
      
      if (!senderWindow || senderWindow.isDestroyed()) {
        return { success: false, error: "Sender window not found" }
      }

      // Resize the overlay window
      appState.resizeElementOverlayWindow(senderWindow, width, height)
      return { success: true }
    } catch (error: any) {
      console.error("Error resizing overlay window:", error)
      return { success: false, error: error.message }
    }
  })

  // Lens selection handlers
  ipcMain.handle("lens-selection-complete", async (event, rectangle: {x: number, y: number, width: number, height: number}) => {
    try {
      console.log("📋 Received selection completion:", rectangle)
      // Emit to main process listeners
      ipcMain.emit('lens-selection-complete', event, rectangle)
      return { success: true }
    } catch (error: any) {
      console.error("Error handling selection complete:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("lens-selection-cancel", async (event) => {
    try {
      console.log("❌ Received selection cancellation")
      // Emit to main process listeners
      ipcMain.emit('lens-selection-cancel', event)
      return { success: true }
    } catch (error: any) {
      console.error("Error handling selection cancel:", error)
      return { success: false, error: error.message }
    }
  })
}
