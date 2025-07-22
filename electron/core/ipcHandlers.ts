// ipcHandlers.ts

import { ipcMain, app } from "electron"
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
}
