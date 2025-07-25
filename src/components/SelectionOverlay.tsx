import React, { useState, useRef, useCallback } from 'react'
import { Canvas, useFrame, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

/* ------------------------------------------------------------------ */
/* 1. Custom shader material                                           */
/* ------------------------------------------------------------------ */

const GlassMaterial = shaderMaterial(
  // uniforms
  {
    uTime: 0,
    uOpacity: 0.15,
    uColor: [0.8, 0.9, 1.0],
  },
  // vertex shader
  `
    #include <common>
    
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  `
    #include <common>
    
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uColor;

    varying vec2 vUv;

    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      
      float time = uTime * 0.2;
      float n1 = noise(uv * 8.0 + time);
      float n2 = noise(uv * 16.0 - time * 0.5);
      float distortion = (n1 + n2 * 0.5) * 0.02;
      
      vec2 center = uv - 0.5;
      float dist = length(center);
      float edge = smoothstep(0.0, 0.5, dist);
      
      vec3 color = mix(uColor, vec3(1.0), edge * 0.3);
      float alpha = uOpacity + edge * 0.1 + distortion;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
)

extend({ GlassMaterial })

/* ------------------------------------------------------------------ */
/* 2. Full-screen quad that uses the material                          */
/* ------------------------------------------------------------------ */

declare global {
  namespace JSX {
    interface IntrinsicElements { glassMaterial: any }
  }
}

function ScreenQuad() {
  const ref = useRef<any>()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uTime = clock.getElapsedTime()
  })
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <glassMaterial ref={ref} transparent depthWrite={false} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Original overlay unchanged except for the <Canvas> addition      */
/* ------------------------------------------------------------------ */

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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-lg text-sm">
          {isAnalyzing ? (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Analyzing selection...</span>
            </div>
          ) : (
            'Hold E and drag to select an area • Press Escape to cancel'
          )}
        </div>

        {/* selection rectangle with glass effect */}
        {currentRect && (
          <div
            className={`absolute border-2 ${isAnalyzing ? 'border-blue-400 animate-pulse' : 'border-blue-500'}`}
            style={{
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.width,
              height: currentRect.height,
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
          
            {/* Corner handles */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white z-10" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white z-10" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white z-10" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white z-10" />
            
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