import React, { useState, useRef, useCallback } from 'react'

interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

interface SelectionOverlayProps {
  onSelectionComplete: (rectangle: Rectangle) => void
  onCancel: () => void
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ 
  onSelectionComplete, 
  onCancel 
}) => {
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsSelecting(true)
    setStartPoint({ x, y })
    setCurrentRect({ x, y, width: 0, height: 0 })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !startPoint) return

    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    const newRect: Rectangle = {
      x: Math.min(startPoint.x, currentX),
      y: Math.min(startPoint.y, currentY),
      width: Math.abs(currentX - startPoint.x),
      height: Math.abs(currentY - startPoint.y)
    }

    setCurrentRect(newRect)
  }, [isSelecting, startPoint])

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !currentRect) return

    setIsSelecting(false)
    
    // Only complete selection if rectangle has meaningful size
    if (currentRect.width > 10 && currentRect.height > 10) {
      onSelectionComplete(currentRect)
    } else {
      // Reset if selection too small
      setCurrentRect(null)
      setStartPoint(null)
    }
  }, [isSelecting, currentRect, onSelectionComplete])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }, [onCancel])

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-50 cursor-crosshair"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Instructions */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm">
        Hold E and drag to select an area • Press Escape to cancel
      </div>

      {/* Selection rectangle */}
      {currentRect && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20"
          style={{
            left: currentRect.x,
            top: currentRect.y,
            width: currentRect.width,
            height: currentRect.height,
            pointerEvents: 'none'
          }}
        >
          {/* Corner handles for visual feedback */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white"></div>
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white"></div>
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white"></div>
          
          {/* Size indicator */}
          <div className="absolute -bottom-6 left-0 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
            {Math.round(currentRect.width)} × {Math.round(currentRect.height)}
          </div>
        </div>
      )}
    </div>
  )
}