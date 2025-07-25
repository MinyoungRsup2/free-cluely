"use strict";
// ScreenshotHelper.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotHelper = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const electron_1 = require("electron");
const uuid_1 = require("uuid");
const screenshot_desktop_1 = __importDefault(require("screenshot-desktop"));
const sharp_1 = __importDefault(require("sharp"));
class ScreenshotHelper {
    screenshotQueue = [];
    extraScreenshotQueue = [];
    MAX_SCREENSHOTS = 5;
    screenshotDir;
    extraScreenshotDir;
    view = "queue";
    constructor(view = "queue") {
        this.view = view;
        // Initialize directories
        this.screenshotDir = node_path_1.default.join(electron_1.app.getPath("userData"), "screenshots");
        this.extraScreenshotDir = node_path_1.default.join(electron_1.app.getPath("userData"), "extra_screenshots");
        // Create directories if they don't exist
        if (!node_fs_1.default.existsSync(this.screenshotDir)) {
            node_fs_1.default.mkdirSync(this.screenshotDir);
        }
        if (!node_fs_1.default.existsSync(this.extraScreenshotDir)) {
            node_fs_1.default.mkdirSync(this.extraScreenshotDir);
        }
    }
    getView() {
        return this.view;
    }
    setView(view) {
        this.view = view;
    }
    getScreenshotQueue() {
        return this.screenshotQueue;
    }
    getExtraScreenshotQueue() {
        return this.extraScreenshotQueue;
    }
    clearQueues() {
        // Clear screenshotQueue
        this.screenshotQueue.forEach((screenshotPath) => {
            node_fs_1.default.unlink(screenshotPath, (err) => {
                if (err)
                    console.error(`Error deleting screenshot at ${screenshotPath}:`, err);
            });
        });
        this.screenshotQueue = [];
        // Clear extraScreenshotQueue
        this.extraScreenshotQueue.forEach((screenshotPath) => {
            node_fs_1.default.unlink(screenshotPath, (err) => {
                if (err)
                    console.error(`Error deleting extra screenshot at ${screenshotPath}:`, err);
            });
        });
        this.extraScreenshotQueue = [];
    }
    async takeScreenshot(hideMainWindow, showMainWindow) {
        hideMainWindow();
        let screenshotPath = "";
        if (this.view === "queue") {
            screenshotPath = node_path_1.default.join(this.screenshotDir, `${(0, uuid_1.v4)()}.png`);
            await (0, screenshot_desktop_1.default)({ filename: screenshotPath });
            this.screenshotQueue.push(screenshotPath);
            if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
                const removedPath = this.screenshotQueue.shift();
                if (removedPath) {
                    try {
                        await node_fs_1.default.promises.unlink(removedPath);
                    }
                    catch (error) {
                        console.error("Error removing old screenshot:", error);
                    }
                }
            }
        }
        else {
            screenshotPath = node_path_1.default.join(this.extraScreenshotDir, `${(0, uuid_1.v4)()}.png`);
            await (0, screenshot_desktop_1.default)({ filename: screenshotPath });
            this.extraScreenshotQueue.push(screenshotPath);
            if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
                const removedPath = this.extraScreenshotQueue.shift();
                if (removedPath) {
                    try {
                        await node_fs_1.default.promises.unlink(removedPath);
                    }
                    catch (error) {
                        console.error("Error removing old screenshot:", error);
                    }
                }
            }
        }
        showMainWindow();
        return screenshotPath;
    }
    async getImagePreview(filepath) {
        try {
            const data = await node_fs_1.default.promises.readFile(filepath);
            return `data:image/png;base64,${data.toString("base64")}`;
        }
        catch (error) {
            console.error("Error reading image:", error);
            throw error;
        }
    }
    async deleteScreenshot(path) {
        try {
            await node_fs_1.default.promises.unlink(path);
            if (this.view === "queue") {
                this.screenshotQueue = this.screenshotQueue.filter((filePath) => filePath !== path);
            }
            else {
                this.extraScreenshotQueue = this.extraScreenshotQueue.filter((filePath) => filePath !== path);
            }
            return { success: true };
        }
        catch (error) {
            console.error("Error deleting file:", error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Take a screenshot and return as Buffer for lens system
     */
    async takeScreenshotAsBuffer(hideMainWindow, showMainWindow) {
        hideMainWindow();
        try {
            // Create temporary path for screenshot
            const tempPath = node_path_1.default.join(this.screenshotDir, `temp-${(0, uuid_1.v4)()}.png`);
            await (0, screenshot_desktop_1.default)({ filename: tempPath });
            // Read as buffer
            const buffer = await node_fs_1.default.promises.readFile(tempPath);
            // Clean up temp file
            try {
                await node_fs_1.default.promises.unlink(tempPath);
            }
            catch (cleanupError) {
                console.warn('Failed to cleanup temp screenshot:', cleanupError);
            }
            return buffer;
        }
        finally {
            showMainWindow();
        }
    }
    /**
     * Crop image buffer to specified rectangle for E + drag functionality
     */
    async cropImage(imageBuffer, rectangle) {
        try {
            console.log(`🔪 Cropping image to rectangle: (${rectangle.x}, ${rectangle.y}) ${rectangle.width}x${rectangle.height}`);
            // Ensure coordinates are integers and within bounds
            const cropOptions = {
                left: Math.max(0, Math.floor(rectangle.x)),
                top: Math.max(0, Math.floor(rectangle.y)),
                width: Math.max(1, Math.floor(rectangle.width)),
                height: Math.max(1, Math.floor(rectangle.height))
            };
            // Use sharp to crop the image
            const croppedBuffer = await (0, sharp_1.default)(imageBuffer)
                .extract(cropOptions)
                .png()
                .toBuffer();
            console.log(`✂️ Successfully cropped image to ${cropOptions.width}x${cropOptions.height}`);
            return croppedBuffer;
        }
        catch (error) {
            console.error('❌ Error cropping image:', error);
            throw new Error(`Failed to crop image: ${error.message}`);
        }
    }
}
exports.ScreenshotHelper = ScreenshotHelper;
//# sourceMappingURL=ScreenshotHelper.js.map