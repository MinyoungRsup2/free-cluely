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
  isAnalyzing?: boolean
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  onSelectionComplete,
  onCancel,
  isAnalyzing = false,
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
      height: Math.abs(currentY - startPoint.y),
    }
    setCurrentRect(newRect)
  }, [isSelecting, startPoint])

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !currentRect) return
    setIsSelecting(false)
    if (currentRect.width > 10 && currentRect.height > 10) {
      // Apply Y offset to compensate for image positioning shift
      const adjustedRect = {
        ...currentRect,
        y: currentRect.y + 20 // Adjust this value as needed
      }
      onSelectionComplete(adjustedRect)
    } else {
      setCurrentRect(null)
      setStartPoint(null)
    }
  }, [isSelecting, currentRect, onSelectionComplete])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAnalyzing) onCancel()
    },
    [onCancel, isAnalyzing]
  )

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="fixed inset-0 z-50">
      {/* main overlay canvas */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 ${isAnalyzing ? 'cursor-wait' : 'cursor-crosshair'}`}
        onMouseDown={isAnalyzing ? undefined : handleMouseDown}
        onMouseMove={isAnalyzing ? undefined : handleMouseMove}
        onMouseUp={isAnalyzing ? undefined : handleMouseUp}
      >
        {/* instructions or analyzing state */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm transition-opacity duration-300 ${isAnalyzing ? 'bg-black/40 text-white/60 opacity-50' : 'bg-black/75 text-white'}`}>
          {isAnalyzing ? (
            <span>Processing...</span>
          ) : (
            'Hold E and drag to select an area • Press Escape to cancel'
          )}
        </div>

        {/* selection rectangle with glass effect */}
        {currentRect && (
          <div
            className={`absolute border-2 ${isAnalyzing ? 'border-blue-400 animate-pulse' : 'border-blue-500'} ${isAnalyzing ? 'backdrop-blur-md' : ''}`}
            style={{
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.width,
              height: currentRect.height,
              pointerEvents: 'none',
              overflow: 'hidden',
              borderRadius: isAnalyzing ? '16px' : '0px',
              background: isAnalyzing 
                ? 'linear-gradient(0deg, rgba(245, 245, 245, 0.15) 0%, rgba(245, 245, 245, 0.15) 100%), rgba(15, 15, 15, 0.3)'
                : 'transparent',
              backgroundBlendMode: isAnalyzing ? 'normal, color-dodge' : 'normal',
              boxShadow: isAnalyzing ? '0 8px 32px rgba(31, 38, 135, 0.2)' : 'none',
              transition: 'all 0.3s ease-in-out'
            }}
          >
            {/* Glassmorphic content when analyzing */}
            {isAnalyzing && (
              <div className="absolute inset-0 p-2 flex flex-col items-center justify-center">
                {/* Always show loading spinner */}
                <div className="flex items-center space-x-2 text-white/90 text-xs">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white/70"></div>
                  <span>Analyzing...</span>
                </div>

                {/* Subtle animated shimmer effect */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse opacity-30"></div>
                </div>

                {/* Preview elements - only show if rectangle has sufficient space */}
                {currentRect.width > 150 && currentRect.height > 80 && (
                  <div className="mt-2 space-y-1 w-full px-2">
                    <div className="h-1.5 bg-white/20 rounded-full animate-pulse"></div>
                    <div className="h-1 bg-white/15 rounded-full animate-pulse delay-100"></div>
                    <div className="h-1 bg-white/10 rounded-full animate-pulse delay-200 w-3/4"></div>
                  </div>
                )}
              </div>
            )}
          
            {/* Corner handles - hide when analyzing */}
            {!isAnalyzing && (
              <>
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white z-10" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white z-10" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white z-10" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white z-10" />
              </>
            )}
            
            {/* Size indicator - hide when analyzing */}
            {!isAnalyzing && (
              <div className="absolute -bottom-6 left-0 bg-black/75 text-white px-2 py-1 rounded text-xs z-10">
                {Math.round(currentRect.width)} × {Math.round(currentRect.height)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}