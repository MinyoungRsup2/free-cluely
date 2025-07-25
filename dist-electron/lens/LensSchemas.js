"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWithWarnings = exports.FocusedElementResponseSchema = exports.ComprehensiveResponseSchema = exports.ElementsArraySchema = exports.ElementResponseSchema = exports.BoundsSchema = exports.RouteResponseSchema = void 0;
const zod_1 = require("zod");
// Zod schemas for safe AI response parsing
exports.RouteResponseSchema = zod_1.z.object({
    type: zod_1.z.string().min(1, 'Route type is required'),
    ehrSystem: zod_1.z.enum(['athena', 'unknown'], {
        errorMap: () => ({ message: 'EHR system must be athena or unknown' })
    }),
    confidence: zod_1.z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
    identifiers_found: zod_1.z.array(zod_1.z.string()).optional()
});
exports.BoundsSchema = zod_1.z.object({
    x: zod_1.z.number().min(0, 'X coordinate must be non-negative'),
    y: zod_1.z.number().min(0, 'Y coordinate must be non-negative'),
    width: zod_1.z.number().min(1, 'Width must be positive'),
    height: zod_1.z.number().min(1, 'Height must be positive')
});
// Alternative bounds formats that AI might return
const BoundsArraySchema = zod_1.z.array(zod_1.z.number()).length(4).transform((arr) => ({
    x: arr[0],
    y: arr[1],
    width: arr[2] - arr[0],
    height: arr[3] - arr[1]
}));
exports.ElementResponseSchema = zod_1.z.object({
    type: zod_1.z.string().min(1, 'Element type is required'),
    bounds: exports.BoundsSchema.optional(),
    box: BoundsArraySchema.optional(), // Handle AI returning "box" array
    confidence: zod_1.z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
    detected_structure: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
        text: zod_1.z.string().min(1, 'Detected text is required'),
        confidence: zod_1.z.number().min(0).max(1, 'Detected text confidence must be between 0 and 1'),
        position_found: zod_1.z.string().optional() // Optional field
    })),
    suggested_actions: zod_1.z.array(zod_1.z.string()).optional(),
    actions: zod_1.z.array(zod_1.z.string()).optional() // Handle AI returning "actions" instead
}).transform((data) => ({
    type: data.type,
    bounds: data.bounds || data.box || { x: 0, y: 0, width: 0, height: 0 },
    confidence: data.confidence,
    detected_structure: data.detected_structure || {},
    suggested_actions: data.suggested_actions || data.actions || []
}));
exports.ElementsArraySchema = zod_1.z.array(exports.ElementResponseSchema);
exports.ComprehensiveResponseSchema = zod_1.z.object({
    route: exports.RouteResponseSchema,
    elements: exports.ElementsArraySchema.optional().default([])
});
// Schema for focused rectangle analysis (E + drag functionality)
exports.FocusedElementResponseSchema = zod_1.z.object({
    element: zod_1.z.object({
        type: zod_1.z.string().min(1, 'Element type is required'),
        description: zod_1.z.string().min(1, 'Element description is required'),
        confidence: zod_1.z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
        detected_structure: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
            text: zod_1.z.string().min(1, 'Detected text is required'),
            confidence: zod_1.z.number().min(0).max(1, 'Detected text confidence must be between 0 and 1'),
            position_found: zod_1.z.string().optional() // Optional field
        })),
        suggested_actions: zod_1.z.array(zod_1.z.string()).min(1, 'At least one suggested action required'),
        ehr_context: zod_1.z.object({
            page_type: zod_1.z.string(),
            likely_workflow: zod_1.z.string().optional()
        }).optional()
    }),
    context: zod_1.z.object({
        appears_to_be: zod_1.z.string().min(1, 'Context description required'),
        ui_pattern: zod_1.z.string().min(1, 'UI pattern classification required'),
        confidence: zod_1.z.number().min(0).max(1).optional()
    })
});
// Safe parsing utilities with warning messages
exports.parseWithWarnings = {
    route: (data) => {
        const result = exports.RouteResponseSchema.safeParse(data);
        const warnings = [];
        if (!result.success) {
            warnings.push(`Route parsing failed: ${result.error.message}`);
            // Try to extract partial data with defaults
            const partialData = typeof data === 'object' && data !== null ? data : {};
            const fallbackRoute = {
                type: partialData.type || 'unknown-page',
                ehrSystem: (['athena', 'unknown'].includes(partialData.ehrSystem))
                    ? partialData.ehrSystem
                    : 'unknown',
                confidence: (typeof partialData.confidence === 'number' &&
                    partialData.confidence >= 0 &&
                    partialData.confidence <= 1)
                    ? partialData.confidence
                    : 0.5,
                identifiers_found: Array.isArray(partialData.identifiers_found)
                    ? partialData.identifiers_found
                    : []
            };
            warnings.push(`Using fallback route data: ${JSON.stringify(fallbackRoute)}`);
            return { success: false, data: fallbackRoute, warnings };
        }
        return { success: true, data: result.data, warnings };
    },
    elements: (data) => {
        const result = exports.ElementsArraySchema.safeParse(data);
        const warnings = [];
        console.log("result", result);
        if (!result.success) {
            warnings.push(`Elements parsing failed: ${result.error.message}`);
            // Try to extract partial elements
            const fallbackElements = [];
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        const element = item;
                        // Only include elements with valid bounds
                        if (element.bounds &&
                            typeof element.bounds.x === 'number' &&
                            typeof element.bounds.y === 'number' &&
                            typeof element.bounds.width === 'number' &&
                            typeof element.bounds.height === 'number' &&
                            element.bounds.x >= 0 && element.bounds.y >= 0 &&
                            element.bounds.width > 0 && element.bounds.height > 0) {
                            fallbackElements.push({
                                type: element.type || `unknown-element-${index}`,
                                bounds: element.bounds,
                                confidence: (typeof element.confidence === 'number' &&
                                    element.confidence >= 0 &&
                                    element.confidence <= 1)
                                    ? element.confidence
                                    : 0.5,
                                detected_structure: Array.isArray(element.detected_structure)
                                    ? element.detected_structure
                                    : [],
                                suggested_actions: Array.isArray(element.suggested_actions)
                                    ? element.suggested_actions
                                    : []
                            });
                        }
                        else {
                            warnings.push(`Skipping element ${index} due to invalid bounds`);
                        }
                    }
                });
            }
            warnings.push(`Extracted ${fallbackElements.length} valid elements from ${Array.isArray(data) ? data.length : 0} raw elements`);
            return { success: false, data: fallbackElements, warnings };
        }
        return { success: true, data: result.data, warnings };
    },
    comprehensive: (data) => {
        const result = exports.ComprehensiveResponseSchema.safeParse(data);
        const warnings = [];
        if (!result.success) {
            warnings.push(`Comprehensive parsing failed: ${result.error.message}`);
            // Try to parse route and elements separately
            const rawData = typeof data === 'object' && data !== null ? data : {};
            const routeResult = exports.parseWithWarnings.route(rawData.route);
            const elementsResult = exports.parseWithWarnings.elements(rawData.elements);
            warnings.push(...routeResult.warnings);
            warnings.push(...elementsResult.warnings);
            if (routeResult.data) {
                const fallbackData = {
                    route: routeResult.data,
                    elements: elementsResult.data
                };
                return { success: false, data: fallbackData, warnings };
            }
            return { success: false, warnings };
        }
        return { success: true, data: result.data, warnings };
    },
    focusedElement: (data) => {
        const result = exports.FocusedElementResponseSchema.safeParse(data);
        const warnings = [];
        if (!result.success) {
            warnings.push(`Focused element parsing failed: ${result.error.message}`);
            // Try to extract partial data with fallbacks
            const rawData = typeof data === 'object' && data !== null ? data : {};
            const fallbackData = {
                element: {
                    type: rawData.element?.type || 'unknown-element',
                    description: rawData.element?.description || 'Unknown UI element',
                    confidence: (typeof rawData.element?.confidence === 'number' &&
                        rawData.element?.confidence >= 0 &&
                        rawData.element?.confidence <= 1)
                        ? rawData.element.confidence
                        : 0.5,
                    detectedStructure: rawData.element?.detected_structure || {},
                    suggested_actions: Array.isArray(rawData.element?.suggested_actions)
                        ? rawData.element.suggested_actions
                        : ['View details', 'Click to interact'],
                    ehr_context: {
                        page_type: rawData.element?.ehr_context?.page_type || 'unknown-page',
                        likely_workflow: rawData.element?.ehr_context?.likely_workflow || 'General interaction'
                    }
                },
                context: {
                    appears_to_be: rawData.context?.appears_to_be || 'UI element',
                    ui_pattern: rawData.context?.ui_pattern || 'unknown',
                    confidence: (typeof rawData.context?.confidence === 'number' &&
                        rawData.context?.confidence >= 0 &&
                        rawData.context?.confidence <= 1)
                        ? rawData.context.confidence
                        : 0.5
                }
            };
            warnings.push(`Using fallback focused element data`);
            return { success: false, data: fallbackData, warnings };
        }
        return { success: true, data: result.data, warnings };
    }
};
//# sourceMappingURL=LensSchemas.js.map