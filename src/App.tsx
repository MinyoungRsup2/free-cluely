import { useEffect, useState } from "react"
import { SelectionOverlay } from "./components/SelectionOverlay"
import { ContextualPopup } from "./components/ContextualPopup"

declare global {
  interface Window {
    electronAPI: {
      resizeOverlayWindow(arg0: { elementId: string; width: number; height: number }): unknown
      //RANDOM GETTER/SETTERS
      updateContentDimensions: (dimensions: {
        width: number
        height: number
      }) => Promise<void>
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>

      //GLOBAL EVENTS
      //TODO: CHECK THAT PROCESSING NO SCREENSHOTS AND TAKE SCREENSHOTS ARE BOTH CONDITIONAL
      onUnauthorized: (callback: () => void) => () => void
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void
      onProcessingNoScreenshots: (callback: () => void) => () => void
      onResetView: (callback: () => void) => () => void
      takeScreenshot: () => Promise<void>

      //INITIAL SOLUTION EVENTS
      deleteScreenshot: (
        path: string
      ) => Promise<{ success: boolean; error?: string }>
      onSolutionStart: (callback: () => void) => () => void
      onSolutionError: (callback: (error: string) => void) => () => void
      onSolutionSuccess: (callback: (data: any) => void) => () => void
      onProblemExtracted: (callback: (data: any) => void) => () => void

      onDebugSuccess: (callback: (data: any) => void) => () => void

      onDebugStart: (callback: () => void) => () => void
      onDebugError: (callback: (error: string) => void) => () => void

      // Audio Processing
      analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>
      analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>

      moveWindowLeft: () => Promise<void>
      moveWindowRight: () => Promise<void>
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
      onLensOverlayElement: (callback: (elements: {
        id: string
        type: string
        bounds: { x: number; y: number; width: number; height: number }
        confidence: number
        actions: string[]
        detected_structure: Record<string, {
          text: string
          confidence: number
          position_found?: string
        }>
      }) => void) => () => void
      onLensOrbitalShow: (callback: () => void) => () => void
      onLensOrbitalHide: (callback: () => void) => () => void
      onLensActivationStart: (callback: () => void) => () => void
      onLensActivationSuccess: (callback: (data: any) => void) => () => void
      onLensActivationError: (callback: (error: any) => void) => () => void
      onLensDeactivated: (callback: () => void) => () => void

      // Selection overlay events
      onLensSelectionActivate: (callback: () => void) => () => void
      sendSelectionComplete: (rectangle: {x: number, y: number, width: number, height: number}) => Promise<void>
      sendSelectionCancel: () => Promise<void>

      // Analysis result events
      onLensAnalysisResult: (callback: (data: any) => void) => () => void
      onLensAnalysisError: (callback: (error: string) => void) => () => void

      // Test methods
      testEnableClickCapture: () => Promise<{ success: boolean; error?: string }>
      testEnableClickThrough: () => Promise<{ success: boolean; error?: string }>
      testToggleClickMode: () => Promise<{ success: boolean; error?: string }>
      testCreateOverlayWindows: () => Promise<{ success: boolean; elements?: any[]; error?: string }>
      testCloseOverlayWindows: () => Promise<{ success: boolean; error?: string }>
    }
  }
}


const App: React.FC = () => {
  // Binary state system: either showing selection overlay or popup with results
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Listen for E key activation to start selection mode
    const unsubscribeSelection = window.electronAPI.onLensSelectionActivate(() => {
      console.log('🎯 Selection mode activated')
      setIsSelectionMode(true)
      setAnalysisResult(null) // Clear any previous results
      setIsLoading(false) // Reset loading state
    })

    // Listen for analysis results to show popup
    const unsubscribeResults = window.electronAPI.onLensAnalysisResult((data) => {
      console.log('📊 Analysis results received:', data)
      setAnalysisResult(data)
      setIsSelectionMode(false)
      setIsLoading(false)
    })

    // Listen for analysis errors
    const unsubscribeErrors = window.electronAPI.onLensAnalysisError?.((error) => {
      console.error('❌ Analysis error received:', error)
      setIsSelectionMode(false)
      setIsLoading(false)
      // Could show error message to user here if needed
    }) || (() => {})

    return () => {
      unsubscribeSelection()
      unsubscribeResults()
      unsubscribeErrors()
    }
  }, [])

  const handleSelectionComplete = async (rectangle: { x: number; y: number; width: number; height: number }) => {
    console.log('✅ Selection completed:', rectangle)
    setIsSelectionMode(false)
    setIsLoading(true)
    
    try {
      await window.electronAPI.sendSelectionComplete(rectangle)
    } catch (error) {
      console.error('❌ Failed to send selection:', error)
      setIsLoading(false)
    }
  }

  const handleSelectionCancel = async () => {
    console.log('❌ Selection cancelled')
    setIsSelectionMode(false)
    
    try {
      await window.electronAPI.sendSelectionCancel()
    } catch (error) {
      console.error('❌ Failed to cancel selection:', error)
    }
  }

  const handlePopupClose = () => {
    console.log('🗑️ Popup closed')
    setAnalysisResult(null)
    setIsLoading(false)
  }

  const handleActionClick = (action: string) => {
    console.log('🎬 Action clicked:', action)
    // TODO: Implement action execution
    setAnalysisResult(null) // Close popup after action
  }

  // Binary state rendering
  if (isSelectionMode) {
    return (
      <SelectionOverlay 
        onSelectionComplete={handleSelectionComplete}
        onCancel={handleSelectionCancel}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Analyzing selection...</span>
          </div>
        </div>
      </div>
    )
  }

  if (analysisResult) {
    return (
      <ContextualPopup
        data={analysisResult}
        onClose={handlePopupClose}
        onActionClick={handleActionClick}
        position={{ x: 0, y: 0 }} // Position handled by centering
      />
    )
  }

  // Default idle state - minimal UI
  return (
    <div className="fixed bottom-4 right-4 text-sm text-gray-500 bg-white bg-opacity-75 px-3 py-2 rounded shadow">
      Press E to start selection
    </div>
  )
}

export default App
