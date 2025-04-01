import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Info, AlertCircle, AlertTriangle, Flag } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

type ReportType = "legitimate" | "temporary" | "suspicious" | "phishing" | "spam"

export function EmailReputationForm({ email, onSubmitSuccess }: { email?: string; onSubmitSuccess?: () => void }) {
  const [inputEmail, setInputEmail] = useState(email || "")
  const [reportType, setReportType] = useState<ReportType>("temporary")
  const [metadata, setMetadata] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const emailInputRef = useRef<HTMLInputElement>(null)

  // This useEffect will handle paste events for the email input
  useEffect(() => {
    const handlePaste = () => {
      // Small delay to ensure the pasted content is available
      setTimeout(() => {
        if (emailInputRef.current && emailInputRef.current.value) {
          setInputEmail(emailInputRef.current.value)
        }
      }, 0)
    }

    const inputElement = emailInputRef.current
    if (inputElement) {
      inputElement.addEventListener("paste", handlePaste)
      return () => {
        inputElement.removeEventListener("paste", handlePaste)
      }
    }
  }, [])

  // Reputation data for this email (if it exists)
  const { data: emailReputation, isLoading: isLoadingReputation } = useQuery({
    queryKey: ["reputation", "email", inputEmail],
    queryFn: async () => {
      if (!inputEmail) return null
      const response = await apiRequest(`/api/reputation/email/${encodeURIComponent(inputEmail)}`)
      return response.json()
    },
    enabled: !!inputEmail && inputEmail.includes("@"),
    refetchOnWindowFocus: false,
  })

  // Fetch domain reputation if domain part is entered
  const domain = inputEmail.split("@")[1]
  const { data: domainReputation, isLoading: isLoadingDomainReputation } = useQuery({
    queryKey: ["reputation", "domain", domain],
    queryFn: async () => {
      if (!domain) return null
      const response = await apiRequest(`/api/reputation/domain/${encodeURIComponent(domain)}`)
      return response.json()
    },
    enabled: !!domain,
    refetchOnWindowFocus: false,
  })

  // Get most reported emails
  const { data: mostReported, isLoading: isLoadingMostReported } = useQuery({
    queryKey: ["reputation", "most-reported"],
    queryFn: async () => {
      const response = await apiRequest("/api/reputation/most-reported")
      return response.json()
    },
    refetchOnWindowFocus: false,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/reputation/report", "POST", {
        email: inputEmail,
        reportType,
        metadata: metadata || undefined,
      })
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: "Reputation report submitted",
        description: "Thank you for contributing to the crowdsourced database!",
        variant: "default",
      })

      // Invalidate the reputation queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["reputation", "email", inputEmail] })
      if (domain) {
        queryClient.invalidateQueries({ queryKey: ["reputation", "domain", domain] })
      }
      queryClient.invalidateQueries({ queryKey: ["reputation", "most-reported"] })

      // Clear form
      setMetadata("")

      // Call the success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess()
      }
    },
    onError: () => {
      toast({
        title: "Error submitting report",
        description: "Please try again later",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address to report",
        variant: "destructive",
      })
      return
    }

    submitMutation.mutate()
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "legitimate":
        return <Check className="h-4 w-4 text-green-400" />
      case "temporary":
        return <Info className="h-4 w-4 text-blue-400" />
      case "suspicious":
        return <AlertCircle className="h-4 w-4 text-amber-400" />
      case "phishing":
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      case "spam":
        return <Flag className="h-4 w-4 text-purple-400" />
      default:
        return null
    }
  }

  const getReputationBadgeColor = (reputation: any) => {
    if (!reputation) return "bg-muted text-muted-foreground"

    const { reportType } = reputation

    if (reportType === "legitimate") return "bg-green-950/30 text-green-300 border-green-800"
    if (reportType === "temporary") return "bg-blue-950/30 text-blue-300 border-blue-800"
    if (reportType === "suspicious") return "bg-amber-950/30 text-amber-300 border-amber-800"
    if (reportType === "phishing") return "bg-red-950/30 text-red-300 border-red-800"
    if (reportType === "spam") return "bg-purple-950/30 text-purple-300 border-purple-800"

    return "bg-muted text-muted-foreground"
  }

  return (
    <Tabs defaultValue="report" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="report">Report</TabsTrigger>
        <TabsTrigger value="reputation">Current Reputation</TabsTrigger>
        <TabsTrigger value="popular">Most Reported</TabsTrigger>
      </TabsList>

      <TabsContent value="report">
        <Card>
          <CardHeader>
            <CardTitle>Report Email Reputation</CardTitle>
            <CardDescription>
              Contribute to our crowdsourced database of email reputations. Your reports help everyone detect suspicious
              emails more accurately.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  ref={emailInputRef}
                  id="email"
                  placeholder="Enter email address to report"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Report Type</Label>
                <RadioGroup value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="legitimate" id="r1" />
                      <Label htmlFor="r1" className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-green-400" />
                        <span>Legitimate</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="temporary" id="r2" />
                      <Label htmlFor="r2" className="flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-blue-400" />
                        <span>Temporary</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="suspicious" id="r3" />
                      <Label htmlFor="r3" className="flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <span>Suspicious</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phishing" id="r4" />
                      <Label htmlFor="r4" className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span>Phishing</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 md:col-span-2">
                      <RadioGroupItem value="spam" id="r5" />
                      <Label htmlFor="r5" className="flex items-center gap-1.5">
                        <Flag className="h-4 w-4 text-purple-400" />
                        <span>Spam</span>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metadata">Additional Information (Optional)</Label>
                <Textarea
                  id="metadata"
                  placeholder="Add any additional details about this email"
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={!inputEmail || submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="reputation">
        <Card>
          <CardHeader>
            <CardTitle>Current Reputation</CardTitle>
            <CardDescription>View the current reputation data for this email address and domain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingReputation && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

            {!isLoadingReputation && (!emailReputation || emailReputation.exists === false) && inputEmail && (
              <div className="text-center py-4 bg-muted/30 rounded-md">
                <p className="text-muted-foreground">No reputation data available for this email</p>
              </div>
            )}

            {!isLoadingReputation && emailReputation && emailReputation.exists !== false && (
              <div className="space-y-4 border border-border p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Email Reputation</h3>
                  <Badge variant="outline" className={getReputationBadgeColor(emailReputation)}>
                    {emailReputation.reportType}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reports</p>
                    <p className="font-medium">{emailReputation.totalReports}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence Score</p>
                    <p className="font-medium">{emailReputation.confidenceScore}%</p>
                  </div>
                  {emailReputation.firstReportedAt && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">First Reported</p>
                      <p className="font-medium">{new Date(emailReputation.firstReportedAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {emailReputation.metadata && (
                  <div>
                    <p className="text-sm text-muted-foreground">Additional Information</p>
                    <p className="text-sm bg-muted/30 p-2 rounded mt-1">{emailReputation.metadata}</p>
                  </div>
                )}
              </div>
            )}

            {/* Domain reputation */}
            {isLoadingDomainReputation && (
              <div className="space-y-2 mt-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {!isLoadingDomainReputation && (!domainReputation || domainReputation.exists === false) && domain && (
              <div className="text-center py-4 bg-muted/30 rounded-md">
                <p className="text-muted-foreground">No reputation data available for this domain</p>
              </div>
            )}

            {!isLoadingDomainReputation && domainReputation && domainReputation.exists !== false && (
              <div className="space-y-4 border border-border p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Domain Reputation</h3>
                  <Badge variant="outline" className={getReputationBadgeColor(domainReputation)}>
                    {domainReputation.reportType}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reports</p>
                    <p className="font-medium">{domainReputation.totalReports}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence Score</p>
                    <p className="font-medium">{domainReputation.confidenceScore}%</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="popular">
        <Card>
          <CardHeader>
            <CardTitle>Most Reported</CardTitle>
            <CardDescription>View the most frequently reported emails and domains</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMostReported && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center mb-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            )}

            {!isLoadingMostReported && mostReported && mostReported.length === 0 && (
              <div className="text-center py-4 bg-muted/30 rounded-md">
                <p className="text-muted-foreground">No reports available yet</p>
              </div>
            )}

            {!isLoadingMostReported && mostReported && mostReported.length > 0 && (
              <div className="space-y-3">
                {mostReported.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-2 px-3 hover:bg-muted/30 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {getReportTypeIcon(item.reportType)}
                      <span className="font-medium">{item.email}</span>
                    </div>
                    <Badge variant="outline" className={getReputationBadgeColor(item)}>
                      {item.totalReports} reports
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

