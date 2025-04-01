import type { VerificationResult } from "@/types"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, XCircle, Loader2 } from "lucide-react"

interface EmailValidationTooltipProps {
  show: boolean
  isValidating: boolean
  result: VerificationResult | null
  error: string | null
  className?: string
}

export const EmailValidationTooltip = ({
  show,
  isValidating,
  result,
  error,
  className,
}: EmailValidationTooltipProps) => {
  if (!show) return null

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getStatusIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
    }

    if (error) {
      return <AlertCircle className="h-5 w-5 text-red-400" />
    }

    if (!result) {
      return null
    }

    if (result.isTempEmail) {
      return <XCircle className="h-5 w-5 text-red-400" />
    }

    return <CheckCircle className="h-5 w-5 text-green-400" />
  }

  const getStatusText = () => {
    if (isValidating) {
      return "Validating email..."
    }

    if (error) {
      return error
    }

    if (!result) {
      return "Enter a valid email address"
    }

    if (result.isTempEmail) {
      return "Temporary email detected"
    }

    return "Valid email address"
  }

  return (
    <div className={cn("absolute z-50 w-72 p-3 bg-background shadow-lg rounded-lg border border-border", className)}>
      <div className="flex items-center gap-2 mb-2">
        {getStatusIcon()}
        <span className="font-medium">{getStatusText()}</span>
      </div>

      {result && !error && !isValidating && (
        <>
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium">Trust Score</span>
              <span className="text-xs font-medium">{result.trustScore}%</span>
            </div>
            <Progress value={result.trustScore} className={cn("h-2", getTrustScoreColor(result.trustScore))} />
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Domain Age:</span>
              <span>{result.domainAge}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">MX Records:</span>
              <span>{result.hasMxRecords ? "Valid" : "Invalid"}</span>
            </div>
            {result.patternMatch && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pattern Match:</span>
                <span>{result.patternMatch}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

