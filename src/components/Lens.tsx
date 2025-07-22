import { useEffect, useState } from "react"

interface ElementInfo {
  id: string
  type: string
  bounds: { x: number; y: number; width: number; height: number }
  confidence: number
  actions: string[]
}

interface LensProps {
  visible: boolean
  onVisibilityChange?: (visible: boolean) => void
}

export const Lens: React.FC<LensProps> = ({ visible, onVisibilityChange }) => {
  const [elements, setElements] = useState<ElementInfo[]>([])
  const [orbitalVisible, setOrbitalVisible] = useState(false)

  useEffect(() => {
    // Listen for overlay elements from the main process
    const cleanupOverlay = window.electronAPI?.onLensOverlayElements?.((elements: ElementInfo[]) => {
      console.log('Received lens overlay elements:', elements)
      setElements(elements)
      onVisibilityChange?.(elements.length > 0)
    })

    // Listen for orbital show/hide
    const cleanupOrbital = window.electronAPI?.onLensOrbitalShow?.(() => {
      console.log('Showing lens orbital')
      setOrbitalVisible(true)
      onVisibilityChange?.(true)
    })

    const cleanupOrbitalHide = window.electronAPI?.onLensOrbitalHide?.(() => {
      console.log('Hiding lens orbital')
      setOrbitalVisible(false)
      // Only hide if no elements are visible
      if (elements.length === 0) {
        onVisibilityChange?.(false)
      }
    })

    return () => {
      cleanupOverlay?.()
      cleanupOrbital?.()
      cleanupOrbitalHide?.()
    }
  }, [])

  if (!visible && !orbitalVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      test
      {/* Orbital Loading Indicator */}
      {orbitalVisible && (
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Overlay Elements */}
      {visible && elements.map((element) => (
        <OverlayElement key={element.id} element={element} />
      ))}
    </div>
  )
}

interface OverlayElementProps {
  element: ElementInfo
}

const OverlayElement: React.FC<OverlayElementProps> = ({ element }) => {
  const [showActions, setShowActions] = useState(false)

  const handleClick = () => {
    setShowActions(!showActions)
  }

  return (
    <div
      className="absolute pointer-events-auto cursor-pointer"
      style={{
        left: element.bounds.x,
        top: element.bounds.y,  
        width: element.bounds.width,
        height: element.bounds.height,
      }}
      onClick={handleClick}
    >
      {/* Invisible clickable area with subtle border when hovered */}
      <div className="w-full h-full border-2 border-transparent hover:border-blue-400 hover:bg-blue-400/10 transition-all duration-200">
        {/* Type indicator */}
        <div className="absolute -top-6 left-0 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
          {element.type} ({Math.round(element.confidence * 100)}%)
        </div>
      </div>

      {/* Actions Menu */}
      {showActions && element.actions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-lg border border-gray-200 min-w-48 z-10">
          <div className="p-2 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-900">{element.type}</div>
            <div className="text-xs text-gray-500">Confidence: {Math.round(element.confidence * 100)}%</div>
          </div>
          <div className="py-1">
            {element.actions.map((action, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                onClick={(e) => {
                  e.stopPropagation()
                  console.log(`Executing action: ${action} on element ${element.id}`)
                  // TODO: Send action to main process
                  setShowActions(false)
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}