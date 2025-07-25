
import { BrowserWindow, screen } from "electron"
import { AppState } from "../core/main"
import path from "node:path"

const isDev = process.env.NODE_ENV === "development"

const startUrl = isDev
  ? "http://localhost:5173"
  : `file://${path.join(__dirname, "../dist/index.html")}`

export class WindowHelper {
  private mainWindow: BrowserWindow | null = null
  private overlayWindow: BrowserWindow | null = null
  private elementOverlayWindows: Map<string, BrowserWindow> = new Map()
  private selectionOverlayWindow: BrowserWindow | null = null
  private contextualPopupWindow: BrowserWindow | null = null
  private isWindowVisible: boolean = false
  private windowPosition: { x: number; y: number } | null = null
  private windowSize: { width: number; height: number } | null = null
  private appState: AppState

  // Initialize with explicit number type and 0 value
  private screenWidth: number = 0
  private screenHeight: number = 0
  private step: number = 0
  private currentX: number = 0
  private currentY: number = 0

  constructor(appState: AppState) {
    this.appState = appState
  }

  public setWindowDimensions(width: number, height: number): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    // Get current window position
    const [currentX, currentY] = this.mainWindow.getPosition()

    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize

    // Use 75% width if debugging has occurred, otherwise use 60%
    const maxAllowedWidth = Math.floor(
      workArea.width * (this.appState.getHasDebugged() ? 0.75 : 0.5)
    )

    // Ensure width doesn't exceed max allowed width and height is reasonable
    const newWidth = Math.min(width + 32, maxAllowedWidth)
    const newHeight = Math.ceil(height)

    // Center the window horizontally if it would go off screen
    const maxX = workArea.width - newWidth
    const newX = Math.min(Math.max(currentX, 0), maxX)

    // Update window bounds
    this.mainWindow.setBounds({
      x: newX,
      y: currentY,
      width: newWidth,
      height: newHeight
    })

    // Update internal state
    this.windowPosition = { x: newX, y: currentY }
    this.windowSize = { width: newWidth, height: newHeight }
    this.currentX = newX
  }

  public createWindow(): void {
    if (this.mainWindow !== null) return

    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    this.screenWidth = workArea.width
    this.screenHeight = workArea.height


    this.step = Math.floor(this.screenWidth / 10) // 10 steps
    this.currentX = 0 // Start at the left

    const windowSettings: Electron.BrowserWindowConstructorOptions = {
      height: workArea.height,
      width: workArea.width,
      minWidth: workArea.width,
      minHeight: workArea.height,
      x: 0,
      y: 0,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "../core/preload.js")
      },
      show: true,
      alwaysOnTop: true,
      transparent: true,
      frame: false,
      resizable: false,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000", // Fully transparent background
      focusable: true, // Don't steal focus from underlying apps
      skipTaskbar: true
    }

    this.mainWindow = new BrowserWindow(windowSettings)
    // this.mainWindow.webContents.openDevTools()
    this.mainWindow.setContentProtection(true)

    // Start with pass-through mode - clicks go to underlying applications
    // Only capture mouse events when E key is held down
    this.mainWindow.setIgnoreMouseEvents(true, { forward: true })

    if (process.platform === "darwin") {
      this.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      this.mainWindow.setHiddenInMissionControl(true)
      this.mainWindow.setAlwaysOnTop(true, "floating")
    }
    if (process.platform === "linux") {
      // Linux-specific optimizations for stealth overlays
      if (this.mainWindow.setHasShadow) {
        this.mainWindow.setHasShadow(false)
      }
      this.mainWindow.setFocusable(false)
    } 
    this.mainWindow.setSkipTaskbar(true)
    this.mainWindow.setAlwaysOnTop(true)

    this.mainWindow.loadURL(startUrl).catch((err) => {
      console.error("Failed to load URL:", err)
    })

    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    this.currentX = bounds.x
    this.currentY = bounds.y

    this.setupWindowListeners()
    this.isWindowVisible = true
  }

  private setupWindowListeners(): void {
    if (!this.mainWindow) return

    this.mainWindow.on("move", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowPosition = { x: bounds.x, y: bounds.y }
        this.currentX = bounds.x
        this.currentY = bounds.y
      }
    })

    this.mainWindow.on("resize", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowSize = { width: bounds.width, height: bounds.height }
      }
    })

    this.mainWindow.on("closed", () => {
      this.mainWindow = null
      this.isWindowVisible = false
      this.windowPosition = null
      this.windowSize = null
    })
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public isVisible(): boolean {
    return this.isWindowVisible
  }

  public hideMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.")
      return
    }

    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    this.mainWindow.hide()
    this.isWindowVisible = false
  }

  public showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.")
      return
    }

    if (this.windowPosition && this.windowSize) {
      this.mainWindow.setBounds({
        x: this.windowPosition.x,
        y: this.windowPosition.y,
        width: this.windowSize.width,
        height: this.windowSize.height
      })
    }

    this.mainWindow.showInactive()

    this.isWindowVisible = true
  }

  public toggleMainWindow(): void {
    if (this.isWindowVisible) {
      this.hideMainWindow()
    } else {
      this.showMainWindow()
    }
  }

  // New methods for window movement
  public moveWindowRight(): void {
    if (!this.mainWindow) return

    const windowWidth = this.windowSize?.width || 0
    const halfWidth = windowWidth / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentX = Math.min(
      this.screenWidth - halfWidth,
      this.currentX + this.step
    )
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public moveWindowLeft(): void {
    if (!this.mainWindow) return

    const windowWidth = this.windowSize?.width || 0
    const halfWidth = windowWidth / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentX = Math.max(-halfWidth, this.currentX - this.step)
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public moveWindowDown(): void {
    if (!this.mainWindow) return

    const windowHeight = this.windowSize?.height || 0
    const halfHeight = windowHeight / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentY = Math.min(
      this.screenHeight - halfHeight,
      this.currentY + this.step
    )
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public moveWindowUp(): void {
    if (!this.mainWindow) return

    const windowHeight = this.windowSize?.height || 0
    const halfHeight = windowHeight / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentY = Math.max(-halfHeight, this.currentY - this.step)
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public createOverlayWindow(): BrowserWindow | null {
    if (this.overlayWindow !== null) {
      return this.overlayWindow
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize

    const overlaySettings: Electron.BrowserWindowConstructorOptions = {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../core/preload.js")
      },
      show: false,
      alwaysOnTop: true,
      transparent: true,
      frame: false,
      resizable: false,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000", // Fully transparent
      focusable: false, // Don't steal focus from underlying apps
      skipTaskbar: true
    }

    this.overlayWindow = new BrowserWindow(overlaySettings)
    
    // Critical: Make the window transparent to mouse events by default
    // The 'forward' option allows us to dynamically enable/disable specific regions
    // this.overlayWindow.setIgnoreMouseEvents(true, { forward: true })

    if (process.platform === "darwin") {
      this.overlayWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      this.overlayWindow.setHiddenInMissionControl(true)
      this.overlayWindow.setAlwaysOnTop(true, "screen-saver")
    }

    // Load a minimal overlay page (we'll create this)
    const overlayUrl = isDev
      ? "http://localhost:5180/overlay.html"
      : `file://${path.join(__dirname, "../dist/overlay.html")}`

    this.overlayWindow.loadURL(overlayUrl).catch((err) => {
      console.error("Failed to load overlay URL:", err)
    })

    this.overlayWindow.on("closed", () => {
      this.overlayWindow = null
    })

    return this.overlayWindow
  }

  public showOverlayWindow(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.show()
      this.overlayWindow.focus()
    }
  }

  public hideOverlayWindow(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide()
    }
  }

  public getOverlayWindow(): BrowserWindow | null {
    return this.overlayWindow
  }

  // Method to enable mouse events for specific regions on the main window
  public setOverlayMouseRegions(regions: Array<{x: number, y: number, width: number, height: number}>): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    if (regions.length === 0) {
      // No regions - make main window transparent to mouse events (except for its own UI elements)
      this.mainWindow.setIgnoreMouseEvents(true, { forward: true })
    } else {
      // Regions exist - enable mouse events for the main window
      this.mainWindow.setIgnoreMouseEvents(false)
    }
  }

  public destroyOverlayWindow(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close()
      this.overlayWindow = null
    }
  }

  // Test methods for setIgnoreMouseEvents functionality
  public enableClickCapture(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    console.log("🎯 Enabling click capture - window will intercept all mouse events")
    this.mainWindow.setIgnoreMouseEvents(false)
  }

  public enableClickThrough(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    console.log("👻 Enabling click-through - clicks will pass to underlying applications")
    this.mainWindow.setIgnoreMouseEvents(true, { forward: true })
  }

  public toggleClickMode(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    
    // Simple toggle - we'll track state if needed
    const currentState = this.mainWindow.webContents.isDestroyed() ? false : true
    
    if (currentState) {
      this.enableClickThrough()
    } else {
      this.enableClickCapture()
    }
  }

  // New methods to control overlay interaction based on E key state
  public enableOverlayInteraction(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    console.log("🎯 Enabling overlay interaction - E key held down")
    this.mainWindow.setIgnoreMouseEvents(false)
  }

  public disableOverlayInteraction(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    console.log("👻 Disabling overlay interaction - E key released")
    this.mainWindow.setIgnoreMouseEvents(true, { forward: true })
  }

  // Element overlay window management - one window per lens element
  public createElementOverlayWindow(elementId: string, bounds: {x: number, y: number, width: number, height: number}): BrowserWindow {
    // Close existing window for this element if it exists
    if (this.elementOverlayWindows.has(elementId)) {
      const existingWindow = this.elementOverlayWindows.get(elementId)
      if (existingWindow && !existingWindow.isDestroyed()) {
        existingWindow.close()
      }
      this.elementOverlayWindows.delete(elementId)
    }

    console.log(`🪟 Creating overlay window for element ${elementId} at (${bounds.x}, ${bounds.y}) size ${bounds.width}x${bounds.height}`)

    const overlaySettings: Electron.BrowserWindowConstructorOptions = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "../core/preload.js"),
        additionalArguments: [`--element-id=${elementId}`] // Pass element ID to renderer
      },
      show: true,
      alwaysOnTop: true,
      transparent: true,
      frame: false,
      resizable: false,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000", // Fully transparent
      focusable: true, // Allow interactions
      skipTaskbar: true
    }

    const overlayWindow = new BrowserWindow(overlaySettings)
    
    // Load the same React app but with element-specific context
    overlayWindow.loadURL(startUrl).catch((err) => {
      console.error("Failed to load overlay URL:", err)
    })

    if (process.platform === "darwin") {
      overlayWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      overlayWindow.setHiddenInMissionControl(true)
      overlayWindow.setAlwaysOnTop(true, "screen-saver")
    }

    // Handle window closed
    overlayWindow.on("closed", () => {
      console.log(`🗑️ Overlay window for element ${elementId} closed`)
      this.elementOverlayWindows.delete(elementId)
    })

    // Store the window
    this.elementOverlayWindows.set(elementId, overlayWindow)

    return overlayWindow
  }

  public getElementOverlayWindows(): Map<string, BrowserWindow> {
    return this.elementOverlayWindows
  }

  public closeElementOverlayWindow(elementId: string): void {
    if (this.elementOverlayWindows.has(elementId)) {
      const window = this.elementOverlayWindows.get(elementId)
      if (window && !window.isDestroyed()) {
        window.close()
      }
      this.elementOverlayWindows.delete(elementId)
    }
  }

  public closeAllElementOverlayWindows(): void {
    console.log(`🧹 Closing ${this.elementOverlayWindows.size} element overlay windows`)
    
    for (const [elementId, window] of this.elementOverlayWindows) {
      if (window && !window.isDestroyed()) {
        window.close()
      }
    }
    
    this.elementOverlayWindows.clear()
  }

  public resizeElementOverlayWindow(window: BrowserWindow, width: number, height: number): void {
    if (window && !window.isDestroyed()) {
      const [currentX, currentY] = window.getPosition()
      
      console.log(`📏 Resizing overlay window to ${width}x${height}`)
      
      window.setBounds({
        x: currentX,
        y: currentY,
        width: Math.max(width, 50), // Minimum width
        height: Math.max(height, 50) // Minimum height
      })
    }
  }

  // Selection overlay window for E + drag functionality
  public createSelectionOverlayWindow(): BrowserWindow {
    // Close existing selection overlay if it exists
    if (this.selectionOverlayWindow && !this.selectionOverlayWindow.isDestroyed()) {
      this.selectionOverlayWindow.close()
      this.selectionOverlayWindow = null
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.bounds

    console.log(`🎯 Creating selection overlay window covering entire screen: ${width}x${height}`)

    const selectionSettings: Electron.BrowserWindowConstructorOptions = {
      width: width,
      height: height,
      x: 0,
      y: 0,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "../core/preload.js"),
        additionalArguments: ['--selection-overlay'] // Flag to identify this as selection overlay
      },
      show: true,
      alwaysOnTop: true,
      transparent: true,
      frame: false,
      resizable: false,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000", // Fully transparent
      focusable: true, // Allow mouse interactions
      skipTaskbar: true
    }

    this.selectionOverlayWindow = new BrowserWindow(selectionSettings)
    
    // Load the same React app but with selection overlay context
    this.selectionOverlayWindow.loadURL(startUrl).catch((err) => {
      console.error("Failed to load selection overlay URL:", err)
    })

    if (process.platform === "darwin") {
      this.selectionOverlayWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      this.selectionOverlayWindow.setHiddenInMissionControl(true)
      this.selectionOverlayWindow.setAlwaysOnTop(true, "screen-saver")
    }

    // Handle window closed
    this.selectionOverlayWindow.on("closed", () => {
      console.log(`🗑️ Selection overlay window closed`)
      this.selectionOverlayWindow = null
    })

    return this.selectionOverlayWindow
  }

  public getSelectionOverlayWindow(): BrowserWindow | null {
    return this.selectionOverlayWindow
  }

  public closeSelectionOverlayWindow(): void {
    if (this.selectionOverlayWindow && !this.selectionOverlayWindow.isDestroyed()) {
      console.log("🧹 Closing selection overlay window")
      this.selectionOverlayWindow.close()
      this.selectionOverlayWindow = null
    }
  }

  // Method to create a contextual popup overlay at specific coordinates
  public createContextualPopupOverlay(x: number, y: number, width: number = 300, height: number = 400): BrowserWindow {
    console.log(`💬 Creating contextual popup at (${x}, ${y}) size ${width}x${height}`)

    const popupSettings: Electron.BrowserWindowConstructorOptions = {
      width: width,
      height: height,
      x: x,
      y: y,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "../core/preload.js"),
        additionalArguments: ['--contextual-popup'] // Flag for contextual popup
      },
      show: true,
      alwaysOnTop: true,
      transparent: true,
      frame: false,
      resizable: false,
      fullscreenable: false,
      hasShadow: true, // Give popup a shadow for visibility
      backgroundColor: "#FFFFFF", // White background for popup
      focusable: true,
      skipTaskbar: true
    }

    const popupWindow = new BrowserWindow(popupSettings)
    
    // Load the React app with popup context
    popupWindow.loadURL(startUrl).catch((err) => {
      console.error("Failed to load contextual popup URL:", err)
    })

    if (process.platform === "darwin") {
      popupWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      popupWindow.setHiddenInMissionControl(true)
      popupWindow.setAlwaysOnTop(true, "floating")
    }

    return popupWindow
  }

  // Contextual popup window management
  public createContextualPopupWindow(data: any, position: { x: number; y: number }): BrowserWindow | null {
    console.log('🗨️ WindowHelper: createContextualPopupWindow called with data:', Object.keys(data), 'position:', position)
    
    // Close existing popup if it exists
    if (this.contextualPopupWindow && !this.contextualPopupWindow.isDestroyed()) {
      console.log('🗑️ Closing existing popup window')
      this.contextualPopupWindow.close()
      this.contextualPopupWindow = null
    }

    const popupWidth = 380
    const popupHeight = 500
    const padding = 10

    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize

    // Calculate position - try to place it on the right side of the position
    let popupX = position.x + padding
    let popupY = position.y - popupHeight / 2

    // Ensure popup stays within screen bounds
    if (popupX + popupWidth > workArea.width) {
      // If it would go off the right edge, place it to the left of the position
      popupX = position.x - popupWidth - padding
    }

    // Ensure it doesn't go off the top or bottom
    popupY = Math.max(0, Math.min(popupY, workArea.height - popupHeight))

    console.log(`🗨️ Creating contextual popup at (${popupX}, ${popupY})`)

    const popupSettings: Electron.BrowserWindowConstructorOptions = {
      width: popupWidth,
      height: popupHeight,
      x: popupX,
      y: popupY,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "../core/preload.js"),
        additionalArguments: [`--popup-data=${JSON.stringify(data)}`]
      },
      show: false, // Start hidden, show after loading
      alwaysOnTop: true,
      frame: false,
      resizable: false,
      fullscreenable: false,
      hasShadow: true,
      backgroundColor: "#00000000", // Transparent background for glassmorphic effect
      transparent: true,
      focusable: true, // Allow interactions
      skipTaskbar: true,
      roundedCorners: true,
      vibrancy: 'under-window' // macOS vibrancy effect
    }

    this.contextualPopupWindow = new BrowserWindow(popupSettings)
    console.log('🪟 Created new BrowserWindow for popup')

    // Ensure clicks don't pass through
    this.contextualPopupWindow.setIgnoreMouseEvents(false)

    // Load a specific URL for the popup
    const popupUrl = isDev
      ? "http://localhost:5173/?mode=contextual-popup"
      : `file://${path.join(__dirname, "../dist/index.html")}?mode=contextual-popup`

    console.log('🔗 Loading popup URL:', popupUrl)
    
    this.contextualPopupWindow.loadURL(popupUrl).then(() => {
      console.log('✅ Popup URL loaded successfully')
      // Send the data to the popup window after it loads
      if (this.contextualPopupWindow && !this.contextualPopupWindow.isDestroyed()) {
        console.log('📤 Sending contextual-popup-data to popup window')
        this.contextualPopupWindow.webContents.send('contextual-popup-data', data)
        console.log('👁️ Showing and focusing popup window')
        this.contextualPopupWindow.show()
        this.contextualPopupWindow.focus()
      }
    }).catch((err) => {
      console.error("❌ Failed to load popup URL:", err)
    })

    if (process.platform === "darwin") {
      this.contextualPopupWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      this.contextualPopupWindow.setAlwaysOnTop(true, "floating")
    }

    // Handle window closed
    this.contextualPopupWindow.on("closed", () => {
      console.log("🗑️ Contextual popup window closed")
      this.contextualPopupWindow = null
      
      // Notify main window that popup is closed
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('contextual-popup-closed')
      }
    })

    return this.contextualPopupWindow
  }

  public closeContextualPopupWindow(): void {
    if (this.contextualPopupWindow && !this.contextualPopupWindow.isDestroyed()) {
      this.contextualPopupWindow.close()
      this.contextualPopupWindow = null
    }
  }

  public getContextualPopupWindow(): BrowserWindow | null {
    return this.contextualPopupWindow
  }
}
