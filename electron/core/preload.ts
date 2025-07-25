import { contextBridge, ipcRenderer } from "electron"

// Types for the exposed Electron API
interface ElectronAPI {
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (
    path: string
  ) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => () => void
  onSolutionsReady: (callback: (solutions: string) => void) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void

  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  takeScreenshot: () => Promise<void>
  moveWindowLeft: () => Promise<void>
  moveWindowRight: () => Promise<void>
  analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>
  analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>
  analyzeImageFile: (path: string) => Promise<void>
  quitApp: () => Promise<void>
  
  // Realtime monitoring
  startRealtimeMonitoring: () => Promise<{ success: boolean; error?: string }>
  stopRealtimeMonitoring: () => Promise<{ success: boolean; error?: string }>
  executeAction: (actionId: string) => Promise<{ success: boolean; error?: string }>
  isMonitoring: () => Promise<boolean>
  onActionsDetected: (callback: (actions: Array<{
    id: string
    label: string
    description: string
    confidence: number
  }>) => void) => () => void
  onActionExecuted: (callback: (data: {
    actionId: string
    detectedName?: string
    patientId?: string
    consumerData?: any
    error?: string
    timestamp: string
  }) => void) => () => void
  analyzeCurrentScreen: () => Promise<{ success: boolean; actions?: Array<{
    id: string
    label: string
    description: string
    confidence: number
  }>; error?: string }>

  // Lens system events
  onLensOverlayElements: (callback: (elements: Array<{
    id: string
    type: string
    bounds: { x: number; y: number; width: number; height: number }
    confidence: number
    actions: string[]
    detected_structure: Record<string, any>
  }>) => void) => () => void
  onLensOrbitalShow: (callback: () => void) => () => void
  onLensOrbitalHide: (callback: () => void) => () => void
  onLensOverlayElement: (callback: (element: {
    id: string
    type: string
    bounds: { x: number; y: number; width: number; height: number }
    confidence: number
    actions: string[]
    detected_structure: Record<string, any>
  }) => void) => () => void
  onLensActivationStart: (callback: () => void) => () => void
  onLensActivationSuccess: (callback: (data: any) => void) => () => void
  onLensActivationError: (callback: (error: any) => void) => () => void
  onLensDeactivated: (callback: () => void) => () => void

  // Overlay window management
  setOverlayMouseRegions: (regions: Array<{x: number, y: number, width: number, height: number}>) => Promise<{ success: boolean; error?: string }>
  
  // Test methods for setIgnoreMouseEvents
  testEnableClickCapture: () => Promise<{ success: boolean; error?: string }>
  testEnableClickThrough: () => Promise<{ success: boolean; error?: string }>
  testToggleClickMode: () => Promise<{ success: boolean; error?: string }>
  
  // Test methods for overlay windows
  testCreateOverlayWindows: () => Promise<{ success: boolean; elements?: any[]; error?: string }>
  testCloseOverlayWindows: () => Promise<{ success: boolean; error?: string }>

  // Overlay window resizing
  resizeOverlayWindow: (dimensions: { elementId?: string; width: number; height: number }) => Promise<{ success: boolean; error?: string }>

  // Selection overlay events
  onLensSelectionActivate: (callback: () => void) => () => void
  sendSelectionComplete: (rectangle: {x: number, y: number, width: number, height: number}) => Promise<void>
  sendSelectionCancel: () => Promise<void>

  // Analysis result events
  onLensAnalysisResult: (callback: (data: any) => void) => () => void
  
  // Contextual popup methods
  createContextualPopup: (data: any, position: { x: number, y: number }) => Promise<{ success: boolean; windowId?: number; error?: string }>
  closeContextualPopup: () => Promise<{ success: boolean; error?: string }>
  sendContextualPopupAction: (action: string) => void
  sendContextualPopupClose: () => void
  onContextualPopupData: (callback: (data: any) => void) => () => void
  onContextualPopupAction: (callback: (action: string) => void) => () => void
  onContextualPopupOpened: (callback: () => void) => () => void
  onContextualPopupClosed: (callback: () => void) => () => void
}

export const PROCESSING_EVENTS = {
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

// Expose the Electron API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke("update-content-dimensions", dimensions),
  takeScreenshot: () => ipcRenderer.invoke("take-screenshot"),
  getScreenshots: () => ipcRenderer.invoke("get-screenshots"),
  deleteScreenshot: (path: string) =>
    ipcRenderer.invoke("delete-screenshot", path),

  // Event listeners
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => {
    const subscription = (_: any, data: { path: string; preview: string }) =>
      callback(data)
    ipcRenderer.on("screenshot-taken", subscription)
    return () => {
      ipcRenderer.removeListener("screenshot-taken", subscription)
    }
  },
  onSolutionsReady: (callback: (solutions: string) => void) => {
    const subscription = (_: any, solutions: string) => callback(solutions)
    ipcRenderer.on("solutions-ready", subscription)
    return () => {
      ipcRenderer.removeListener("solutions-ready", subscription)
    }
  },
  onResetView: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("reset-view", subscription)
    return () => {
      ipcRenderer.removeListener("reset-view", subscription)
    }
  },
  onSolutionStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_START, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_START, subscription)
    }
  },
  onDebugStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_START, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_START, subscription)
    }
  },

  onDebugSuccess: (callback: (data: any) => void) => {
    ipcRenderer.on("debug-success", (_event, data) => callback(data))
    return () => {
      ipcRenderer.removeListener("debug-success", (_event, data) =>
        callback(data)
      )
    }
  },
  onDebugError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    }
  },
  onSolutionError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
        subscription
      )
    }
  },
  onProcessingNoScreenshots: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    }
  },

  onProblemExtracted: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.PROBLEM_EXTRACTED,
        subscription
      )
    }
  },
  onSolutionSuccess: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.SOLUTION_SUCCESS,
        subscription
      )
    }
  },
  onUnauthorized: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    }
  },
  moveWindowLeft: () => ipcRenderer.invoke("move-window-left"),
  moveWindowRight: () => ipcRenderer.invoke("move-window-right"),
  analyzeAudioFromBase64: (data: string, mimeType: string) => ipcRenderer.invoke("analyze-audio-base64", data, mimeType),
  analyzeAudioFile: (path: string) => ipcRenderer.invoke("analyze-audio-file", path),
  analyzeImageFile: (path: string) => ipcRenderer.invoke("analyze-image-file", path),
  quitApp: () => ipcRenderer.invoke("quit-app"),

  // Realtime monitoring
  startRealtimeMonitoring: () => ipcRenderer.invoke("start-realtime-monitoring"),
  stopRealtimeMonitoring: () => ipcRenderer.invoke("stop-realtime-monitoring"),
  executeAction: (actionId: string) => ipcRenderer.invoke("execute-action", actionId),
  isMonitoring: () => ipcRenderer.invoke("is-monitoring"),
  onActionsDetected: (callback: (actions: Array<{
    id: string
    label: string
    description: string
    confidence: number
  }>) => void) => {
    const subscription = (_: any, actions: Array<any>) => callback(actions)
    ipcRenderer.on("actions-detected", subscription)
    return () => {
      ipcRenderer.removeListener("actions-detected", subscription)
    }
  },
  onActionExecuted: (callback: (data: {
    actionId: string
    detectedName?: string
    error?: string
    timestamp: string
  }) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on("action-executed", subscription)
    return () => {
      ipcRenderer.removeListener("action-executed", subscription)
    }
  },
  analyzeCurrentScreen: () => ipcRenderer.invoke("analyze-current-screen"),

  // Lens system events
  onLensOverlayElements: (callback: (elements: Array<{
    id: string
    type: string
    bounds: { x: number; y: number; width: number; height: number }
    confidence: number
    actions: string[]
    detected_structure: Record<string, any>
  }>) => void) => {
    const subscription = (_: any, elements: Array<any>) => callback(elements)
    ipcRenderer.on("lens-overlay-elements", subscription)
    return () => {
      ipcRenderer.removeListener("lens-overlay-elements", subscription)
    }
  },
  onLensOrbitalShow: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("lens-orbital-show", subscription)
    return () => {
      ipcRenderer.removeListener("lens-orbital-show", subscription)
    }
  },
  onLensOrbitalHide: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("lens-orbital-hide", subscription)
    return () => {
      ipcRenderer.removeListener("lens-orbital-hide", subscription)
    }
  },
  
  // Single element event for individual overlay windows
  onLensOverlayElement: (callback: (element: {
    id: string
    type: string
    bounds: { x: number; y: number; width: number; height: number }
    confidence: number
    actions: string[]
    detected_structure: Record<string, any>
  }) => void) => {
    const subscription = (_: any, element: any) => callback(element)
    ipcRenderer.on("lens-overlay-element", subscription)
    return () => {
      ipcRenderer.removeListener("lens-overlay-element", subscription)
    }
  },

  // Overlay window management
  setOverlayMouseRegions: (regions: Array<{x: number, y: number, width: number, height: number}>) => 
    ipcRenderer.invoke("set-overlay-mouse-regions", regions),

  // Test methods for setIgnoreMouseEvents
  testEnableClickCapture: () => ipcRenderer.invoke("test-enable-click-capture"),
  testEnableClickThrough: () => ipcRenderer.invoke("test-enable-click-through"), 
  testToggleClickMode: () => ipcRenderer.invoke("test-toggle-click-mode"),
  
  // Test methods for overlay windows
  testCreateOverlayWindows: () => ipcRenderer.invoke("test-create-overlay-windows"),
  testCloseOverlayWindows: () => ipcRenderer.invoke("test-close-overlay-windows"),

  // Overlay window resizing
  resizeOverlayWindow: (dimensions: { elementId?: string; width: number; height: number }) => 
    ipcRenderer.invoke("resize-overlay-window", dimensions),

  // Lens activation events (placeholders for now)
  onLensActivationStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("lens-activation-start", subscription)
    return () => {
      ipcRenderer.removeListener("lens-activation-start", subscription)
    }
  },
  onLensActivationSuccess: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on("lens-activation-success", subscription)
    return () => {
      ipcRenderer.removeListener("lens-activation-success", subscription)
    }
  },
  onLensActivationError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on("lens-activation-error", subscription)
    return () => {
      ipcRenderer.removeListener("lens-activation-error", subscription)
    }
  },
  onLensDeactivated: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("lens-deactivated", subscription)
    return () => {
      ipcRenderer.removeListener("lens-deactivated", subscription)
    }
  },

  // Selection overlay events
  onLensSelectionActivate: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("lens-selection-activate", subscription)
    return () => {
      ipcRenderer.removeListener("lens-selection-activate", subscription)
    }
  },
  sendSelectionComplete: (rectangle: {x: number, y: number, width: number, height: number}) => 
    ipcRenderer.invoke("lens-selection-complete", rectangle),
  sendSelectionCancel: () => 
    ipcRenderer.invoke("lens-selection-cancel"),

  // Analysis result events
  onLensAnalysisResult: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on("lens-analysis-result", subscription)
    return () => {
      ipcRenderer.removeListener("lens-analysis-result", subscription)
    }
  },

  // Analysis error events  
  onLensAnalysisError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on("lens-analysis-error", subscription)
    return () => {
      ipcRenderer.removeListener("lens-analysis-error", subscription)
    }
  },

  // Contextual popup methods
  createContextualPopup: (data: any, position: { x: number, y: number }) => 
    ipcRenderer.invoke("create-contextual-popup", { data, position }),
  closeContextualPopup: () => 
    ipcRenderer.invoke("close-contextual-popup"),
  sendContextualPopupAction: (action: string) => 
    ipcRenderer.send("contextual-popup-action", action),
  sendContextualPopupClose: () => 
    ipcRenderer.send("contextual-popup-close"),
  onContextualPopupData: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on("contextual-popup-data", subscription)
    return () => {
      ipcRenderer.removeListener("contextual-popup-data", subscription)
    }
  },
  onContextualPopupAction: (callback: (action: string) => void) => {
    const subscription = (_: any, action: string) => callback(action)
    ipcRenderer.on("contextual-popup-action", subscription)
    return () => {
      ipcRenderer.removeListener("contextual-popup-action", subscription)
    }
  },
  onContextualPopupOpened: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("contextual-popup-opened", subscription)
    return () => {
      ipcRenderer.removeListener("contextual-popup-opened", subscription)
    }
  },
  onContextualPopupClosed: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("contextual-popup-closed", subscription)
    return () => {
      ipcRenderer.removeListener("contextual-popup-closed", subscription)
    }
  }
} as ElectronAPI)
