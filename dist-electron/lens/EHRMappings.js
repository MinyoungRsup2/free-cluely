"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.mappingHelpers = exports.promptGenerators = exports.ehrMappings = exports.athenaMapping = void 0;
// EHR mapping system using functional TypeScript patterns
const electron_1 = require("electron");
// Athena EHR Mapping
exports.athenaMapping = {
    name: 'athena',
    version: '1.0',
    pages: {
        'home-inbox': {
            id: 'home-inbox',
            name: 'Home Inbox',
            identifiers: {
                topLeft: 'Inbox',
                topCenter: 'Week of', // partial match for "Week of [date]"
            },
            elements: {
                appointment: {
                    type: 'appointment-row',
                    description: 'Patient appointment in schedule grid',
                    structure: {
                        time: {
                            description: 'time/duration',
                            position: 'left',
                            element_type: 'text',
                            details: 'HH:MM AM/PM format',
                            required: true
                        },
                        patient_name: {
                            description: 'patient name',
                            position: 'center',
                            element_type: 'text',
                            details: 'bold text formatting',
                            required: true
                        },
                        patient_dob: {
                            description: 'patient date of birth',
                            position: 'center',
                            element_type: 'text',
                            details: 'bold text formatting',
                            required: true
                        },
                        patient_phone: {
                            description: 'patient phone number',
                            position: 'center',
                            element_type: 'text',
                            details: 'bold text formatting',
                            required: true
                        },
                        appointment_type: {
                            description: 'appointment type',
                            position: 'center-right',
                            element_type: 'text',
                            details: 'regular text formatting',
                            required: true
                        }
                    },
                    actions: ['view-appointment', 'reschedule', 'cancel', 'add-note'],
                    confidence_threshold: 0.8
                }
            },
            context_hints: [
                'Grid layout with time slots',
                'Appointments displayed as horizontal rows',
                'Patient icons are small circular images',
                'Time format typically HH:MM AM/PM'
            ]
        },
        'patient-chart': {
            id: 'patient-chart',
            name: 'Patient Chart',
            identifiers: {
                topLeft: 'Patient',
                topCenter: '', // patient name usually here
            },
            elements: {
                'patient-header': {
                    type: 'patient-info',
                    description: 'Patient demographic header',
                    structure: {
                        patient_name: {
                            description: 'patient name',
                            position: 'top',
                            element_type: 'text',
                            details: 'large, bold text',
                            required: true
                        },
                        age_dob: {
                            description: 'age/date of birth',
                            position: 'center-left',
                            element_type: 'text',
                            details: 'age or MM/DD/YYYY format',
                            required: true
                        },
                        mrn: {
                            description: 'medical record number',
                            position: 'center',
                            element_type: 'text',
                            details: 'alphanumeric identifier',
                            required: true
                        },
                        insurance: {
                            description: 'insurance information',
                            position: 'center-right',
                            element_type: 'text',
                            details: 'insurance provider and plan',
                            required: false
                        }
                    },
                    actions: ['edit-demographics', 'view-history'],
                    confidence_threshold: 0.9
                },
                'nav-tabs': {
                    type: 'navigation-tabs',
                    description: 'Chart navigation tabs',
                    structure: {
                        summary_tab: {
                            description: 'Summary tab',
                            position: 'left',
                            element_type: 'button',
                            required: true
                        },
                        history_tab: {
                            description: 'History tab',
                            position: 'center-left',
                            element_type: 'button',
                            required: true
                        },
                        medications_tab: {
                            description: 'Medications tab',
                            position: 'center-right',
                            element_type: 'button',
                            required: true
                        },
                        orders_tab: {
                            description: 'Orders tab',
                            position: 'right',
                            element_type: 'button',
                            required: true
                        }
                    },
                    actions: ['switch-tab'],
                    confidence_threshold: 0.85
                }
            },
            context_hints: [
                'Patient information displayed prominently at top',
                'Tabbed navigation for different chart sections',
                'Grid-based layout with consistent spacing'
            ]
        }
    }
};
// All EHR mappings registry
exports.ehrMappings = {
    athena: exports.athenaMapping
};
exports.default = exports.ehrMappings;
// Remeda-powered prompt generation functions
exports.promptGenerators = {
    // Generate route detection prompt
    createRoutePrompt: (ehrSystem = 'athena') => {
        const mapping = exports.ehrMappings[ehrSystem];
        if (!mapping)
            return 'Analyze this EHR screenshot to determine the page type.';
        const pages = Object.values(mapping.pages);
        const pageDescriptions = pages
            .map(page => {
            const identifierEntries = Object.entries(page.identifiers)
                .filter(([_, value]) => value && value.trim().length > 0)
                .map(([position, text]) => `${position}: "${text}"`)
                .join(', ');
            return `- ${page.id} (${page.name}): Look for ${identifierEntries}`;
        })
            .join('\n');
        return `
Analyze this ${mapping.name} EHR screenshot and determine the page type.

Known ${mapping.name} pages:
${pageDescriptions}

Return JSON format:
{
  "type": "page-id",
  "ehrSystem": "${ehrSystem}",
  "confidence": 0.85,
  "identifiers_found": ["identifier1", "identifier2"]
}

Focus on text elements in top navigation areas and page titles.
    `.trim();
    },
    // Generate element detection prompt for specific page
    createElementPrompt: (pageId, ehrSystem = 'athena') => {
        const mapping = exports.ehrMappings[ehrSystem];
        const page = mapping?.pages[pageId];
        if (!page) {
            return `Analyze this EHR screenshot and identify clickable elements with their bounding boxes.`;
        }
        // Get screen dimension information
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const dimensionInfo = `
SCREEN DIMENSIONS:
- Screenshot resolution: ${primaryDisplay.size.width}x${primaryDisplay.size.height}
- Scale factor: ${primaryDisplay.scaleFactor}x
- Work area: ${primaryDisplay.workAreaSize.width}x${primaryDisplay.workAreaSize.height}
- Bounds: x=${primaryDisplay.bounds.x}, y=${primaryDisplay.bounds.y}, w=${primaryDisplay.bounds.width}, h=${primaryDisplay.bounds.height}

COORDINATE SYSTEM:
- Origin (0,0) is at top-left corner of the full screenshot
- X increases rightward, Y increases downward
- All coordinates should be in pixels relative to the screenshot
- Account for the ${primaryDisplay.scaleFactor}x scale factor when determining positions
- IMPORTANT: Browser content starts approximately 90px from the top due to browser chrome/toolbar
- When detecting elements, consider that the EHR interface begins around Y=90px in the screenshot
    `.trim();
        const elements = Object.values(page.elements);
        const elementDescriptions = elements
            .map(element => {
            const structureComponents = Object.entries(element.structure)
                .map(([key, component]) => `  ${key}: ${component.description}${component.position ? ` (${component.position})` : ''} - ${component.element_type}${component.required ? ' [required]' : ' [optional]'}${component.details ? ` - ${component.details}` : ''}`)
                .join('\n');
            const actionsText = element.actions.join(', ');
            return `
**${element.type}**: ${element.description}
Structure components:
${structureComponents}
Possible actions: ${actionsText}
Confidence threshold: ${element.confidence_threshold}
        `.trim();
        })
            .join('\n\n');
        const contextText = page.context_hints.join('\n- ');
        return `
Analyze this ${page.name} page from ${mapping.name} EHR.

${dimensionInfo}

Expected elements to detect:
${elementDescriptions}

Context hints:
- ${contextText}

For each element found, return JSON format:
{
  "type": "element-type",
  "bounds": {"x": 0, "y": 0, "width": 0, "height": 0},
  "confidence": 0.85,
  "detected_structure": {
    "component_key": {
      "text": "detected text content",
      "confidence": 0.9,
      "position_found": "actual position detected"
    }
  },
  "suggested_actions": ["action1", "action2"]
}

IMPORTANT: 
- Use "bounds" object with x, y, width, height properties (not "box" array)
- Coordinates must be accurate for the ${primaryDisplay.size.width}x${primaryDisplay.size.height} screenshot
- Account for ${primaryDisplay.scaleFactor}x scale factor in coordinate calculations
- "detected_structure" should be an object with keys matching the structure components defined above
- Each detected component should include: text content, confidence score, and actual position found
- Only include components you actually detect (don't include all possible components)
- Include "suggested_actions" field (not "actions")
- Return ONLY valid JSON without markdown formatting

Focus on the specific structural patterns described above.
Return as JSON array of elements.
    `.trim();
    },
    // Generate focused prompt for user-selected rectangle (E + drag functionality)
    createFocusedRectanglePrompt: (pageId, rectangle, ehrSystem = 'athena') => {
        const mapping = exports.ehrMappings[ehrSystem];
        const page = mapping?.pages[pageId];
        if (!page) {
            return `Analyze this cropped EHR interface section and identify the main element and possible actions.
      
Return JSON format:
{
  "element": {
    "type": "detected-element-type",
    "description": "what this element appears to be",
    "confidence": 0.85,
    "detected_structure": {
      "component_key": {
        "text": "detected text content",
        "confidence": 0.9,
        "position_found": "actual position detected"
      }
    },
    "suggested_actions": ["action1", "action2", "action3"]
  },
  "context": {
    "appears_to_be": "brief description of what this section represents",
    "ui_pattern": "description of UI pattern (card, form, button, etc.)"
  }
}`;
        }
        // Get relevant elements that might appear in this type of page
        const relevantElements = Object.values(page.elements);
        const contextHints = page.context_hints.join('\n- ');
        const elementDescriptions = relevantElements
            .map(element => {
            const structureComponents = Object.entries(element.structure)
                .map(([key, component]) => `  ${key}: ${component.description}${component.position ? ` (${component.position})` : ''} - ${component.element_type}${component.required ? ' [required]' : ' [optional]'}${component.details ? ` - ${component.details}` : ''}`)
                .join('\n');
            const actionsText = element.actions.join(', ');
            return `
**${element.type}**: ${element.description}
Structure components:
${structureComponents}
Possible actions: ${actionsText}
Confidence threshold: ${element.confidence_threshold}
        `.trim();
        })
            .join('\n\n');
        console.log('JSON.stringify(elementDescriptions, null, 2))', JSON.stringify(elementDescriptions, null, 4));
        return `
Analyze this cropped section from ${page.name} page in ${mapping.name} EHR.

SELECTION CONTEXT:
- Rectangle selected: ${rectangle.width}x${rectangle.height} pixels
- This is a focused area the user specifically chose
- Image shows only the content within the selected rectangle

Expected structure to detect:
${elementDescriptions}

PAGE CONTEXT HINTS:
- ${contextHints}

Your task: Identify the main element in this cropped selection and provide contextual actions.

Return JSON format:
{
  "element": {
    "type": "detected-element-type",
    "description": "what this element appears to be",
    "confidence": 0.85,
    "detected_structure": {
      "component_key": {
        "text": "detected text content",
        "confidence": 0.9,
        "position_found": "actual position detected"
      }
    },
    "suggested_actions": ["action1", "action2", "action3"],
    "ehr_context": {
      "page_type": "${pageId}",
      "likely_workflow": "what the user might want to do with this element"
    }
  },
  "context": {
    "appears_to_be": "brief description of what this section represents",
    "ui_pattern": "card|form|button|navigation|data_display|input_form",
    "confidence": 0.85
  }
}

IMPORTANT:
- Please try to identify all of the structures present in the structure description
- Suggest actions relevant to typical EHR workflows
- Consider this is ${page.name} context when suggesting actions
- Return ONLY valid JSON without markdown formatting
    `.trim();
    },
    // Generate comprehensive prompt (route + elements in one call)
    createComprehensivePrompt: (ehrSystem = 'athena') => {
        const mapping = exports.ehrMappings[ehrSystem];
        if (!mapping)
            return 'Analyze this EHR screenshot.';
        // Get screen dimension information
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const dimensionInfo = `
SCREEN DIMENSIONS:
- Screenshot resolution: ${primaryDisplay.size.width}x${primaryDisplay.size.height}
- Scale factor: ${primaryDisplay.scaleFactor}x
- Work area: ${primaryDisplay.workAreaSize.width}x${primaryDisplay.workAreaSize.height}
- Bounds: x=${primaryDisplay.bounds.x}, y=${primaryDisplay.bounds.y}, w=${primaryDisplay.bounds.width}, h=${primaryDisplay.bounds.height}

COORDINATE SYSTEM:
- Origin (0,0) is at top-left corner of the full screenshot
- X increases rightward, Y increases downward
- All coordinates should be in pixels relative to the screenshot
- Account for the ${primaryDisplay.scaleFactor}x scale factor when determining positions
- IMPORTANT: Browser content starts approximately 90px from the top due to browser chrome/toolbar
- When detecting elements, consider that the EHR interface begins around Y=90px in the screenshot
    `.trim();
        const routePrompt = exports.promptGenerators.createRoutePrompt(ehrSystem);
        return `
${routePrompt}

${dimensionInfo}

After determining the page type, also identify relevant elements for that page type.
Return JSON format:
{
  "route": {
    "type": "page-id",
    "ehrSystem": "${ehrSystem}",
    "confidence": 0.85
  },
  "elements": [
    {
      "type": "element-type",
      "bounds": {"x": 0, "y": 0, "width": 0, "height": 0},
      "confidence": 0.85,
      "detected_structure": {
        "component_key": {
          "text": "detected text content",
          "confidence": 0.9,
          "position_found": "actual position detected"
        }
      },
      "suggested_actions": ["action1", "action2"]
    }
  ]
}

IMPORTANT:
- Use "bounds" object with x, y, width, height properties (not "box" array)
- Coordinates must be accurate for the ${primaryDisplay.size.width}x${primaryDisplay.size.height} screenshot
- Account for ${primaryDisplay.scaleFactor}x scale factor in coordinate calculations
- "detected_structure" should be an object with keys matching the structure components
- Each detected component should include: text content, confidence score, and actual position found
- Only include components you actually detect (don't include all possible components)
- Include "suggested_actions" field (not "actions") 
- Return ONLY valid JSON without markdown formatting
    `.trim();
    }
};
// Helper functions using Remeda
exports.mappingHelpers = {
    // Get all page IDs for an EHR
    getPageIds: (ehrSystem) => Object.keys(exports.ehrMappings[ehrSystem]?.pages ?? {}),
    // Get all element types for a page
    getElementTypes: (pageId, ehrSystem = 'athena') => {
        const elements = exports.ehrMappings[ehrSystem]?.pages[pageId]?.elements ?? {};
        return Object.values(elements).map(el => el.type);
    },
    // Get actions for specific element type
    getElementActions: (pageId, elementType, ehrSystem = 'athena') => {
        const page = exports.ehrMappings[ehrSystem]?.pages[pageId];
        const elements = Object.values(page?.elements ?? {});
        const element = elements.find(el => el.type === elementType);
        return element?.actions ?? [];
    },
    // Check if page identifiers match
    matchesPageIdentifiers: (identifiers, pageId, ehrSystem = 'athena') => {
        const page = exports.ehrMappings[ehrSystem]?.pages[pageId];
        if (!page)
            return false;
        const requiredIdentifiers = page.identifiers;
        const entries = Object.entries(requiredIdentifiers)
            .filter(([_, value]) => value && value.trim().length > 0);
        return entries.every(([position, expectedText]) => {
            const actualText = identifiers[position];
            return actualText?.includes(expectedText) ?? false;
        });
    }
};
//# sourceMappingURL=EHRMappings.js.map