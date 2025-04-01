import type React from "react"
import { useRef, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { cn } from "@/lib/utils"
import { Search, AlertCircle, CheckCircle, XCircle, Loader2, X } from "lucide-react"
import type { VerificationResult } from "@/types"

interface EmailCheckerProps {
  className?: string
}

const EmailChecker = ({ className }: EmailCheckerProps) => {
  const [email, setEmail] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<VerificationResult | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // This useEffect will fire whenever the user pastes into the input field
  useEffect(() => {
    const handlePaste = () => {
      // Small delay to ensure the pasted content is available
      setTimeout(() => {
        if (inputRef.current && inputRef.current.value) {
          setEmail(inputRef.current.value)
        }
      }, 0)
    }

    const inputElement = inputRef.current
    if (inputElement) {
      inputElement.addEventListener("paste", handlePaste)
      return () => {
        inputElement.removeEventListener("paste", handlePaste)
      }
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes("@")) return

    setIsValidating(true)
    setValidationError(null)

    try {
      const response = await apiRequest(`/api/verify?email=${encodeURIComponent(email)}`)
      const result = await response.json()
      setValidationResult(result)

      // Invalidate stats and recent verifications cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
      queryClient.invalidateQueries({ queryKey: ["/api/recent-verifications"] })
    } catch (error) {
      console.error("Email validation error:", error)
      setValidationError(error instanceof Error ? error.message : "Failed to validate email")
    } finally {
      setIsValidating(false)
    }
  }

  const getInputStatus = () => {
    if (isValidating) return "validating"
    if (validationError) return "error"
    if (validationResult?.isTempEmail) return "temp"
    if (validationResult) return "valid"
    return "default"
  }

  const inputStatus = getInputStatus()

  const getResultDisplay = () => {
    if (isValidating) {
      return (
        <div className="flex items-center gap-2 p-3 bg-blue-950/30 text-blue-300 rounded-md mt-4 border border-blue-800/50">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Validating email address...</span>
        </div>
      )
    }

    if (validationError) {
      return (
        <div className="flex items-center gap-2 p-3 bg-red-950/30 text-red-300 rounded-md mt-4 border border-red-800/50">
          <AlertCircle className="h-5 w-5" />
          <span>{validationError}</span>
        </div>
      )
    }

    if (validationResult) {
      if (validationResult.isTempEmail) {
        return (
          <div className="flex flex-col gap-2 p-3 bg-red-950/30 text-red-300 rounded-md mt-4 border border-red-800/50">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              <span className="font-semibold">Temporary/disposable email detected</span>
            </div>
            <div className="text-sm space-y-1 ml-7">
              <div className="flex justify-between">
                <span>Trust Score:</span>
                <span>{validationResult.trustScore}%</span>
              </div>
              <div className="flex justify-between">
                <span>Domain Age:</span>
                <span>{validationResult.domainAge}</span>
              </div>
              <div className="flex justify-between">
                <span>MX Records:</span>
                <span>{validationResult.hasMxRecords ? "Valid" : "Invalid"}</span>
              </div>
              {validationResult.patternMatch && (
                <div className="flex justify-between">
                  <span>Pattern:</span>
                  <span>{validationResult.patternMatch}</span>
                </div>
              )}
            </div>
          </div>
        )
      } else {
        return (
          <div className="flex flex-col gap-2 p-3 bg-green-950/30 text-green-300 rounded-md mt-4 border border-green-800/50">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="font-semibold">Valid email address</span>
            </div>
            <div className="text-sm space-y-1 ml-7">
              <div className="flex justify-between">
                <span>Trust Score:</span>
                <span>{validationResult.trustScore}%</span>
              </div>
              <div className="flex justify-between">
                <span>Domain Age:</span>
                <span>{validationResult.domainAge}</span>
              </div>
              <div className="flex justify-between">
                <span>MX Records:</span>
                <span>{validationResult.hasMxRecords ? "Valid" : "Invalid"}</span>
              </div>
            </div>
          </div>
        )
      }
    }

    return null
  }

  const clearInput = () => {
    setEmail("")
    setValidationResult(null)
    setValidationError(null)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <Card className={cn("w-full mx-auto border-none", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold text-center">Email Validator</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              ref={inputRef}
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={handleInputChange}
              className={cn(
                "pr-24 transition-colors", // Increased right padding for both buttons
                inputStatus === "error" && "border-red-500 focus-visible:ring-red-500",
                inputStatus === "temp" && "border-red-500 focus-visible:ring-red-500",
                inputStatus === "valid" && "border-green-500 focus-visible:ring-green-500",
                inputStatus === "validating" && "border-blue-500 focus-visible:ring-blue-500",
              )}
            />
            {email && (
              <Button
                type="button"
                onClick={clearInput}
                variant="ghost"
                size="icon"
                className="absolute right-9 top-1 h-8 w-8"
                title="Clear"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button type="submit" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" title="Search">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {getResultDisplay()}

          <Button type="submit" className="w-full" disabled={isValidating || !email}>
            {isValidating ? "Validating..." : "Validate Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default EmailChecker

