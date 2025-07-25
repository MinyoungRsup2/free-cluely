import { app, BrowserWindow } from "electron"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "../helpers/WindowHelper"
import { ScreenshotHelper } from "../helpers/ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { ProcessingHelper } from "../helpers/ProcessingHelper"
import { RealtimeScreenHelper } from "../helpers/RealtimeScreenHelper"

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper
  public processingHelper: ProcessingHelper
  public realtimeScreenHelper: RealtimeScreenHelper

  // View management
  private view: "queue" | "solutions" = "queue"

  private problemInfo: {
    problem_statement: string
    input_format: Record<string, any>
    output_format: Record<string, any>
    constraints: Array<Record<string, any>>
    test_cases: Array<Record<string, any>>
  } | null = null // Allow null

  private hasDebugged: boolean = false

  // Processing events
  public readonly PROCESSING_EVENTS = {
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
  } as const

  constructor() {
    // Initialize WindowHelper with this
    this.windowHelper = new WindowHelper(this)

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)

    // Initialize RealtimeScreenHelper
    this.realtimeScreenHelper = new RealtimeScreenHelper(this)

    // Initialize ShortcutsHelper
    this.shortcutsHelper = new ShortcutsHelper(this)
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Getters and Setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper
  }

  public getProblemInfo(): any {
    return this.problemInfo
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    console.log(
      "Screenshots: ",
      this.screenshotHelper.getScreenshotQueue().length,
      "Extra screenshots: ",
      this.screenshotHelper.getExtraScreenshotQueue().length
    )
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()

    // Clear problem info
    this.problemInfo = null

    // Reset view to initial state
    this.setView("queue")
  }

  // Screenshot management methods
  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  // New methods to move the window
  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }

  // Overlay window management
  public setOverlayMouseRegions(regions: Array<{x: number, y: number, width: number, height: number}>): void {
    this.windowHelper.setOverlayMouseRegions(regions)
  }

  public createOverlayWindow(): Electron.BrowserWindow | null {
    return this.windowHelper.createOverlayWindow()
  }

  public getOverlayWindow(): Electron.BrowserWindow | null {
    return this.windowHelper.getOverlayWindow()
  }

  public showOverlayWindow(): void {
    this.windowHelper.showOverlayWindow()
  }

  public hideOverlayWindow(): void {
    this.windowHelper.hideOverlayWindow()
  }

  public destroyOverlayWindow(): void {
    this.windowHelper.destroyOverlayWindow()
  }

  // Test methods for setIgnoreMouseEvents functionality
  public enableClickCapture(): void {
    this.windowHelper.enableClickCapture()
  }

  public enableClickThrough(): void {
    this.windowHelper.enableClickThrough()
  }

  public toggleClickMode(): void {
    this.windowHelper.toggleClickMode()
  }

  // E key interaction control methods
  public enableOverlayInteraction(): void {
    this.windowHelper.enableOverlayInteraction()
  }

  public disableOverlayInteraction(): void {
    this.windowHelper.disableOverlayInteraction()
  }

  // Element overlay window management
  public createElementOverlayWindow(elementId: string, bounds: {x: number, y: number, width: number, height: number}): Electron.BrowserWindow {
    return this.windowHelper.createElementOverlayWindow(elementId, bounds)
  }

  public closeElementOverlayWindow(elementId: string): void {
    this.windowHelper.closeElementOverlayWindow(elementId)
  }

  public closeAllElementOverlayWindows(): void {
    this.windowHelper.closeAllElementOverlayWindows()
  }

  public resizeElementOverlayWindow(window: BrowserWindow, width: number, height: number): void {
    this.windowHelper.resizeElementOverlayWindow(window, width, height)
  }

  // Selection overlay window management for E + drag functionality
  public createSelectionOverlayWindow(): Electron.BrowserWindow {
    return this.windowHelper.createSelectionOverlayWindow()
  }

  public getSelectionOverlayWindow(): Electron.BrowserWindow | null {
    return this.windowHelper.getSelectionOverlayWindow()
  }
  
  // Contextual popup window management
  public createContextualPopupWindow(data: any, position: { x: number, y: number }): Electron.BrowserWindow | null {
    return this.windowHelper.createContextualPopupWindow(data, position)
  }
  public closeContextualPopupWindow(): void {
    this.windowHelper.closeContextualPopupWindow()
  }
  public getContextualPopupWindow(): Electron.BrowserWindow | null {
    return this.windowHelper.getContextualPopupWindow()
  }

  public closeSelectionOverlayWindow(): void {
    this.windowHelper.closeSelectionOverlayWindow()
  }

  public createContextualPopupOverlay(x: number, y: number, width?: number, height?: number): Electron.BrowserWindow {
    return this.windowHelper.createContextualPopupOverlay(x, y, width, height)
  }

  // Screenshot cropping functionality
  public async cropScreenshotToRectangle(screenshotBuffer: Buffer, rectangle: {x: number, y: number, width: number, height: number}): Promise<Buffer> {
    // Use the screenshot helper to crop the image
    return this.screenshotHelper.cropImage(screenshotBuffer, rectangle)
  }
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance()

  // Initialize IPC handlers before window creation
  initializeIpcHandlers(appState)

  app.whenReady().then(() => {
    console.log("App is ready")
    // Create main window for the new binary state system
    appState.createWindow()
    // Register global shortcuts using ShortcutsHelper
    appState.shortcutsHelper.registerGlobalShortcuts()
  })

  app.on("activate", () => {
    console.log("App activated")
    if (appState.getMainWindow() === null) {
      appState.createWindow()
    }
  })

  // Quit when all windows are closed, except on macOS
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  app.dock?.hide() // Hide dock icon (optional)
  app.commandLine.appendSwitch("disable-background-timer-throttling")
}

// Start the application
initializeApp().catch(console.error)
