import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "react-query"
import {

  ToastVariant,
  ToastMessage
} from "../components/ui/toast"
import { RealtimeActions } from "../components/RealtimeActions"

interface QueueProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
}

const Queue: React.FC<QueueProps> = ({ setView }) => {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const { data: screenshots = [], refetch } = useQuery<Array<{ path: string; preview: string }>, Error>(
    ["screenshots"],
    async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
        return []
      }
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: true,
      refetchOnMount: true
    }
  )

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch()
      } else {
        console.error("Failed to delete screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
    }
  }

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onSolutionError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your screenshots.",
          "error"
        )
        setView("queue")
        console.error("Processing error:", error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      }),
      window.electronAPI.onActionExecuted((data) => {
        if (data.error) {
          showToast("Action Failed", data.error, "error")
          alert(`Action Failed: ${data.error}`)
        } else if (data.detectedName) {
          showToast("Patient Detected", `Patient: ${data.detectedName}`, "success")
          console.log("Patient data:", data)
          
          // Build alert message with all available data
          let alertMessage = `Patient Data Extracted:\n\n${data.detectedName}`
          
          if (data.patientId) {
            alertMessage += `\n\nPatient ID: ${data.patientId}`
          }
          
          if (data.consumerData) {
            alertMessage += `\n\nConsumer Data: ${JSON.stringify(data.consumerData, null, 2)}`
            
            // Check if consumer was found and navigation happened
            if (data.consumerData.findFirstConsumer?.id) {
              alertMessage += `\n\n🚀 Navigated to Companion URL for Consumer ID: ${data.consumerData.findFirstConsumer.id}`
            }
          }
          
          alertMessage += `\n\nTimestamp: ${data.timestamp}`
          
          alert(alertMessage)
        }
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  const handleActionExecute = (actionId: string) => {
    console.log("Patient extraction action executed:", actionId)
    showToast("Extracting Patient", "Analyzing Athena EHR for patient information...", "neutral")
  }

  return (
    <div ref={contentRef} className="bg-transparent w-fit flex p-4">
      <RealtimeActions onActionExecute={handleActionExecute} />
    </div>
  )
}

export default Queue
