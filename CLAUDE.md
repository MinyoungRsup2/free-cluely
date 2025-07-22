# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mental overview
1. Let's not over use tokens - let's always discuss back and forth before jumping straight into implementation
2. I want you to teach me as well - I don't know that much about electron, so their APIs are new
3. Functional programming primitives with remada! the current framework uses class based approach but new code should be composable / functional

## Lens Architecture Overview

Lens is an Electron-based desktop application that provides AI-powered contextual assistance for EHR systems through an innovative overlay system. The app uses computer vision and AI to understand EHR interfaces and provide contextual actions.

### Lens System Flow

1. **E Key Activation**: Press and hold 'E' to activate lens mode
2. **Instant Analysis**: Screenshot capture + AI route detection  
3. **Orbital Loading**: Floating circular indicator during AI processing
4. **Context Overlay**: Invisible clickable regions based on detected EHR elements
5. **Contextual Actions**: Hold E + click to show contextual menu at cursor position

### Architecture Components

#### Main Process (Electron)
- **LensHelper**: Orchestrates the complete lens workflow
- **RouteDetector**: AI-powered EHR route and page type detection
- **OverlayWindow**: Separate transparent Electron window for clickable regions  
- **OrbitalIndicator**: Floating loading state indicator
- **RealtimeScreenHelper**: Extended for route and element detection with caching

#### Renderer Process (React)
- **LensOverlay**: Invisible clickable regions component
- **ContextualMenu**: Click-triggered menu with EHR-specific actions
- **OrbitalComponent**: Loading orbital UI component

### EHR Integration
- **Primary Target**: Athena Health (gridded layout system)
- **Design Goal**: EHR-agnostic architecture for future expansion
- **Detection Strategy**: Two-phase AI analysis (route detection → element detection)
- **Caching**: Route and element analysis results cached for performance

### Technical Implementation
- **Overlay Window**: Separate always-on-top transparent Electron window
- **AI Processing**: Dual-phase detection with route-specific element logic
- **Performance**: Cached analysis results to minimize AI calls
- **Input Handling**: Global E-key shortcut with hold-and-click interaction

## Development Commands

### Core Development
- `npm run dev` - Start Vite development server
- `npm run electron:dev` - Start Electron in development mode
- `npm run app:dev` - Run both frontend and Electron concurrently (recommended for development)
- `npm run watch` - Watch TypeScript compilation for Electron files

### Building & Production
- `npm run build` - Build the entire application (clean, compile TypeScript, build frontend)
- `npm run app:build` - Build and package the Electron app for distribution
- `npm run clean` - Clean dist and dist-electron directories
- `npm run preview` - Preview the built frontend

### Development Workflow
For development, use `npm run app:dev` which starts both the Vite dev server and Electron. The app expects the frontend to be running on port 5173.

## Architecture

### Main Process (Electron)
- **main.ts**: Entry point, manages AppState singleton and application lifecycle
- **AppState**: Centralized state management for the entire application
- **WindowHelper**: Manages Electron window creation, positioning, and visibility
- **ScreenshotHelper**: Handles screenshot capture, storage, and queue management
- **ProcessingHelper**: Manages AI processing via Google Gemini API
- **ShortcutsHelper**: Global keyboard shortcuts registration
- **ipcHandlers.ts**: IPC communication handlers between main and renderer

### Renderer Process (React)
- **App.tsx**: Main React component with view state management
- **_pages/**: Main application views (Queue, Solutions, Debug)
- **components/**: Reusable React components organized by feature
- **types/**: TypeScript type definitions
- **lib/utils.ts**: Utility functions

### Key Features
- Screenshot capture and queuing system
- AI-powered problem analysis using Google Gemini
- Global keyboard shortcuts (Cmd/Ctrl+B, Cmd/Ctrl+H, etc.)
- Dynamic window resizing based on content
- IPC communication between main and renderer processes

### State Management
- React Query for data fetching and caching
- AppState singleton for Electron main process state
- View-based navigation (queue → solutions → debug)

### API Integration
Requires `GEMINI_API_KEY` environment variable for Google Gemini AI integration.

### Key Directories
- `src/`: React frontend source code
- `electron/`: Electron main process TypeScript source (organized in folders)
  - `core/`: Main application files (main.ts, shortcuts.ts, ipcHandlers.ts)
  - `helpers/`: Utility classes (WindowHelper, ScreenshotHelper, ProcessingHelper)
  - `lens/`: Lens system components (LensHelper, EHRMappings, Zustand store)
- `dist-electron/`: Compiled Electron JavaScript files
- `dist/`: Built frontend assets

### Lens System Activation
- **Shortcut**: `Shift+E` (changed from E to avoid typing conflicts)
- **Flow**: Screenshot → AI Analysis → JSON Cleaning → Zod Parsing → Overlay Creation
- **Features**: 
  - Safe parsing with fallbacks and flexible schema handling
  - EHR-specific prompts for Athena detection
  - Session persistence with Zustand
  - Automatic JSON cleanup (removes markdown artifacts)
  - Flexible parsing (handles "box" arrays vs "bounds" objects)

## Important Notes

- The app name in package.json is "interview-coder" but the repository is "free-cluely"
- Window closing via X button is not implemented (known issue) - use Cmd+Q or Ctrl+Q
- Screenshots are stored temporarily and managed through a queue system
- The app hides the dock icon and runs as a utility application
- TypeScript is used throughout with strict type checking enabled