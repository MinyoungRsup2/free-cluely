"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lensStoreHelpers = exports.useLensStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
// Session storage adapter for Electron main process
const createSessionStorage = () => ({
    getItem: (name) => {
        try {
            // In Electron main process, we can use a simple Map for session storage
            return global.sessionStore?.get(name) || null;
        }
        catch {
            return null;
        }
    },
    setItem: (name, value) => {
        try {
            if (!global.sessionStore) {
                global.sessionStore = new Map();
            }
            global.sessionStore.set(name, value);
        }
        catch {
            // Silent fail for session storage
        }
    },
    removeItem: (name) => {
        try {
            global.sessionStore?.delete(name);
        }
        catch {
            // Silent fail
        }
    }
});
// Create the lens store with persistence
exports.useLensStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    // Initial state
    isActive: false,
    orbitalVisible: false,
    overlayWindow: null,
    currentRoute: null,
    elements: [],
    cache: new Map(),
    // Actions
    setActive: (active) => {
        set({ isActive: active });
        if (!active) {
            // Clean up when deactivating
            set({
                orbitalVisible: false,
                overlayWindow: null,
                elements: []
            });
        }
    },
    setOrbitalVisible: (visible) => set({ orbitalVisible: visible }),
    setOverlayWindow: (window) => set({ overlayWindow: window }),
    setCurrentRoute: (route) => set({ currentRoute: route }),
    setElements: (elements) => set({ elements }),
    clearCache: () => set({ cache: new Map() }),
    // Computed values
    hasActiveOverlay: () => {
        const state = get();
        return state.overlayWindow !== null && !state.overlayWindow?.isDestroyed();
    },
    isRouteDetected: () => {
        const state = get();
        return state.currentRoute !== null;
    },
    getElementCount: () => {
        const state = get();
        return state.elements.length;
    },
    // Cache operations
    getCacheSize: () => {
        const state = get();
        return state.cache.size;
    },
    getCacheEntries: () => {
        const state = get();
        return Array.from(state.cache.entries()).map(([key, value]) => ({
            key,
            timestamp: value.timestamp
        }));
    }
}), {
    name: 'lens-storage',
    storage: (0, middleware_1.createJSONStorage)(() => createSessionStorage()),
    // Only persist certain fields (not windows or cache)
    partialize: (state) => ({
        isActive: state.isActive,
        currentRoute: state.currentRoute,
        // Don't persist: overlayWindow, cache, elements
    })
}));
// Helper functions for working with the store
exports.lensStoreHelpers = {
    // Reset entire lens state
    reset: () => {
        const store = exports.useLensStore.getState();
        store.setActive(false);
        store.setCurrentRoute(null);
        store.setElements([]);
        store.clearCache();
    },
    // Get current lens status
    getStatus: () => {
        const store = exports.useLensStore.getState();
        return {
            active: store.isActive,
            hasRoute: store.isRouteDetected(),
            elementCount: store.getElementCount(),
            hasOverlay: store.hasActiveOverlay(),
            cacheSize: store.getCacheSize()
        };
    },
    // Debug helper
    debug: () => {
        const store = exports.useLensStore.getState();
        console.log('Lens Store Debug:', {
            isActive: store.isActive,
            orbitalVisible: store.orbitalVisible,
            currentRoute: store.currentRoute,
            elementCount: store.elements.length,
            cacheSize: store.cache.size,
            hasOverlay: store.hasActiveOverlay()
        });
    }
};
//# sourceMappingURL=LensStore.js.map