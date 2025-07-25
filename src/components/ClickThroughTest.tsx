import { useState } from "react"

export const ClickThroughTest = () => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [testResult, setTestResult] = useState<string>("")

  const handleEnableCapture = async () => {
    try {
      const result = await window.electronAPI.testEnableClickCapture()
      if (result.success) {
        setIsCapturing(true)
        setTestResult("✅ Click capture enabled - window should intercept clicks")
      } else {
        setTestResult(`❌ Failed to enable capture: ${result.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`)
    }
  }

  const handleEnableThrough = async () => {
    try {
      const result = await window.electronAPI.testEnableClickThrough()
      if (result.success) {
        setIsCapturing(false)
        setTestResult("👻 Click-through enabled - clicks should pass to underlying apps")
      } else {
        setTestResult(`❌ Failed to enable click-through: ${result.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`)
    }
  }

  const handleToggle = async () => {
    try {
      const result = await window.electronAPI.testToggleClickMode()
      if (result.success) {
        setIsCapturing(!isCapturing)
        setTestResult(`🔄 Toggled to ${!isCapturing ? 'capture' : 'click-through'} mode`)
      } else {
        setTestResult(`❌ Failed to toggle: ${result.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`)
    }
  }

  const handleTestClick = () => {
    setTestResult(`🖱️ Window click detected! Mode: ${isCapturing ? 'capturing' : 'click-through'}`)
  }

  const handleCreateOverlays = async () => {
    try {
      const result = await window.electronAPI.testCreateOverlayWindows()
      if (result.success) {
        setTestResult(`🪟 Created ${result.elements?.length || 0} overlay windows at various positions`)
      } else {
        setTestResult(`❌ Failed to create overlays: ${result.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`)
    }
  }

  const handleCloseOverlays = async () => {
    try {
      const result = await window.electronAPI.testCloseOverlayWindows()
      if (result.success) {
        setTestResult("🗑️ All overlay windows closed")
      } else {
        setTestResult(`❌ Failed to close overlays: ${result.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`)
    }
  }

  return (
    <div className="fixed top-4 left-4 bg-black/80 backdrop-blur-md rounded-lg p-6 text-white space-y-4 min-w-80">
      <h2 className="text-xl font-bold text-center">🔬 Click-Through Test</h2>
      
      <div className="space-y-3">
        <button
          onClick={handleEnableCapture}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          🎯 Enable Click Capture
        </button>
        
        <button
          onClick={handleEnableThrough}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
        >
          👻 Enable Click-Through
        </button>
        
        <button
          onClick={handleToggle}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
        >
          🔄 Toggle Mode
        </button>
        
        <button
          onClick={handleTestClick}
          className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded transition-colors"
        >
          🖱️ Test Window Click
        </button>
        
        <button
          onClick={handleCreateOverlays}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          🪟 Create Test Overlay Windows
        </button>
        
        <button
          onClick={handleCloseOverlays}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
        >
          🗑️ Close Overlay Windows
        </button>
      </div>

      <div className="border-t border-white/20 pt-4">
        <p className="text-sm font-semibold mb-2">Current Status:</p>
        <p className="text-sm bg-white/10 rounded p-2 min-h-12">
          {testResult || "Ready to test. Try the buttons above!"}
        </p>
      </div>

      <div className="text-xs text-white/60 space-y-1">
        <p>• <strong>Capture mode:</strong> Window intercepts all clicks</p>
        <p>• <strong>Click-through mode:</strong> Clicks pass to apps below</p>
        <p>• Open another app behind this window to test click-through</p>
      </div>
    </div>
  )
}