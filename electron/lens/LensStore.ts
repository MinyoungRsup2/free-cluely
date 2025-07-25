import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { BrowserWindow } from 'electron'
import { LensState, RouteInfo, ElementInfo } from './LensHelper'

// Session storage adapter for Electron main process
const createSessionStorage = () => ({
  getItem: (name: string): string | null => {
    try {
      // In Electron main process, we can use a simple Map for session storage
      return global.sessionStore?.get(name) || null
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (!global.sessionStore) {
        global.sessionStore = new Map()
      }
      global.sessionStore.set(name, value)
    } catch {
      // Silent fail for session storage
    }
  },
  removeItem: (name: string): void => {
    try {
      global.sessionStore?.delete(name)
    } catch {
      // Silent fail
    }
  }
})

// Extend global type for session storage
declare global {
  var sessionStore: Map<string, string> | undefined
}

// Lens store interface - updated for multi-window paradigm
interface LensStore {
  // Core state
  isActive: boolean
  orbitalVisible: boolean
  overlayWindows: Map<string, BrowserWindow> // elementId -> BrowserWindow
  currentRoute: RouteInfo | null
  elements: ElementInfo[]
  cache: Map<string, any>
  
  // Actions
  setActive: (active: boolean) => void
  setOrbitalVisible: (visible: boolean) => void
  addOverlayWindow: (elementId: string, window: BrowserWindow) => void
  removeOverlayWindow: (elementId: string) => void
  clearOverlayWindows: () => void
  setCurrentRoute: (route: RouteInfo | null) => void
  setElements: (elements: ElementInfo[]) => void
  clearCache: () => void
  
  // Computed values
  hasActiveOverlays: () => boolean
  isRouteDetected: () => boolean
  getElementCount: () => number
  getOverlayWindowCount: () => number
  getOverlayWindows: () => BrowserWindow[]
  
  // Cache operations
  getCacheSize: () => number
  getCacheEntries: () => Array<{ key: string; timestamp: number }>
}

// Create the lens store with persistence
export const useLensStore = create<LensStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isActive: false,
      orbitalVisible: false,
      overlayWindows: new Map(),
      currentRoute: null,
      elements: [],
      cache: new Map(),

      // Actions
      setActive: (active: boolean) => {
        set({ isActive: active })
        if (!active) {
          // Clean up when deactivating
          const state = get()
          // Close all overlay windows
          state.overlayWindows.forEach(window => {
            if (!window.isDestroyed()) {
              window.close()
            }
          })
          set({ 
            orbitalVisible: false, 
            overlayWindows: new Map(),
            elements: [] 
          })
        }
      },

      setOrbitalVisible: (visible: boolean) => set({ orbitalVisible: visible }),

      addOverlayWindow: (elementId: string, window: BrowserWindow) => {
        const state = get()
        const newWindows = new Map(state.overlayWindows)
        newWindows.set(elementId, window)
        set({ overlayWindows: newWindows })
      },

      removeOverlayWindow: (elementId: string) => {
        const state = get()
        const window = state.overlayWindows.get(elementId)
        if (window && !window.isDestroyed()) {
          window.close()
        }
        const newWindows = new Map(state.overlayWindows)
        newWindows.delete(elementId)
        set({ overlayWindows: newWindows })
      },

      clearOverlayWindows: () => {
        const state = get()
        state.overlayWindows.forEach(window => {
          if (!window.isDestroyed()) {
            window.close()
          }
        })
        set({ overlayWindows: new Map() })
      },

      setCurrentRoute: (route: RouteInfo | null) => set({ currentRoute: route }),

      setElements: (elements: ElementInfo[]) => set({ elements }),

      clearCache: () => set({ cache: new Map() }),

      // Computed values
      hasActiveOverlays: () => {
        const state = get()
        return Array.from(state.overlayWindows.values()).some(window => 
          window && !window.isDestroyed()
        )
      },

      isRouteDetected: () => {
        const state = get()
        return state.currentRoute !== null
      },

      getElementCount: () => {
        const state = get()
        return state.elements.length
      },

      getOverlayWindowCount: () => {
        const state = get()
        return state.overlayWindows.size
      },

      getOverlayWindows: () => {
        const state = get()
        return Array.from(state.overlayWindows.values()).filter(window => 
          window && !window.isDestroyed()
        )
      },

      // Cache operations
      getCacheSize: () => {
        const state = get()
        return state.cache.size
      },

      getCacheEntries: () => {
        const state = get()
        return Array.from(state.cache.entries()).map(([key, value]) => ({
          key,
          timestamp: value.timestamp
        }))
      }
    }),
    {
      name: 'lens-storage',
      storage: createJSONStorage(() => createSessionStorage()),
      
      // Only persist certain fields (not windows or cache)
      partialize: (state) => ({
        isActive: state.isActive,
        currentRoute: state.currentRoute,
        // Don't persist: overlayWindow, cache, elements
      })
    }
  )
)

// Helper functions for working with the store
export const lensStoreHelpers = {
  // Reset entire lens state
  reset: () => {
    const store = useLensStore.getState()
    store.setActive(false)
    store.setCurrentRoute(null)
    store.setElements([])
    store.clearCache()
  },

  // Get current lens status
  getStatus: () => {
    const store = useLensStore.getState()
    return {
      active: store.isActive,
      hasRoute: store.isRouteDetected(),
      elementCount: store.getElementCount(),
      overlayWindowCount: store.getOverlayWindowCount(),
      hasOverlays: store.hasActiveOverlays(),
      cacheSize: store.getCacheSize()
    }
  },

  // Debug helper
  debug: () => {
    const store = useLensStore.getState()
    console.log('Lens Store Debug:', {
      isActive: store.isActive,
      orbitalVisible: store.orbitalVisible,
      currentRoute: store.currentRoute,
      elementCount: store.elements.length,
      overlayWindowCount: store.overlayWindows.size,
      cacheSize: store.cache.size,
      hasOverlays: store.hasActiveOverlays()
    })
  }
}

// Export types for use in other files
export type { LensStore }