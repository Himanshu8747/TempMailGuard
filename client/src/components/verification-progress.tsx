import type React from "react"
import { useState, useEffect } from "react"
import { Loader2, Check, X, AlertTriangle, Database, CircleOff, Search, Users, BarChart3, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

type VerificationStep = {
  id: string
  name: string
  description: string
  status: "idle" | "loading" | "success" | "error"
  icon: React.ReactNode
}

type VerificationProgressProps = {
  isValidating: boolean
  email: string
  result: any
  className?: string
}

export const VerificationProgress = ({ isValidating, email, result, className = "" }: VerificationProgressProps) => {
  const [steps, setSteps] = useState<VerificationStep[]>([
    {
      id: "format",
      name: "Email Format",
      description: "Validating email format",
      status: "idle",
      icon: <Search className="h-4 w-4" />,
    },
    {
      id: "domain",
      name: "Domain Check",
      description: "Checking domain against known temporary email lists",
      status: "idle",
      icon: <Database className="h-4 w-4" />,
    },
    {
      id: "pattern",
      name: "Pattern Analysis",
      description: "Analyzing email for suspicious patterns",
      status: "idle",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      id: "dns",
      name: "DNS Records",
      description: "Verifying MX records and domain age information",
      status: "idle",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      id: "ai",
      name: "AI Analysis",
      description: "Using machine learning to identify suspicious patterns",
      status: "idle",
      icon: <CircleOff className="h-4 w-4" />,
    },
    {
      id: "crowdsource",
      name: "Crowdsourced Reputation",
      description: "Checking our community-reported database",
      status: "idle",
      icon: <Users className="h-4 w-4" />,
    },
  ])

  const [progress, setProgress] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [animationComplete, setAnimationComplete] = useState(false)

  // Reset animation when a new validation starts
  useEffect(() => {
    if (isValidating) {
      setSteps(steps.map((step) => ({ ...step, status: "idle" })))
      setProgress(0)
      setCurrentStepIndex(0)
      setAnimationComplete(false)
    }
  }, [isValidating, email])

  // Animation logic
  useEffect(() => {
    if (!isValidating || animationComplete) return

    const stepInterval = 300 // Time between steps
    const stepCompletionTime = 800 // Time to complete a step

    // Run the animation sequence
    const animateStep = (index: number) => {
      // Update the current step to loading
      setSteps((prevSteps) => prevSteps.map((step, i) => (i === index ? { ...step, status: "loading" } : step)))
      setCurrentStepIndex(index)

      // Increment progress
      const baseProgress = (index / steps.length) * 100
      const animationDuration = stepCompletionTime
      const startTime = Date.now()

      const updateProgress = () => {
        const elapsed = Date.now() - startTime
        const ratio = Math.min(elapsed / animationDuration, 1)
        const stepProgress = (1 / steps.length) * 100 * ratio
        setProgress(baseProgress + stepProgress)

        if (ratio < 1) {
          requestAnimationFrame(updateProgress)
        } else {
          // Step completed
          let newStatus: "success" | "error" = "success"

          // Add logic to determine success/error based on result and step
          if (result) {
            switch (steps[index].id) {
              case "domain":
                newStatus = result.isTempEmail ? "error" : "success"
                break
              case "pattern":
                newStatus = result.patternMatch !== "No suspicious patterns" ? "error" : "success"
                break
              case "dns":
                newStatus = result.hasMxRecords ? "success" : "error"
                break
              default:
                newStatus = "success"
            }
          }

          // Mark the step as complete
          setSteps((prevSteps) => prevSteps.map((step, i) => (i === index ? { ...step, status: newStatus } : step)))

          // Move to the next step or finish
          if (index < steps.length - 1) {
            setTimeout(() => animateStep(index + 1), stepInterval)
          } else {
            setAnimationComplete(true)
          }
        }
      }

      requestAnimationFrame(updateProgress)
    }

    // Start the animation
    if (isValidating && !animationComplete) {
      setTimeout(() => animateStep(0), 300)
    }
  }, [isValidating, steps, result, animationComplete])

  // Update steps based on result when animation is complete
  useEffect(() => {
    if (result && animationComplete) {
      setSteps((prevSteps) =>
        prevSteps.map((step) => {
          switch (step.id) {
            case "format":
              return { ...step, status: "success" }
            case "domain":
              return { ...step, status: result.isTempEmail ? "error" : "success" }
            case "pattern":
              return { ...step, status: result.patternMatch !== "No suspicious patterns" ? "error" : "success" }
            case "dns":
              return { ...step, status: result.hasMxRecords ? "success" : "error" }
            case "ai":
              return { ...step, status: result.trustScore > 70 ? "success" : "error" }
            case "crowdsource":
              // If we have reputation data, use it to determine status
              if (result.reputationData && result.reputationData.reportType) {
                const reportType = result.reputationData.reportType
                return {
                  ...step,
                  status: reportType === "legitimate" ? "success" : "error",
                  description: `${result.reputationData.totalReports || 0} community reports available`,
                }
              } else {
                return {
                  ...step,
                  status: "success",
                  description: "No community reports available yet",
                }
              }
            default:
              return step
          }
        }),
      )
    }
  }, [result, animationComplete])

  // Helper function to get appropriate icon
  const getStepIcon = (step: VerificationStep) => {
    switch (step.status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "success":
        return <Check className="h-4 w-4 text-green-400" />
      case "error":
        return <X className="h-4 w-4 text-red-400" />
      case "idle":
      default:
        return <div className="h-4 w-4 rounded-full bg-muted"></div>
    }
  }

  // Show visual cue for current status
  const getStatusDescription = () => {
    if (isValidating && !animationComplete) {
      return "Verification in progress..."
    }

    if (result) {
      return result.isTempEmail
        ? "This appears to be a temporary email address."
        : "This email appears to be legitimate."
    }

    return "Ready for verification"
  }

  const getStatusIcon = () => {
    if (isValidating && !animationComplete) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
    }

    if (result) {
      return result.isTempEmail ? (
        <AlertTriangle className="h-5 w-5 text-amber-400" />
      ) : (
        <Check className="h-5 w-5 text-green-400" />
      )
    }

    return null
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="mb-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mb-1">
            {getStatusIcon()}
            <span className="font-medium">{getStatusDescription()}</span>

            {isValidating && !animationComplete && (
              <Badge variant="outline" className="ml-auto text-xs bg-blue-950/30 text-blue-300 border-blue-800">
                {Math.round(progress)}% Complete
              </Badge>
            )}

            {result && animationComplete && result.isTempEmail && (
              <Badge variant="outline" className="ml-auto text-xs bg-amber-950/30 text-amber-300 border-amber-800">
                Temporary Email Detected
              </Badge>
            )}

            {result && animationComplete && !result.isTempEmail && (
              <Badge variant="outline" className="ml-auto text-xs bg-green-950/30 text-green-300 border-green-800">
                Verification Complete
              </Badge>
            )}
          </motion.div>

          <motion.div initial={{ width: "0%" }} animate={{ width: `${progress}%` }} transition={{ ease: "easeInOut" }}>
            <Progress value={progress} className="h-2 mb-4" />
          </motion.div>
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0.5, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: currentStepIndex === index && isValidating ? 1.02 : 1,
              }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-3 p-2.5 rounded-md transition-all ${
                currentStepIndex === index && isValidating
                  ? "bg-blue-950/20 shadow-sm"
                  : step.status === "error"
                    ? "bg-red-950/20"
                    : step.status === "success"
                      ? "bg-green-950/20"
                      : ""
              }`}
            >
              <div className="mt-0.5">{getStepIcon(step)}</div>
              <div className="flex-1">
                <div className="font-medium">{step.name}</div>
                <div className="text-sm text-muted-foreground">{step.description}</div>

                {step.id === "crowdsource" && step.status === "error" && result?.reputationData && (
                  <Badge className="mt-1" variant="outline">
                    Reported as {result.reputationData.reportType}
                  </Badge>
                )}
              </div>

              {step.status === "success" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                >
                  <Badge variant="outline" className="bg-green-950/30 text-green-300 border-green-800">
                    Passed
                  </Badge>
                </motion.div>
              )}

              {step.status === "error" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                >
                  <Badge variant="outline" className="bg-red-950/30 text-red-300 border-red-800">
                    Failed
                  </Badge>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {result && animationComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 pt-3 border-t border-border"
          >
            <div className="flex justify-between mb-1">
              <div className="text-sm font-medium">Trust Score</div>
              <div
                className={`font-semibold ${
                  result.trustScore > 70 ? "text-green-400" : result.trustScore > 40 ? "text-amber-400" : "text-red-400"
                }`}
              >
                {result.trustScore}/100
              </div>
            </div>

            <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.6, duration: 0.5 }}>
              <Progress
                value={result.trustScore}
                className={`h-2 ${
                  result.trustScore > 70
                    ? "[&>div]:bg-green-500"
                    : result.trustScore > 40
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-red-500"
                }`}
              />
            </motion.div>

            {result.reputationData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-3 text-sm"
              >
                <Separator className="my-2" />
                <div className="font-medium mb-1">Community Feedback</div>
                {result.reputationData.totalReports > 0 ? (
                  <div className="text-muted-foreground">
                    This email has been reported {result.reputationData.totalReports} times as{" "}
                    {result.reputationData.reportType}.
                  </div>
                ) : (
                  <div className="text-muted-foreground">No community reports available yet.</div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

