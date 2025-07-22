import { z } from 'zod'

// Zod schemas for safe AI response parsing
export const RouteResponseSchema = z.object({
  type: z.string().min(1, 'Route type is required'),
  ehrSystem: z.enum(['athena', 'unknown'], {
    errorMap: () => ({ message: 'EHR system must be athena or unknown' })
  }),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  identifiers_found: z.array(z.string()).optional()
})

export const BoundsSchema = z.object({
  x: z.number().min(0, 'X coordinate must be non-negative'),
  y: z.number().min(0, 'Y coordinate must be non-negative'),
  width: z.number().min(1, 'Width must be positive'),
  height: z.number().min(1, 'Height must be positive')
})

// Alternative bounds formats that AI might return
const BoundsArraySchema = z.array(z.number()).length(4).transform((arr) => ({
  x: arr[0],
  y: arr[1], 
  width: arr[2] - arr[0],
  height: arr[3] - arr[1]
}))

export const ElementResponseSchema = z.object({
  type: z.string().min(1, 'Element type is required'),
  bounds: BoundsSchema.optional(),
  box: BoundsArraySchema.optional(), // Handle AI returning "box" array
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  detected_structure: z.array(z.string()).optional(),
  suggested_actions: z.array(z.string()).optional(),
  actions: z.array(z.string()).optional() // Handle AI returning "actions" instead
}).transform((data) => ({
  type: data.type,
  bounds: data.bounds || data.box || { x: 0, y: 0, width: 0, height: 0 },
  confidence: data.confidence,
  detected_structure: data.detected_structure || [],
  suggested_actions: data.suggested_actions || data.actions || []
}))

export const ElementsArraySchema = z.array(ElementResponseSchema)

export const ComprehensiveResponseSchema = z.object({
  route: RouteResponseSchema,
  elements: ElementsArraySchema.optional().default([])
})

// Safe parsing utilities with warning messages
export const parseWithWarnings = {
  
  route: (data: unknown): { success: boolean; data?: z.infer<typeof RouteResponseSchema>; warnings: string[] } => {
    const result = RouteResponseSchema.safeParse(data)
    const warnings: string[] = []
    
    if (!result.success) {
      warnings.push(`Route parsing failed: ${result.error.message}`)
      
      // Try to extract partial data with defaults
      const partialData = typeof data === 'object' && data !== null ? data as any : {}
      
      const fallbackRoute = {
        type: partialData.type || 'unknown-page',
        ehrSystem: (['athena', 'unknown'].includes(partialData.ehrSystem)) 
          ? partialData.ehrSystem 
          : 'unknown' as const,
        confidence: (typeof partialData.confidence === 'number' && 
                    partialData.confidence >= 0 && 
                    partialData.confidence <= 1) 
          ? partialData.confidence 
          : 0.5,
        identifiers_found: Array.isArray(partialData.identifiers_found) 
          ? partialData.identifiers_found 
          : []
      }
      
      warnings.push(`Using fallback route data: ${JSON.stringify(fallbackRoute)}`)
      return { success: false, data: fallbackRoute, warnings }
    }
    
    return { success: true, data: result.data, warnings }
  },

  elements: (data: unknown): { success: boolean; data: z.infer<typeof ElementsArraySchema>; warnings: string[] } => {
    const result = ElementsArraySchema.safeParse(data)
    const warnings: string[] = []
    
    if (!result.success) {
      warnings.push(`Elements parsing failed: ${result.error.message}`)
      
      // Try to extract partial elements
      const fallbackElements: z.infer<typeof ElementsArraySchema> = []
      
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const element = item as any
            
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
              })
            } else {
              warnings.push(`Skipping element ${index} due to invalid bounds`)
            }
          }
        })
      }
      
      warnings.push(`Extracted ${fallbackElements.length} valid elements from ${Array.isArray(data) ? data.length : 0} raw elements`)
      return { success: false, data: fallbackElements, warnings }
    }
    
    return { success: true, data: result.data, warnings }
  },

  comprehensive: (data: unknown): { 
    success: boolean; 
    data?: z.infer<typeof ComprehensiveResponseSchema>; 
    warnings: string[] 
  } => {
    const result = ComprehensiveResponseSchema.safeParse(data)
    const warnings: string[] = []
    
    if (!result.success) {
      warnings.push(`Comprehensive parsing failed: ${result.error.message}`)
      
      // Try to parse route and elements separately
      const rawData = typeof data === 'object' && data !== null ? data as any : {}
      
      const routeResult = parseWithWarnings.route(rawData.route)
      const elementsResult = parseWithWarnings.elements(rawData.elements)
      
      warnings.push(...routeResult.warnings)
      warnings.push(...elementsResult.warnings)
      
      if (routeResult.data) {
        const fallbackData = {
          route: routeResult.data,
          elements: elementsResult.data
        }
        
        return { success: false, data: fallbackData, warnings }
      }
      
      return { success: false, warnings }
    }
    
    return { success: true, data: result.data, warnings }
  }
}

// Type exports
export type RouteResponse = z.infer<typeof RouteResponseSchema>
export type ElementResponse = z.infer<typeof ElementResponseSchema>
export type ElementsArray = z.infer<typeof ElementsArraySchema>
export type ComprehensiveResponse = z.infer<typeof ComprehensiveResponseSchema>