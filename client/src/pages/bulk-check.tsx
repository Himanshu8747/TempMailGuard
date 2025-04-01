import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, AlertCircle, Upload, Check, X, AlertTriangle } from "lucide-react"
import { verifyBulkEmails, parseEmailsFromCsv, getTrustScoreColor } from "@/utils/email-validator"
import type { VerificationResult } from "@/types"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { queryClient } from "@/lib/queryClient"

const BulkCheck = () => {
  const [content, setContent] = useState("")
  const [emails, setEmails] = useState<string[]>([])
  const [results, setResults] = useState<VerificationResult[]>([])
  const [step, setStep] = useState<"upload" | "verify" | "results">("upload")

  const extractMutation = useMutation({
    mutationFn: parseEmailsFromCsv,
    onSuccess: (extractedEmails) => {
      setEmails(extractedEmails)
      setStep("verify")
    },
  })

  const verifyMutation = useMutation({
    mutationFn: verifyBulkEmails,
    onSuccess: (data) => {
      setResults(data)
      setStep("results")
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
    },
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setContent(content)
    }
    reader.readAsText(file)
  }

  const handleExtractEmails = () => {
    if (!content.trim()) return
    extractMutation.mutate(content)
  }

  const handleVerifyEmails = () => {
    if (emails.length === 0) return
    verifyMutation.mutate(emails)
  }

  const resetForm = () => {
    setContent("")
    setEmails([])
    setResults([])
    setStep("upload")
  }

  const tempEmailCount = results.filter(r => r.isTempEmail).length
  const validEmailCount = results.filter(r => !r.isTempEmail && r.trustScore >= 70).length
  const suspiciousEmailCount = results.filter(r => !r.isTempEmail && r.trustScore < 70).length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Bulk Email Check</h1>
          <p className="text-muted-foreground">Verify multiple email addresses at once</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {step === "upload" && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="file"
                    id="csv-upload"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" asChild>
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload CSV
                    </label>
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">or paste emails below</div>
              </div>

              <div>
                <Label htmlFor="email-input" className="mb-2 block">
                  Enter email addresses (one per line or CSV format)
                </Label>
                <Textarea
                  id="email-input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                  className="min-h-[200px]"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleExtractEmails} 
                  disabled={!content.trim() || extractMutation.isPending}
                >
                  {extractMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Extract Emails
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Found {emails.length} email {emails.length === 1 ? "address" : "addresses"}
                </h3>
                <div className="border border-border rounded-md p-4 max-h-[200px] overflow-y-auto">
                  <ul className="space-y-1">
                    {emails.map((email, index) => (
                      <li key={index} className="text-sm font-mono">
                        {email}
                      </li>
                    ))}
                  </ul>
                </div>

                {emails.length > 50 && (
                  <div className="flex items-start mt-2 text-sm text-amber-400">
                    <AlertCircle className="h-4 w-4 mr-1 mt-0.5" />
                    <p>
                      You've selected {emails.length} emails. Large batches may take longer to process.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetForm}>
                  Back
                </Button>
                <Button 
                  onClick={handleVerifyEmails} 
                  disabled={emails.length === 0 || verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying
                    </>
                  ) : (
                    "Verify Emails"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "results" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Verification Results</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="border border-border rounded-md p-4 bg-muted/30">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Temporary</p>
                        <p className="text-xl font-semibold text-red-400">{tempEmailCount}</p>
                      </div>
                      <X className="h-8 w-8 text-red-400" />
                    </div>
                  </div>

                  <div className="border border-border rounded-md p-4 bg-muted/30">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Valid</p>
                        <p className="text-xl font-semibold text-green-400">{validEmailCount}</p>
                      </div>
                      <Check className="h-8 w-8 text-green-400" />
                    </div>
                  </div>

                  <div className="border border-border rounded-md p-4 bg-muted/30">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Suspicious</p>
                        <p className="text-xl font-semibold text-yellow-400">{suspiciousEmailCount}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-yellow-400" />
                    </div>
                  </div>
                </div>

                <Table>
                  <TableCaption>Verification results for {results.length} email addresses.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trust Score</TableHead>
                      <TableHead className="hidden md:table-cell">Domain Age</TableHead>
                      <TableHead className="hidden md:table-cell">MX Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{result.email}</TableCell>
                        <TableCell>
                          {result.error ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-950/30 text-gray-300">
                              Error
                            </span>
                          ) : result.isTempEmail ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-950/30 text-red-300">
                              Temporary
                            </span>
                          ) : result.trustScore >= 70 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-950/30 text-green-300">
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-950/30 text-yellow-300">
                              Suspicious
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.error ? (
                            <span className="text-gray-400">N/A</span>
                          ) : (
                            <div className="flex items-center">
                              <span className="w-8 mr-2">{result.trustScore}%</span>
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getTrustScoreColor(result.trustScore)}`}
                                  style={{ width: `${result.trustScore}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {result.error ? 'Error' : result.domainAge}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {result.error ? 'Error' : (result.hasMxRecords ? "Valid" : "Invalid")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetForm}>
                  New Bulk Check
                </Button>
                <Button onClick={() => {
                  const csvContent = [
                    'Email,Status,Trust Score,Domain Age,MX Records',
                    ...results.map(r => 
                      `${r.email},${
                        r.error ? 'Error' : 
                        r.isTempEmail ? 'Temporary' : 
                        r.trustScore >= 70 ? 'Valid' : 'Suspicious'
                      },${
                        r.error ? 'N/A' : `${r.trustScore}%`
                      },${
                        r.error ? 'Error' : r.domainAge
                      },${
                        r.error ? 'Error' : (r.hasMxRecords ? 'Valid' : 'Invalid')
                      }`
                    )
                  ].join('\n')
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'email_verification_results.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                }}>
                  Download Results (CSV)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default BulkCheck