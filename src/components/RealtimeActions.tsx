import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Zap, Target, Cpu } from "lucide-react"

interface DetectedAction {
  id: string
  label: string
  description: string
  confidence: number
}

interface RealtimeActionsProps {
  onActionExecute?: (actionId: string) => void
}

export const RealtimeActions: React.FC<RealtimeActionsProps> = ({ 
  onActionExecute 
}) => {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [detectedActions, setDetectedActions] = useState<DetectedAction[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Check initial monitoring state
    window.electronAPI.isMonitoring().then(setIsMonitoring)

    // Listen for detected actions
    const cleanup = window.electronAPI.onActionsDetected((actions) => {
      setDetectedActions(actions.filter(action => action.confidence > 0.7)) // Only show high-confidence actions
      setIsAnalyzing(false)
    })

    return cleanup
  }, [])

  const handleStartMonitoring = async () => {
    setIsStarting(true)
    try {
      const result = await window.electronAPI.startRealtimeMonitoring()
      if (result.success) {
        setIsMonitoring(true)
      } else {
        console.error("Failed to start monitoring:", result.error)
      }
    } catch (error) {
      console.error("Error starting monitoring:", error)
    }
    setIsStarting(false)
  }

  const handleStopMonitoring = async () => {
    try {
      const result = await window.electronAPI.stopRealtimeMonitoring()
      if (result.success) {
        setIsMonitoring(false)
        setDetectedActions([])
      } else {
        console.error("Failed to stop monitoring:", result.error)
      }
    } catch (error) {
      console.error("Error stopping monitoring:", error)
    }
  }

  const handleExecuteAction = async (actionId: string) => {
    try {
      const result = await window.electronAPI.executeAction(actionId)
      if (result.success) {
        console.log("Action executed successfully:", actionId)
        onActionExecute?.(actionId)
      } else {
        console.error("Failed to execute action:", result.error)
      }
    } catch (error) {
      console.error("Error executing action:", error)
    }
  }

  const handleAnalyzeScreen = async () => {
    if (!isMonitoring) {
      console.error("Cannot analyze screen - monitoring is not active")
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await window.electronAPI.analyzeCurrentScreen()
      if (result.success && result.actions) {
        setDetectedActions(result.actions.filter(action => action.confidence > 0.7))
      } else {
        console.error("Failed to analyze screen:", result.error)
        setDetectedActions([])
      }
    } catch (error) {
      console.error("Error analyzing screen:", error)
      setDetectedActions([])
    }
    setIsAnalyzing(false)
  }

  return (
    <>
      {!isExpanded ? (
        // Collapsed Dynamic Island
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setIsExpanded(true)}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '30px',
            padding: '12px 24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minHeight: '48px'
          }}
        >
          {!isMonitoring ? (
            <>
              <EyeOff 
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  color: '#9ca3af' 
                }} 
              />
              <span style={{ 
                color: '#d1d5db', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}>
                Inactive
              </span>
            </>
          ) : (
            <>
              <div style={{
                width: '8px',
                height: '8px', 
                backgroundColor: '#22c55e',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <Eye 
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  color: '#22c55e' 
                }} 
              />
              <span style={{ 
                color: '#22c55e', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}>
                Active
              </span>
              {detectedActions.length > 0 && (
                <div style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontWeight: '600'
                }}>
                  {detectedActions.length}
                </div>
              )}
            </>
          )}
        </motion.div>
      ) : (
        // Expanded Dynamic Island
        <motion.div
          initial={{ scale: 0.9, opacity: 0, borderRadius: "30px" }}
          animate={{ scale: 1, opacity: 1, borderRadius: "24px" }}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            width: '400px',
            maxHeight: '500px'
          }}
        >
          <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                color: 'white', 
                fontSize: '18px', 
                fontWeight: '600', 
                margin: 0 
              }}>
                AI Assistant
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.color = 'white'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#9ca3af'}
              >
                ×
              </button>
            </div>
            
            {/* Control Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '16px' 
            }}>
              {!isMonitoring ? (
                <button
                  onClick={handleStartMonitoring}
                  disabled={isStarting}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isStarting ? 'not-allowed' : 'pointer',
                    opacity: isStarting ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !isStarting && ((e.target as HTMLElement).style.backgroundColor = '#1d4ed8')}
                  onMouseLeave={(e) => !isStarting && ((e.target as HTMLElement).style.backgroundColor = '#2563eb')}
                >
                  {isStarting ? "Starting..." : "Start Monitoring"}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleStopMonitoring}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#dc2626'}
                  >
                    <EyeOff style={{ width: '16px', height: '16px' }} />
                    Stop
                  </button>
                  <button
                    onClick={handleAnalyzeScreen}
                    disabled={isAnalyzing}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#374151',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                      opacity: isAnalyzing ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => !isAnalyzing && ((e.target as HTMLElement).style.backgroundColor = '#4b5563')}
                    onMouseLeave={(e) => !isAnalyzing && ((e.target as HTMLElement).style.backgroundColor = '#374151')}
                  >
                    {isAnalyzing ? (
                      <Cpu style={{ width: '16px', height: '16px' }} />
                    ) : (
                      <Target style={{ width: '16px', height: '16px' }} />
                    )}
                    {isAnalyzing ? "Analyzing..." : "Analyze"}
                  </button>
                </>
              )}
            </div>
            
            {/* Status Indicator */}
            {isMonitoring && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                borderRadius: '12px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }} />
                <span style={{
                  color: '#22c55e',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Monitoring Active
                </span>
              </div>
            )}
            
            {/* Detected Actions */}
            {detectedActions.length > 0 && (
              <div style={{ 
                maxHeight: '256px', 
                overflowY: 'auto',
                marginBottom: '16px'
              }}>
                <h4 style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '0 0 8px 0'
                }}>
                  Available Actions
                </h4>
                {detectedActions.map((action) => (
                  <div
                    key={action.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      marginBottom: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.borderColor = 'rgba(59, 130, 246, 0.5)'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between' 
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {action.label}
                        </div>
                        <div style={{
                          color: '#9ca3af',
                          fontSize: '12px',
                          marginTop: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {action.description}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '8px'
                        }}>
                          <div style={{
                            flex: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            height: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              backgroundColor: '#3b82f6',
                              borderRadius: '4px',
                              width: `${action.confidence * 100}%`,
                              transition: 'width 1s ease-out'
                            }} />
                          </div>
                          <div style={{
                            color: '#9ca3af',
                            fontSize: '12px',
                            minWidth: '48px'
                          }}>
                            {Math.round(action.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleExecuteAction(action.id)}
                        style={{
                          marginLeft: '12px',
                          padding: '6px 12px',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#1d4ed8'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2563eb'}
                      >
                        <Zap style={{ width: '12px', height: '12px' }} />
                        Execute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty State */}
            {isMonitoring && detectedActions.length === 0 && !isAnalyzing && (
              <div style={{ 
                textAlign: 'center', 
                padding: '16px' 
              }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '8px'
                }}>
                  <Target style={{ 
                    width: '16px', 
                    height: '16px', 
                    color: '#9ca3af' 
                  }} />
                </div>
                <div style={{
                  color: '#9ca3af',
                  fontSize: '12px'
                }}>
                  Click "Analyze" to detect actionable elements
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  )
}