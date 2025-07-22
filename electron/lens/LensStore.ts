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

// Lens store interface
interface LensStore extends LensState {
  // Actions
  setActive: (active: boolean) => void
  setOrbitalVisible: (visible: boolean) => void
  setOverlayWindow: (window: any) => void
  setCurrentRoute: (route: RouteInfo | null) => void
  setElements: (elements: ElementInfo[]) => void
  clearCache: () => void
  
  // Computed values
  hasActiveOverlay: () => boolean
  isRouteDetected: () => boolean
  getElementCount: () => number
  
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
      overlayWindow: null,
      currentRoute: null,
      elements: [],
      cache: new Map(),

      // Actions
      setActive: (active: boolean) => {
        set({ isActive: active })
        if (!active) {
          // Clean up when deactivating
          set({ 
            orbitalVisible: false, 
            overlayWindow: null, 
            elements: [] 
          })
        }
      },

      setOrbitalVisible: (visible: boolean) => set({ orbitalVisible: visible }),

      setOverlayWindow: (window: BrowserWindow | null) => set({ overlayWindow: window }),

      setCurrentRoute: (route: RouteInfo | null) => set({ currentRoute: route }),

      setElements: (elements: ElementInfo[]) => set({ elements }),

      clearCache: () => set({ cache: new Map() }),

      // Computed values
      hasActiveOverlay: () => {
        const state = get()
        return state.overlayWindow !== null && !state.overlayWindow?.isDestroyed()
      },

      isRouteDetected: () => {
        const state = get()
        return state.currentRoute !== null
      },

      getElementCount: () => {
        const state = get()
        return state.elements.length
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
      hasOverlay: store.hasActiveOverlay(),
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
      cacheSize: store.cache.size,
      hasOverlay: store.hasActiveOverlay()
    })
  }
}

// Export types for use in other files
export type { LensStore }