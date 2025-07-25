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
    overlayWindows: new Map(),
    currentRoute: null,
    elements: [],
    cache: new Map(),
    // Actions
    setActive: (active) => {
        set({ isActive: active });
        if (!active) {
            // Clean up when deactivating
            const state = get();
            // Close all overlay windows
            state.overlayWindows.forEach(window => {
                if (!window.isDestroyed()) {
                    window.close();
                }
            });
            set({
                orbitalVisible: false,
                overlayWindows: new Map(),
                elements: []
            });
        }
    },
    setOrbitalVisible: (visible) => set({ orbitalVisible: visible }),
    addOverlayWindow: (elementId, window) => {
        const state = get();
        const newWindows = new Map(state.overlayWindows);
        newWindows.set(elementId, window);
        set({ overlayWindows: newWindows });
    },
    removeOverlayWindow: (elementId) => {
        const state = get();
        const window = state.overlayWindows.get(elementId);
        if (window && !window.isDestroyed()) {
            window.close();
        }
        const newWindows = new Map(state.overlayWindows);
        newWindows.delete(elementId);
        set({ overlayWindows: newWindows });
    },
    clearOverlayWindows: () => {
        const state = get();
        state.overlayWindows.forEach(window => {
            if (!window.isDestroyed()) {
                window.close();
            }
        });
        set({ overlayWindows: new Map() });
    },
    setCurrentRoute: (route) => set({ currentRoute: route }),
    setElements: (elements) => set({ elements }),
    clearCache: () => set({ cache: new Map() }),
    // Computed values
    hasActiveOverlays: () => {
        const state = get();
        return Array.from(state.overlayWindows.values()).some(window => window && !window.isDestroyed());
    },
    isRouteDetected: () => {
        const state = get();
        return state.currentRoute !== null;
    },
    getElementCount: () => {
        const state = get();
        return state.elements.length;
    },
    getOverlayWindowCount: () => {
        const state = get();
        return state.overlayWindows.size;
    },
    getOverlayWindows: () => {
        const state = get();
        return Array.from(state.overlayWindows.values()).filter(window => window && !window.isDestroyed());
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
            overlayWindowCount: store.getOverlayWindowCount(),
            hasOverlays: store.hasActiveOverlays(),
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
            overlayWindowCount: store.overlayWindows.size,
            cacheSize: store.cache.size,
            hasOverlays: store.hasActiveOverlays()
        });
    }
};
//# sourceMappingURL=LensStore.js.map