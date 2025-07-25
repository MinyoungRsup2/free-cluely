import React from 'react'
import { X, Target, Zap, Info } from 'lucide-react'

interface FocusedElementResponse {
  element: {
    type: string
    description: string
    confidence: number
    detected_structure: {
      [key: string]: {
        text: string
        confidence: number
        position_found?: string // Optional field for actual position detected
      }
    }
    suggested_actions: string[]
    ehr_context?: {
      page_type: string
      likely_workflow?: string
    }
  }
  context: {
    appears_to_be: string
    ui_pattern: string
    confidence?: number
  }
}

interface ContextualPopupProps {
  data: FocusedElementResponse
  onClose: () => void
  onActionClick: (action: string) => void
  position: { x: number; y: number }
}

export const ContextualPopup: React.FC<ContextualPopupProps> = ({
  data,
  onClose,
  onActionClick,
  position
}) => {
  const { element, context } = data

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getActionIcon = (action: string) => {
    const lowerAction = action.toLowerCase()
    if (lowerAction.includes('click') || lowerAction.includes('select')) return <Target className="w-4 h-4" />
    if (lowerAction.includes('view') || lowerAction.includes('open')) return <Info className="w-4 h-4" />
    return <Zap className="w-4 h-4" />
  }

  console.log('🔍 ContextualPopup data:', data)

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-96 overflow-y-auto"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 400),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <h3 className="font-semibold text-gray-900 truncate">{element.type}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Element Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Element</span>
            <span className={`text-xs font-medium ${getConfidenceColor(element.confidence)}`}>
              {Math.round(element.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-sm text-gray-600">{element.description}</p>
        </div>

        {/* Detected structure */}
        {Object.keys(element.detected_structure).length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-700 block mb-2">Detected Content</span>
            <div className="bg-gray-50 p-3 rounded border">
              {Object.entries(element.detected_structure).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <div className="text-sm font-medium text-gray-900">{value.text}</div>
                  <div className="text-xs text-gray-600">Confidence: {Math.round(value.confidence * 100)}%</div>
                  {value.position_found && (
                    <div className="text-xs text-gray-500">Position: {value.position_found}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Context Information */}
        <div>
          <span className="text-sm font-medium text-gray-700 block mb-2">Context</span>
          <div className="space-y-1">
            <div className="text-sm text-gray-600">{context.appears_to_be}</div>
            <div className="text-xs text-gray-500">Pattern: {context.ui_pattern}</div>
            {element.ehr_context?.likely_workflow && (
              <div className="text-xs text-blue-600">Workflow: {element.ehr_context.likely_workflow}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div>
          <span className="text-sm font-medium text-gray-700 block mb-3">Suggested Actions</span>
          <div className="space-y-2">
            {element.suggested_actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onActionClick(action)}
                className="w-full flex items-center space-x-3 p-3 text-left hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors group"
              >
                <div className="flex-shrink-0 text-gray-500 group-hover:text-blue-600">
                  {getActionIcon(action)}
                </div>
                <span className="text-sm text-gray-700 group-hover:text-blue-900">
                  {action}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>EHR Assistant</span>
          {element.ehr_context?.page_type && (
            <span>{element.ehr_context.page_type}</span>
          )}
        </div>
      </div>
    </div>
  )
}