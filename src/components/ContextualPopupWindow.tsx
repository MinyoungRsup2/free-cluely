import React, { useEffect, useState } from 'react'
import { ContextualPopup } from './ContextualPopup'

// This component is used when ContextualPopup is rendered in its own window
export const ContextualPopupWindow: React.FC = () => {
  const [popupData, setPopupData] = useState<any>(null)

  useEffect(() => {
    // Listen for popup data from the main process
    const unsubscribe = window.electronAPI.onContextualPopupData((data) => {
      console.log('📊 Contextual popup data received:', data)
      setPopupData(data)
    })

    // Listen for action responses
    const unsubscribeAction = window.electronAPI.onContextualPopupAction((action) => {
      console.log('🎯 Action received in popup window:', action)
      // Handle any specific actions if needed
    })

    return () => {
      unsubscribe()
      unsubscribeAction()
    }
  }, [])

  const handleClose = () => {
    console.log('🗑️ Closing contextual popup')
    window.electronAPI.sendContextualPopupClose()
  }

  const handleActionClick = (action: string) => {
    console.log('🎬 Sending action from popup:', action)
    window.electronAPI.sendContextualPopupAction(action)
    // Close the popup after action
    handleClose()
  }

  if (!popupData) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <div className="text-white/50">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-transparent">
      <ContextualPopup
        data={popupData}
        onClose={handleClose}
        onActionClick={handleActionClick}
        position={{ x: 0, y: 0 }} // Position is handled by the window itself
      />
    </div>
  )
}