import { useState, useEffect } from "react"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Chrome, Download, Shield, Settings, AlertTriangle, Globe, HelpCircle, Loader2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Define the step interface for our wizard
type Step = "configure" | "review" | "download" | "instructions"

export default function ExtensionPage() {
  const { toast } = useToast()
  const [isDownloading, setIsDownloading] = useState(false)
  const [isConfigSaved, setIsConfigSaved] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>("configure")
  const [trustThreshold, setTrustThreshold] = useState(30)
  const [settings, setSettings] = useState({
    enableAutoCheck: true,
    showInlineWarnings: true,
    blockFormSubmission: false,
    collectAnonymousStats: true,
    activateOnAllSites: false,
    excludeSites: "",
  })

  // Load saved configuration from localStorage on component mount
  useEffect(() => {
    const savedConfig = localStorage.getItem("extension_settings")
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig)
        setSettings(parsedConfig.settings || settings)
        setTrustThreshold(parsedConfig.trustThreshold || trustThreshold)
        setIsConfigSaved(true)
      } catch (error) {
        console.error("Error loading saved configuration:", error)
      }
    }
  }, [])

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings({
      ...settings,
      [key]: value,
    })
    setIsConfigSaved(false)
  }

  const saveConfiguration = () => {
    // Save configuration to local storage so it persists between visits
    localStorage.setItem(
      "extension_settings",
      JSON.stringify({
        settings,
        trustThreshold,
      }),
    )

    setIsConfigSaved(true)
    setCurrentStep("review")
    toast({
      title: "Configuration saved",
      description: "Your settings have been saved and will be applied to the extension.",
    })
  }

  const resetToDefaults = () => {
    setSettings({
      enableAutoCheck: true,
      showInlineWarnings: true,
      blockFormSubmission: false,
      collectAnonymousStats: true,
      activateOnAllSites: false,
      excludeSites: "",
    })
    setTrustThreshold(30)
    setIsConfigSaved(false)
    toast({
      title: "Settings reset",
      description: "Extension settings have been reset to defaults.",
    })
  }

  const goToStep = (step: Step) => {
    setCurrentStep(step)
  }

  const downloadExtension = async () => {
    setIsDownloading(true)

    try {
      // If settings aren't saved, save them first
      if (!isConfigSaved) {
        localStorage.setItem(
          "extension_settings",
          JSON.stringify({
            settings,
            trustThreshold,
          }),
        )
        setIsConfigSaved(true)
      }

      // Create a zip file with the extension contents and custom configuration
      const extensionData = await fetch("/api/extension/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings,
          trustThreshold,
        }),
      })

      if (!extensionData.ok) {
        throw new Error("Failed to generate extension")
      }

      // Create a download link for the extension
      const blob = await extensionData.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = "TempMailGuard-Extension.zip"
      document.body.appendChild(link)
      link.click()
      link.remove()

      // Show installation instructions
      setCurrentStep("instructions")

      toast({
        title: "Extension downloaded",
        description: "Extension has been downloaded successfully.",
      })
    } catch (error) {
      console.error("Error downloading extension:", error)
      toast({
        title: "Download failed",
        description: "There was an error generating the extension. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browser Extension</h1>
        <p className="text-muted-foreground">Download and configure the TempMailGuard browser extension</p>
      </div>

      {/* Step indicator */}
      <div className="relative">
        <div className="flex justify-between">
          <div className="text-center">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center mx-auto ${currentStep === "configure" ? "bg-primary text-primary-foreground" : currentStep === "review" || currentStep === "download" || currentStep === "instructions" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              1
            </div>
            <p className="mt-2 text-sm font-medium">Configure</p>
          </div>
          <div className="text-center">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center mx-auto ${currentStep === "review" ? "bg-primary text-primary-foreground" : currentStep === "download" || currentStep === "instructions" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              2
            </div>
            <p className="mt-2 text-sm font-medium">Review</p>
          </div>
          <div className="text-center">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center mx-auto ${currentStep === "download" || currentStep === "instructions" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              3
            </div>
            <p className="mt-2 text-sm font-medium">Download</p>
          </div>
          <div className="text-center">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center mx-auto ${currentStep === "instructions" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              4
            </div>
            <p className="mt-2 text-sm font-medium">Install</p>
          </div>
        </div>
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10"></div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Card: Changes based on current step */}
        {currentStep === "configure" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Extension Configuration
              </CardTitle>
              <CardDescription>Customize how the browser extension works</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="behavior" className="space-y-4">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="behavior">Behavior</TabsTrigger>
                  <TabsTrigger value="detection">Detection</TabsTrigger>
                  <TabsTrigger value="sites">Sites</TabsTrigger>
                </TabsList>

                <TabsContent value="behavior" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-check">Auto-check emails</Label>
                        <p className="text-sm text-muted-foreground">Automatically verify emails when typed</p>
                      </div>
                      <Switch
                        id="auto-check"
                        checked={settings.enableAutoCheck}
                        onCheckedChange={(checked) => handleSettingChange("enableAutoCheck", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="inline-warning">Show inline warnings</Label>
                        <p className="text-sm text-muted-foreground">Display warning icons next to suspicious emails</p>
                      </div>
                      <Switch
                        id="inline-warning"
                        checked={settings.showInlineWarnings}
                        onCheckedChange={(checked) => handleSettingChange("showInlineWarnings", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="block-submission" className="flex items-center gap-1">
                          Block form submission
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Prevent forms from being submitted with temp emails
                        </p>
                      </div>
                      <Switch
                        id="block-submission"
                        checked={settings.blockFormSubmission}
                        onCheckedChange={(checked) => handleSettingChange("blockFormSubmission", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="collect-stats">Collect anonymous stats</Label>
                        <p className="text-sm text-muted-foreground">Help us improve by sharing anonymous usage data</p>
                      </div>
                      <Switch
                        id="collect-stats"
                        checked={settings.collectAnonymousStats}
                        onCheckedChange={(checked) => handleSettingChange("collectAnonymousStats", checked)}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="detection" className="space-y-4">
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="trust-threshold">Trust Threshold</Label>
                        <span className="text-sm font-medium">{trustThreshold} / 100</span>
                      </div>
                      <Slider
                        id="trust-threshold"
                        min={0}
                        max={100}
                        step={5}
                        value={[trustThreshold]}
                        onValueChange={(value) => setTrustThreshold(value[0])}
                        className="py-4"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Aggressive</span>
                        <span>Balanced</span>
                        <span>Permissive</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {trustThreshold < 30
                          ? "Aggressive: More emails will be flagged as suspicious, but may include some legitimate services."
                          : trustThreshold > 70
                            ? "Permissive: Only the most obvious temporary email services will be detected."
                            : "Balanced: Recommended setting that catches most temporary emails with minimal false positives."}
                      </p>
                    </div>

                    <div className="rounded-md border border-border p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="h-5 w-5 mt-0.5 text-blue-400" />
                        <div>
                          <h3 className="text-sm font-medium">How detection works</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            TempMailGuard uses multiple detection methods:
                          </p>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground mt-2">
                            <li>Known temporary email domain database</li>
                            <li>MX record checks</li>
                            <li>Domain age verification</li>
                            <li>Pattern recognition</li>
                          </ul>
                          <Link
                            href="/domain-lists"
                            className="text-sm font-medium mt-2 inline-block text-primary hover:underline"
                          >
                            Manage domain blocklist
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sites" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="all-sites" className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          Activate on all websites
                        </Label>
                        <p className="text-sm text-muted-foreground">Run the extension on every website you visit</p>
                      </div>
                      <Switch
                        id="all-sites"
                        checked={settings.activateOnAllSites}
                        onCheckedChange={(checked) => handleSettingChange("activateOnAllSites", checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exclude-sites">Excluded websites</Label>
                      <p className="text-xs text-muted-foreground">
                        Add domains where the extension should not run (one per line)
                      </p>
                      <textarea
                        id="exclude-sites"
                        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="example.com&#10;another-site.com"
                        value={settings.excludeSites}
                        onChange={(e) => handleSettingChange("excludeSites", e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={resetToDefaults}>
                Reset to Defaults
              </Button>
              <Button onClick={saveConfiguration} disabled={isConfigSaved}>
                {isConfigSaved ? "Saved" : "Save Configuration"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === "review" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Review Configuration
              </CardTitle>
              <CardDescription>Review your extension settings before downloading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Behavior Settings</h3>
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Auto-check emails:</span>
                    <span className="font-medium">{settings.enableAutoCheck ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Show inline warnings:</span>
                    <span className="font-medium">{settings.showInlineWarnings ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Block form submission:</span>
                    <span className="font-medium">{settings.blockFormSubmission ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Collect anonymous stats:</span>
                    <span className="font-medium">{settings.collectAnonymousStats ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Detection Settings</h3>
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Trust threshold:</span>
                    <span className="font-medium">{trustThreshold} / 100</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {trustThreshold < 30
                      ? "Aggressive detection: More emails will be flagged as suspicious."
                      : trustThreshold > 70
                        ? "Permissive detection: Only obvious temporary emails will be detected."
                        : "Balanced detection: Good mix of accuracy and low false positives."}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Website Settings</h3>
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Activate on all websites:</span>
                    <span className="font-medium">{settings.activateOnAllSites ? "Yes" : "No"}</span>
                  </div>
                  {settings.excludeSites && (
                    <div className="text-sm">
                      <div className="font-medium mb-1">Excluded websites:</div>
                      <div className="text-muted-foreground space-y-1">
                        {settings.excludeSites
                          .split("\n")
                          .map((site, i) => site.trim() && <div key={i}>{site.trim()}</div>)}
                      </div>
                    </div>
                  )}
                  {!settings.excludeSites && <div className="text-sm text-muted-foreground">No websites excluded</div>}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("configure")}>
                Go Back
              </Button>
              <Button onClick={() => setCurrentStep("download")}>Proceed to Download</Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === "download" && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                Chrome Extension
              </CardTitle>
              <CardDescription>
                Install our browser extension to detect temporary emails in real-time while browsing
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center p-6 mb-4">
                <Shield className="h-16 w-16 mb-4 text-primary" />
                <p className="text-center text-sm text-muted-foreground">
                  The TempMailGuard extension adds real-time detection of temporary email addresses on any website or
                  form
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Key features:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Detect temporary emails as users type</li>
                  <li>Visual warnings next to suspicious email fields</li>
                  <li>Optional form submission blocking for risky emails</li>
                  <li>Whitelist trusted websites</li>
                  <li>Works offline with built-in domain database</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button className="w-full" size="lg" onClick={downloadExtension} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isDownloading ? "Generating..." : "Download Extension"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setCurrentStep("review")}>
                Go Back
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Right card with info */}
        {currentStep === "configure" && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Chrome Extension
              </CardTitle>
              <CardDescription>Protect your website from temporary email addresses</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-lg bg-muted p-4 mb-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium block mb-2">Why use our extension?</span>
                  The TempMailGuard extension helps you detect and block temporary email addresses in real-time,
                  protecting your forms and reducing spam signups.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Configure settings</h3>
                    <p className="text-sm text-muted-foreground">Customize the extension behavior to suit your needs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Download extension</h3>
                    <p className="text-sm text-muted-foreground">Get your custom-configured extension package</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Install in Chrome</h3>
                    <p className="text-sm text-muted-foreground">Load the extension in developer mode</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "review" && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Chrome Extension
              </CardTitle>
              <CardDescription>Protect your website from temporary email addresses</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-lg bg-muted p-4 mb-4">
                <p className="text-sm text-muted-foreground">
                  Your settings are looking good! The next step is to download the extension package and install it in
                  your browser.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Configuration complete</h3>
                    <p className="text-sm text-muted-foreground">
                      Your settings have been saved and are ready to be applied
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    →
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Download and install</h3>
                    <p className="text-sm text-muted-foreground">Proceed to download the custom extension package</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "download" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Installation Instructions
              </CardTitle>
              <CardDescription>How to install the extension in Chrome</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-5 space-y-3">
                <li className="text-sm">
                  <span className="font-medium">Extract the ZIP file</span>
                  <p className="text-muted-foreground mt-1">Unzip the downloaded file to a folder on your computer</p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Open Chrome extensions page</span>
                  <p className="text-muted-foreground mt-1">Navigate to chrome://extensions in your Chrome browser</p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Enable Developer Mode</span>
                  <p className="text-muted-foreground mt-1">
                    Toggle the "Developer mode" switch in the top-right corner
                  </p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Load unpacked extension</span>
                  <p className="text-muted-foreground mt-1">
                    Click "Load unpacked" button and select the extracted folder
                  </p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Grant permissions</span>
                  <p className="text-muted-foreground mt-1">
                    When prompted, allow the extension to access necessary permissions
                  </p>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Installation Instructions Dialog */}
      <Dialog
        open={currentStep === "instructions"}
        onOpenChange={(open) => {
          if (!open) setCurrentStep("configure")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extension Installation Instructions</DialogTitle>
            <DialogDescription>Follow these steps to install the TempMailGuard extension in Chrome</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ol className="list-decimal pl-5 space-y-3">
              <li className="text-sm">
                <span className="font-medium">Extract the ZIP file</span> you just downloaded
              </li>
              <li className="text-sm">
                <span className="font-medium">Open Chrome extensions page</span> by typing{" "}
                <code>chrome://extensions</code> in the address bar
              </li>
              <li className="text-sm">
                <span className="font-medium">Enable Developer Mode</span> using the toggle in the top-right
              </li>
              <li className="text-sm">
                <span className="font-medium">Click "Load unpacked"</span> and select the extracted folder
              </li>
              <li className="text-sm">
                <span className="font-medium">Grant permissions</span> when prompted
              </li>
            </ol>
            <div className="rounded-md bg-muted p-3 mt-3">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> The extension will request permission to run in the background to validate emails
                in real-time.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setCurrentStep("configure")}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

