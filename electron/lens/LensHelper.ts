import { Result, ok, err } from 'neverthrow'
import { BrowserWindow, screen } from 'electron'
import { promptGenerators } from './EHRMappings'
import { parseWithWarnings } from './LensSchemas'
import type { ScreenshotHelper } from '../helpers/ScreenshotHelper'
import type { ProcessingHelper } from '../helpers/ProcessingHelper'

// Types for our lens system
export interface LensState {
  isActive: boolean
  orbitalVisible: boolean
  overlayWindow: BrowserWindow | null
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

export interface ElementInfo {
  id: string
  type: string
  bounds: { x: number; y: number; width: number; height: number }
  confidence: number
  actions: string[]
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
    try {
      const buffer = await screenshotHelper.takeScreenshotAsBuffer(
        () => windowHelper.hideMainWindow(),
        () => windowHelper.showMainWindow()
      )
      return ok(buffer)
    } catch (error) {
      return err({
        type: 'SCREENSHOT_FAILED',
        message: 'Failed to capture screenshot',
        details: error
      })
    }
  }

  const detectRoute = async (screenshot: Buffer, ehrSystem: string = 'athena'): Promise<Result<RouteInfo, LensError>> => {
    try {
      // Use structured prompt from EHR mapping
      const routePrompt = promptGenerators.createRoutePrompt(ehrSystem)
      
      const result = await processingHelper.analyzeScreenshot(screenshot, routePrompt)
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
      const parseResult = parseWithWarnings.route(parsedData)
      
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
      
      const elements: ElementInfo[] = parseResult.data.map((el, index) => ({
        id: `element-${index}`,
        type: el.type,
        bounds: {
          x: el.bounds.x,
          y: el.bounds.y,
          width: el.bounds.width,
          height: el.bounds.height
        },
        confidence: el.confidence,
        actions: el.suggested_actions || []
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

  const createOverlay = (elements: ElementInfo[]): Result<BrowserWindow, LensError> => {
    try {
      // Instead of creating a separate window, use the main window for overlay
      const mainWindow = windowHelper.getMainWindow ? windowHelper.getMainWindow() : null
      
      console.log('DEBUG: windowHelper.getMainWindow exists?', !!windowHelper.getMainWindow)
      console.log('DEBUG: mainWindow:', !!mainWindow)
      
      if (!mainWindow || mainWindow.isDestroyed()) {
        return err({
          type: 'OVERLAY_CREATION_FAILED',
          message: `Main window not available for overlay. Window exists: ${!!mainWindow}, windowHelper has getMainWindow: ${!!windowHelper.getMainWindow}`,
          details: { hasGetMainWindow: !!windowHelper.getMainWindow, windowExists: !!mainWindow }
        })
      }
      
      // Send overlay data to the main React renderer
      console.log('DEBUG: Sending lens-overlay-elements with', elements.length, 'elements')
      mainWindow.webContents.send('lens-overlay-elements', elements)
      
      return ok(mainWindow)
    } catch (error) {
      return err({
        type: 'OVERLAY_CREATION_FAILED',
        message: 'Failed to create overlay window',
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
      console.log(result)
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
        actions: el.suggested_actions || []
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
    createOrbital,
    createOverlay
  }
}

// Composed lens activation function
export const createLensActivation = (operations: ReturnType<typeof createLensOperations>) => {
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

    console.log('Route detected:', routeResult) 

    const elementsResult = await operations.detectElements(
      screenshotResult.value, 
      routeResult.value
    )

    console.log('Elements detected:', elementsResult)

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
      overlayWindow: overlayResult.value,
      currentRoute: routeResult.value,
      elements: elementsResult.value,
      cache: new Map()
    })
  }

  const deactivateLens = (state: LensState): Result<LensState, LensError> => {
    try {
      if (state.overlayWindow && !state.overlayWindow.isDestroyed()) {
        state.overlayWindow.close()
      }
      
      return ok({
        ...state,
        isActive: false,
        overlayWindow: null,
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

  return { activateLensStepByStep, deactivateLens }
}