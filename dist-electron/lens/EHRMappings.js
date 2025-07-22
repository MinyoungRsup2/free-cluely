"use strict";
// EHR mapping system using functional TypeScript patterns
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.mappingHelpers = exports.promptGenerators = exports.ehrMappings = exports.athenaMapping = void 0;
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
                    structure: [
                        'time/duration (left)',
                        'patient icon (small circular)',
                        'patient name (bold text)',
                        'appointment type (regular text)'
                    ],
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
                    structure: [
                        'patient name (large, bold)',
                        'age/DOB',
                        'MRN (medical record number)',
                        'insurance info'
                    ],
                    actions: ['edit-demographics', 'view-history'],
                    confidence_threshold: 0.9
                },
                'nav-tabs': {
                    type: 'navigation-tabs',
                    description: 'Chart navigation tabs',
                    structure: [
                        'Summary tab',
                        'History tab',
                        'Medications tab',
                        'Orders tab'
                    ],
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
        const elements = Object.values(page.elements);
        const elementDescriptions = elements
            .map(element => {
            const structureText = element.structure.join(', ');
            const actionsText = element.actions.join(', ');
            return `
**${element.type}**: ${element.description}
Structure: ${structureText}
Possible actions: ${actionsText}
Confidence threshold: ${element.confidence_threshold}
        `.trim();
        })
            .join('\n\n');
        const contextText = page.context_hints.join('\n- ');
        return `
Analyze this ${page.name} page from ${mapping.name} EHR.

Expected elements to detect:
${elementDescriptions}

Context hints:
- ${contextText}

For each element found, return JSON format:
{
  "type": "element-type",
  "bounds": {"x": 0, "y": 0, "width": 0, "height": 0},
  "confidence": 0.85,
  "detected_structure": ["item1", "item2"],
  "suggested_actions": ["action1", "action2"]
}

IMPORTANT: 
- Use "bounds" object with x, y, width, height properties (not "box" array)
- Include "suggested_actions" field (not "actions")
- Return ONLY valid JSON without markdown formatting

Focus on the specific structural patterns described above.
Return as JSON array of elements.
    `.trim();
    },
    // Generate comprehensive prompt (route + elements in one call)
    createComprehensivePrompt: (ehrSystem = 'athena') => {
        const mapping = exports.ehrMappings[ehrSystem];
        if (!mapping)
            return 'Analyze this EHR screenshot.';
        const routePrompt = exports.promptGenerators.createRoutePrompt(ehrSystem);
        return `
${routePrompt}

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
      "detected_structure": ["item1", "item2"],
      "suggested_actions": ["action1", "action2"]
    }
  ]
}

IMPORTANT:
- Use "bounds" object with x, y, width, height properties (not "box" array)
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