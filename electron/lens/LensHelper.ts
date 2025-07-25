import { Result, ok, err } from 'neverthrow'
import { BrowserWindow, screen } from 'electron'
import { promptGenerators } from './EHRMappings'
import { parseWithWarnings } from './LensSchemas'
import type { ScreenshotHelper } from '../helpers/ScreenshotHelper'
import type { ProcessingHelper } from '../helpers/ProcessingHelper'
const fs = require('fs')
const path = require('path')

// Performance measurement utilities
interface PerformanceMetrics {
  operation: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

const performanceLog: PerformanceMetrics[] = []

const startTimer = (operation: string, metadata?: Record<string, any>): number => {
  const startTime = performance.now()
  performanceLog.push({
    operation,
    startTime,
    metadata
  })
  console.log(`🚀 [${operation}] Started${metadata ? ` (${JSON.stringify(metadata)})` : ''}`)
  return startTime
}

const endTimer = (operation: string, startTime: number): number => {
  const endTime = performance.now()
  const duration = endTime - startTime
  
  // Find and update the log entry
  const logEntry = performanceLog.find(entry => 
    entry.operation === operation && entry.startTime === startTime
  )
  if (logEntry) {
    logEntry.endTime = endTime
    logEntry.duration = duration
  }
  
  console.log(`✅ [${operation}] Completed in ${duration.toFixed(2)}ms`)
  return duration
}

const getPerformanceReport = (): PerformanceMetrics[] => {
  return performanceLog.slice(-20) // Return last 20 operations
}

// Types for our lens system - updated for multi-window paradigm
export interface LensState {
  isActive: boolean
  orbitalVisible: boolean
  overlayWindows: Map<string, BrowserWindow> // elementId -> BrowserWindow
  currentRoute: RouteInfo | null
  elements: ElementInfo[]
  cache: Map<string, CacheEntry>
}

export interface RouteInfo {
  type: string
  confidence: number
  ehrSystem: 'athena' | 'unknown'
  timestamp: number
}

export interface DetectedComponent {
  text?: string
  confidence?: number
  position_found?: string
}

export interface ElementInfo {
  id: string
  type: string
  bounds: { x: number; y: number; width: number; height: number }
  confidence: number
  actions: string[]
  detected_structure: Record<string, DetectedComponent>
}

interface CacheEntry {
  route: RouteInfo
  elements: ElementInfo[]
  timestamp: number
  screenshotHash: string
}

interface LensError {
  type: 'SCREENSHOT_FAILED' | 'AI_ANALYSIS_FAILED' | 'OVERLAY_CREATION_FAILED'
  message: string
  details?: any
}

// Window helper interface (minimal subset we need)
interface WindowHelper {
  hideMainWindow(): void
  showMainWindow(): void
  getMainWindow?(): Electron.BrowserWindow | null
  setOverlayMouseRegions(regions: Array<{x: number, y: number, width: number, height: number}>): void
  createElementOverlayWindow(elementId: string, bounds: {x: number, y: number, width: number, height: number}): Electron.BrowserWindow
  closeElementOverlayWindow(elementId: string): void
  closeAllElementOverlayWindows(): void
}

// Dependencies interface for lens operations
export interface LensDependencies {
  screenshotHelper: ScreenshotHelper
  processingHelper: ProcessingHelper
  windowHelper: WindowHelper
}

// Factory function that creates our lens operations with captured dependencies
export const createLensOperations = (dependencies: LensDependencies) => {
  const { screenshotHelper, processingHelper, windowHelper } = dependencies

  // Pure functions for each lens operation
  const takeScreenshot = async (): Promise<Result<Buffer, LensError>> => {
    const startTime = startTimer('Screenshot Capture')
    try {
      const buffer = await screenshotHelper.takeScreenshotAsBuffer(
        () => windowHelper.hideMainWindow(),
        () => windowHelper.showMainWindow()
      )
      endTimer('Screenshot Capture', startTime)
      return ok(buffer)
    } catch (error) {
      endTimer('Screenshot Capture', startTime)
      return err({
        type: 'SCREENSHOT_FAILED',
        message: 'Failed to capture screenshot',
        details: error
      })
    }
  }

  const detectRoute = async (screenshot: Buffer, ehrSystem: string = 'athena'): Promise<Result<RouteInfo, LensError>> => {
    const startTime = startTimer('Route Detection', { ehrSystem, bufferSize: screenshot.length })
    try {
      // Use structured prompt from EHR mapping
      const promptStartTime = startTimer('Route Prompt Generation', { ehrSystem })
      const routePrompt = promptGenerators.createRoutePrompt(ehrSystem)
      endTimer('Route Prompt Generation', promptStartTime)
      
      const aiStartTime = startTimer('AI Route Analysis', { promptLength: routePrompt.length })
      const result = await processingHelper.analyzeScreenshot(screenshot, routePrompt)
      endTimer('AI Route Analysis', aiStartTime)
      let parsedData: unknown
      
      const jsonParseStartTime = startTimer('JSON Parse (Route)', { responseLength: result.length })
      try {
        parsedData = JSON.parse(result)
        endTimer('JSON Parse (Route)', jsonParseStartTime)
      } catch (jsonError) {
        endTimer('JSON Parse (Route)', jsonParseStartTime)
        endTimer('Route Detection', startTime)
        return err({
          type: 'AI_ANALYSIS_FAILED',
          message: `Failed to parse JSON response: ${jsonError}`,
          details: { originalResponse: result, jsonError }
        })
      }
      
      // Use Zod for safe parsing with warnings
      const zodParseStartTime = startTimer('Zod Validation (Route)')
      const parseResult = parseWithWarnings.route(parsedData)
      endTimer('Zod Validation (Route)', zodParseStartTime)
      
      if (parseResult.warnings.length > 0) {
        console.warn('⚠️ Route parsing warnings:', parseResult.warnings)
        
        // Send warnings to renderer for debugging
        const mainWindow = dependencies.windowHelper.getMainWindow?.()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('lens-parsing-warnings', {
            type: 'route',
            warnings: parseResult.warnings
          })
        }
      }
      
      if (!parseResult.data) {
        return err({
          type: 'AI_ANALYSIS_FAILED',
          message: 'Failed to parse route data even with fallbacks',
          details: { warnings: parseResult.warnings, originalData: parsedData }
        })
      }
      
      const routeInfo: RouteInfo = {
        type: parseResult.data.type,
        confidence: parseResult.data.confidence,
        ehrSystem: parseResult.data.ehrSystem,
        timestamp: Date.now()
      }
      
      return ok(routeInfo)
    } catch (error) {
      return err({
        type: 'AI_ANALYSIS_FAILED',
        message: 'Failed to detect route using EHR mapping',
        details: error
      })
    }
  }

  const detectElements = async (
    screenshot: Buffer, 
    route: RouteInfo
  ): Promise<Result<ElementInfo[], LensError>> => {
    try {
      // Use structured prompt from EHR mapping for specific page
      const elementPrompt = promptGenerators.createElementPrompt(route.type, route.ehrSystem)

      // Save the original screenshot buffer to the current directory for debugging
      const screenshotPath = path.join(process.cwd(), 'debug-screenshot.png')
      fs.writeFileSync(screenshotPath, screenshot)
      console.log(`Saved screenshot to ${screenshotPath}`)
      
      const result = await processingHelper.analyzeScreenshot(screenshot, elementPrompt)
      let parsedData: unknown
      
      try {
        parsedData = JSON.parse(result)
      } catch (jsonError) {
        return err({
          type: 'AI_ANALYSIS_FAILED',
          message: `Failed to parse JSON response: ${jsonError}`,
          details: { originalResponse: result, jsonError }
        })
      }
      
      // Use Zod for safe parsing with warnings
      const parseResult = parseWithWarnings.elements(parsedData)
      
      if (parseResult.warnings.length > 0) {
        console.warn('⚠️ Elements parsing warnings:', parseResult.warnings)
        
        // Send warnings to renderer for debugging
        const mainWindow = dependencies.windowHelper.getMainWindow?.()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('lens-parsing-warnings', {
            type: 'elements',
            warnings: parseResult.warnings
          })
        }
      }

      // Get browser chrome offset (can be made configurable later)
      const browserChromeOffset = 90 // TODO: Make this configurable based on browser type
      
      const elements: ElementInfo[] = parseResult.data.map((el, index) => ({
        id: `element-${index}`,
        type: el.type,
        bounds: {
          x: el.bounds.x,
          y: el.bounds.y + browserChromeOffset,
          width: el.bounds.width,
          height: el.bounds.height
        },
        confidence: el.confidence,
        actions: el.suggested_actions || [],
        detected_structure: el.detected_structure || {}
      }))
      
      return ok(elements)
    } catch (error) {
      return err({
        type: 'AI_ANALYSIS_FAILED',
        message: 'Failed to detect elements using EHR mapping',
        details: error
      })
    }
  }

  const createOrbital = (): Result<BrowserWindow, LensError> => {
    try {
      // Use main window for orbital indicator instead of separate window
      const mainWindow = windowHelper.getMainWindow?.()
      
      if (!mainWindow || mainWindow.isDestroyed()) {
        return err({
          type: 'OVERLAY_CREATION_FAILED',
          message: 'Main window not available for orbital',
          details: null
        })
      }
      
      // Send orbital show command to React renderer
      mainWindow.webContents.send('lens-orbital-show')
      
      return ok(mainWindow)
    } catch (error) {
      return err({
        type: 'OVERLAY_CREATION_FAILED',
        message: 'Failed to create orbital indicator',
        details: error
      })
    }
  }

  const createOverlay = (elements: ElementInfo[]): Result<Map<string, BrowserWindow>, LensError> => {
    try {
      console.log(`🎯 Creating overlays for ${elements.length} elements`)
      
      // Close any existing overlay windows first
      windowHelper.closeAllElementOverlayWindows()
      
      // Create one overlay window per element
      const overlayWindows = new Map<string, BrowserWindow>()
      
      for (const element of elements) {
        const overlayWindow = windowHelper.createElementOverlayWindow(element.id, element.bounds)
        
        // Send the specific element data to this overlay window
        overlayWindow.webContents.once('did-finish-load', () => {
          console.log(`📡 Sending element data to overlay window for ${element.id}`)
          overlayWindow.webContents.send('lens-overlay-element', element)
        })
        
        overlayWindows.set(element.id, overlayWindow)
      }
      
      console.log(`✅ Created ${overlayWindows.size} overlay windows`)
      
      return ok(overlayWindows)
    } catch (error) {
      return err({
        type: 'OVERLAY_CREATION_FAILED',
        message: 'Failed to create overlay windows',
        details: error
      })
    }
  }

  // Focused rectangle analysis for E + drag functionality
  const analyzeFocusedRectangle = async (
    croppedScreenshot: Buffer,
    pageId: string,
    rectangle: {x: number, y: number, width: number, height: number},
    ehrSystem: string = 'athena'
  ): Promise<Result<import('./LensSchemas').FocusedElementResponse, LensError>> => {
    const startTime = startTimer('Focused Rectangle Analysis', { 
      pageId, 
      rectangle: `${rectangle.width}x${rectangle.height}`,
      ehrSystem 
    })
    
    try {
      // Save the cropped screenshot buffer for debugging
      const croppedScreenshotPath = path.join(process.cwd(), 'debug-cropped-screenshot.png')
      fs.writeFileSync(croppedScreenshotPath, croppedScreenshot)
      console.log(`Saved cropped screenshot to ${croppedScreenshotPath}`)
      
      // Use focused prompt for the cropped area
      const focusedPrompt = promptGenerators.createFocusedRectanglePrompt(pageId, rectangle, ehrSystem)
      
      const aiStartTime = startTimer('AI Focused Analysis', { promptLength: focusedPrompt.length })
      const result = await processingHelper.analyzeScreenshot(croppedScreenshot, focusedPrompt)
      endTimer('AI Focused Analysis', aiStartTime)
      
      let parsedData: unknown
      
      const jsonParseStartTime = startTimer('JSON Parse (Focused)', { responseLength: result.length })
      try {
        parsedData = JSON.parse(result)
        endTimer('JSON Parse (Focused)', jsonParseStartTime)
      } catch (jsonError) {
        endTimer('JSON Parse (Focused)', jsonParseStartTime)
        endTimer('Focused Rectangle Analysis', startTime)
        return err({
          type: 'AI_ANALYSIS_FAILED',
          message: `Failed to parse JSON response: ${jsonError}`,
          details: { originalResponse: result, jsonError }
        })
      }
      
      // Use Zod for safe parsing with warnings
      const zodParseStartTime = startTimer('Zod Validation (Focused)')
      const parseResult = parseWithWarnings.focusedElement(parsedData)
      endTimer('Zod Validation (Focused)', zodParseStartTime)
      
      if (parseResult.warnings.length > 0) {
        console.warn('⚠️ Focused element parsing warnings:', parseResult.warnings)
        
        // Send warnings to renderer for debugging
        const mainWindow = dependencies.windowHelper.getMainWindow?.()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('lens-parsing-warnings', {
            type: 'focused',
            warnings: parseResult.warnings
          })
        }
      }
      
      if (!parseResult.data) {
        endTimer('Focused Rectangle Analysis', startTime)
        return err({
          type: 'AI_ANALYSIS_FAILED',
          message: 'Failed to parse focused element data even with fallbacks',
          details: { warnings: parseResult.warnings, originalData: parsedData }
        })
      }
      
      endTimer('Focused Rectangle Analysis', startTime)
      return ok(parseResult.data)
      
    } catch (error) {
      endTimer('Focused Rectangle Analysis', startTime)
      return err({
        type: 'AI_ANALYSIS_FAILED',
        message: 'Failed to analyze focused rectangle',
        details: error
      })
    }
  }

  // Comprehensive analysis - route + elements in one call for better performance
  const analyzeScreenComprehensively = async (
    screenshot: Buffer, 
    ehrSystem: string = 'athena'
  ): Promise<Result<{ route: RouteInfo; elements: ElementInfo[] }, LensError>> => {
    try {
      const comprehensivePrompt = promptGenerators.createComprehensivePrompt(ehrSystem)
      
      const result = await processingHelper.analyzeScreenshot(screenshot, comprehensivePrompt)
      let parsedData: unknown
      
      try {
        parsedData = JSON.parse(result)
      } catch (jsonError) {
        return err({
          type: 'AI_ANALYSIS_FAILED',
          message: `Failed to parse JSON response: ${jsonError}`,
          details: { originalResponse: result, jsonError }
        })
      }
      
      // Use Zod for safe parsing with warnings
      const parseResult = parseWithWarnings.comprehensive(parsedData)
      
      if (parseResult.warnings.length > 0) {
        console.warn('⚠️ Comprehensive parsing warnings:', parseResult.warnings)
        
        // Send warnings to renderer for debugging
        const mainWindow = dependencies.windowHelper.getMainWindow?.()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('lens-parsing-warnings', {
            type: 'comprehensive',
            warnings: parseResult.warnings
          })
        }
      }
      
      if (!parseResult.data) {
        return err({
          type: 'AI_ANALYSIS_FAILED',
          message: 'Failed to parse comprehensive data even with fallbacks',
          details: { warnings: parseResult.warnings, originalData: parsedData }
        })
      }
      
      const route: RouteInfo = {
        type: parseResult.data.route.type,
        confidence: parseResult.data.route.confidence,
        ehrSystem: parseResult.data.route.ehrSystem,
        timestamp: Date.now()
      }

      const elements: ElementInfo[] = parseResult.data.elements.map((el, index) => ({
        id: `element-${index}`,
        type: el.type,
        bounds: {
          x: el.bounds.x,
          y: el.bounds.y,
          width: el.bounds.width,
          height: el.bounds.height
        },
        confidence: el.confidence,
        actions: el.suggested_actions || [],
        detected_structure: el.detected_structure || {}
      }))
      
      return ok({ route, elements })
    } catch (error) {
      return err({
        type: 'AI_ANALYSIS_FAILED',
        message: 'Failed comprehensive screen analysis',
        details: error
      })
    }
  }

  // Cache management now handled by Zustand store

  return {
    takeScreenshot,
    detectRoute,
    detectElements,
    analyzeScreenComprehensively,
    analyzeFocusedRectangle,
    createOrbital,
    createOverlay,
    windowHelper  // Expose windowHelper for use in deactivation
  }
}

// Composed lens activation function  
export const createLensActivation = (
  operations: ReturnType<typeof createLensOperations>,
  dependencies: LensDependencies
) => {
  // Alternative activation using separate route/element calls (for testing/debugging)
  const activateLensStepByStep = async (ehrSystem: string = 'athena'): Promise<Result<LensState, LensError>> => {
    const screenshotResult = await operations.takeScreenshot()
    if (screenshotResult.isErr()) {
      return err(screenshotResult.error)
    }

    const routeResult = await operations.detectRoute(screenshotResult.value, ehrSystem)
    if (routeResult.isErr()) {
      return err(routeResult.error)
    }

    const elementsResult = await operations.detectElements(
      screenshotResult.value, 
      routeResult.value
    )
    if (elementsResult.isErr()) {
      return err(elementsResult.error)
    }

    const overlayResult = operations.createOverlay(elementsResult.value)
    if (overlayResult.isErr()) {
      return err(overlayResult.error)
    }

    return ok({
      isActive: true,
      orbitalVisible: false,
      overlayWindows: overlayResult.value,
      currentRoute: routeResult.value,
      elements: elementsResult.value,
      cache: new Map()
    })
  }

  // New E + drag activation workflow
  const activateLensWithDragSelection = async (
    rectangle: {x: number, y: number, width: number, height: number},
    ehrSystem: string = 'athena'
  ): Promise<Result<import('./LensSchemas').FocusedElementResponse, LensError>> => {
    const screenshotResult = await operations.takeScreenshot()
    if (screenshotResult.isErr()) {
      return err(screenshotResult.error)
    }

    // First detect the route to understand what page we're on
    const routeResult = await operations.detectRoute(screenshotResult.value, ehrSystem)
    if (routeResult.isErr()) {
      return err(routeResult.error)
    }

    // Get display info for proper coordinate scaling
    const primaryDisplay = screen.getPrimaryDisplay()
    const scaleFactor = primaryDisplay.scaleFactor
    
    // Apply scale factor to rectangle coordinates from client
    const scaledRectangle = {
      x: Math.round(rectangle.x * scaleFactor),
      y: Math.round(rectangle.y * scaleFactor),
      width: Math.round(rectangle.width * scaleFactor),
      height: Math.round(rectangle.height * scaleFactor)
    }
    
    console.log(`🎯 Original rectangle: ${rectangle.x},${rectangle.y} ${rectangle.width}x${rectangle.height}`)
    console.log(`📏 Scale factor: ${scaleFactor}x`)
    console.log(`📐 Scaled rectangle: ${scaledRectangle.x},${scaledRectangle.y} ${scaledRectangle.width}x${scaledRectangle.height}`)

    // Crop the screenshot to the scaled rectangle
    try {
      const cropResult = await dependencies.screenshotHelper.cropImage(screenshotResult.value, scaledRectangle)
      
      // Analyze the focused rectangle
      const analysisResult = await operations.analyzeFocusedRectangle(
        cropResult,
        routeResult.value.type,
        scaledRectangle,
        ehrSystem
      )

      return analysisResult
    } catch (error) {
      return err({
        type: 'SCREENSHOT_FAILED',
        message: 'Failed to crop screenshot to rectangle',
        details: error
      })
    }
  }

  const deactivateLens = (state: LensState): Result<LensState, LensError> => {
    try {
      console.log("🔄 Deactivating lens - closing all overlay windows")
      
      // Close all individual overlay windows
      state.overlayWindows.forEach((window, elementId) => {
        if (!window.isDestroyed()) {
          console.log(`🗑️ Closing overlay window for element: ${elementId}`)
          window.close()
        }
      })
      
      // Also call the helper method to ensure cleanup
      operations.windowHelper.closeAllElementOverlayWindows()
      
      // Clear mouse regions (if this is still needed for any remaining UI)
      operations.windowHelper.setOverlayMouseRegions([])
      
      return ok({
        ...state,
        isActive: false,
        overlayWindows: new Map(),
        elements: []
      })
    } catch (error) {
      return err({
        type: 'OVERLAY_CREATION_FAILED',
        message: 'Failed to deactivate lens',
        details: error
      })
    }
  }

  return { 
    activateLensStepByStep, 
    activateLensWithDragSelection,
    deactivateLens 
  }
}