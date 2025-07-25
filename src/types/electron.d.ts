export interface ElectronAPI {
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void
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
  analyzeImageFile: (path: string) => Promise<{ text: string; timestamp: number }>
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
    error?: string
    timestamp: string
  }) => void) => () => void
  analyzeCurrentScreen: () => Promise<{ success: boolean; actions?: any[]; error?: string }>

  // Lens system
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
  onLensActivationSuccess: (callback: () => void) => () => void
  onLensActivationError: (callback: (error: string) => void) => () => void
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
} 