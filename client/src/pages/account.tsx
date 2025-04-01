import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PlanType } from "@/types"
import { Eye, EyeOff, Check, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"

// Define user data interface
interface UserData {
  id: number
  username: string
  email: string
  plan: PlanType
  apiCallsRemaining: number
  apiCallsTotal: number
  createdAt: Date
}

export default function AccountPage() {
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [createdAt] = useState(new Date("2023-01-01")) // Default value
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch user API usage data
  const { data: userData, isLoading: isUserDataLoading } = useQuery({
    queryKey: ["/api/user/usage"],
    queryFn: async () => {
      const response = await fetch("/api/user/usage")
      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }
      return response.json()
    },
  })

  // Create mutation to update user plan
  const updatePlanMutation = useMutation({
    mutationFn: async (plan: PlanType) => {
      return apiRequest("/api/user/update-plan", "POST", { plan })
    },
    onSuccess: () => {
      // Invalidate queries that depend on user data
      queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] })
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] })

      toast({
        title: "Plan updated",
        description: "Your subscription plan has been updated successfully",
        duration: 3000,
      })
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update plan",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        duration: 5000,
      })
    },
  })

  // Handle plan change
  const handlePlanChange = (plan: PlanType) => {
    updatePlanMutation.mutate(plan)
  }

  // Get user data from API response or use default values
  const user: UserData = userData
    ? {
        id: 1,
        username: userData.username || "johndoe",
        email: "john.doe@example.com", // Default value
        plan: (userData.plan as PlanType) || "free",
        apiCallsRemaining: userData.apiCallsRemaining || 0,
        apiCallsTotal: userData.apiCallsTotal || 50,
        createdAt,
      }
    : {
        id: 1,
        username: "johndoe",
        email: "john.doe@example.com",
        plan: "free" as PlanType,
        apiCallsRemaining: 0,
        apiCallsTotal: 50,
        createdAt,
      }

  const handleCopyApiKey = () => {
    navigator.clipboard
      .writeText("sk_temp_T3mpM4ilGu4Rd1234567890")
      .then(() => {
        setCopied(true)
        toast({
          title: "API Key Copied",
          description: "The API key has been copied to your clipboard",
        })
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Failed to copy",
          description: "Could not copy the API key to clipboard",
        })
      })
  }

  const getPlanBadge = (plan: PlanType) => {
    switch (plan) {
      case "premium":
        return <Badge className="bg-amber-500/80 hover:bg-amber-500">Premium</Badge>
      case "enterprise":
        return <Badge className="bg-purple-500/80 hover:bg-purple-500">Enterprise</Badge>
      default:
        return <Badge variant="outline">Free</Badge>
    }
  }

  const getApiLimitForPlan = (plan: PlanType) => {
    switch (plan) {
      case "premium":
        return 1000
      case "enterprise":
        return 10000
      default:
        return 50
    }
  }

  const usagePercentage = Math.round(((user.apiCallsTotal - user.apiCallsRemaining) / user.apiCallsTotal) * 100)

  const memberSince = user.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and subscription plan</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="plan">Subscription</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Username
                  </label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue={user.username}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Email
                  </label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    type="email"
                    defaultValue={user.email}
                    disabled
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Current Password
                  </label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    New Password
                  </label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Confirm New Password
                  </label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    type="password"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Update Password</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                {getPlanBadge(user.plan)}
              </CardTitle>
              <CardDescription>
                You are currently on the {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">API Usage</span>
                  <span className="text-sm">
                    {user.apiCallsTotal - user.apiCallsRemaining} / {user.apiCallsTotal}
                  </span>
                </div>
                <Progress value={usagePercentage} className="h-2" />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Free</CardTitle>
                    <CardDescription className="text-2xl font-bold">$0</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>50 API calls per month</li>
                      <li>Basic email detection</li>
                      <li>Single email verification</li>
                      <li>Limited Chrome extension</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={user.plan === "free" ? "outline" : "default"}
                      className="w-full"
                      disabled={user.plan === "free" || updatePlanMutation.isPending}
                      onClick={() => handlePlanChange("free")}
                    >
                      {updatePlanMutation.isPending && updatePlanMutation.variables === "free" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                        </>
                      ) : user.plan === "free" ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Current Plan
                        </>
                      ) : (
                        "Downgrade"
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-2 border-amber-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Premium</CardTitle>
                    <CardDescription className="text-2xl font-bold">$9.99/mo</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>1,000 API calls per month</li>
                      <li>Advanced detection algorithms</li>
                      <li>Bulk email verification</li>
                      <li>Full Chrome extension features</li>
                      <li>Custom domain management</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={user.plan === "premium" ? "outline" : "default"}
                      className="w-full"
                      disabled={user.plan === "premium" || updatePlanMutation.isPending}
                      onClick={() => handlePlanChange("premium")}
                    >
                      {updatePlanMutation.isPending && updatePlanMutation.variables === "premium" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                        </>
                      ) : user.plan === "premium" ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Current Plan
                        </>
                      ) : user.plan === "free" ? (
                        "Upgrade"
                      ) : (
                        "Downgrade"
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-2 border-purple-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Enterprise</CardTitle>
                    <CardDescription className="text-2xl font-bold">$49.99/mo</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>10,000 API calls per month</li>
                      <li>AI-powered detection</li>
                      <li>Team management</li>
                      <li>Priority support</li>
                      <li>Advanced analytics</li>
                      <li>Custom integration options</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={user.plan === "enterprise" ? "outline" : "default"}
                      className="w-full"
                      disabled={user.plan === "enterprise" || updatePlanMutation.isPending}
                      onClick={() => handlePlanChange("enterprise")}
                    >
                      {updatePlanMutation.isPending && updatePlanMutation.variables === "enterprise" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                        </>
                      ) : user.plan === "enterprise" ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Current Plan
                        </>
                      ) : (
                        "Upgrade"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for accessing the TempMailGuard API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Your API Key
                    </label>
                    <div className="mt-2 flex">
                      <input
                        className="flex h-10 w-full rounded-l-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        type={showApiKey ? "text" : "password"}
                        value="sk_temp_T3mpM4ilGu4Rd1234567890"
                        readOnly
                      />
                      <Button
                        variant="outline"
                        className="rounded-none border-l-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" className="rounded-l-none" onClick={handleCopyApiKey}>
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    API Calls Remaining: {user.apiCallsRemaining} of {getApiLimitForPlan(user.plan)}
                  </p>
                  <Progress
                    value={(user.apiCallsRemaining / getApiLimitForPlan(user.plan)) * 100}
                    className="h-2 mt-2"
                  />
                </div>

                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-medium mb-2">Example API Usage</h4>
                  <pre className="bg-background p-4 rounded text-xs overflow-x-auto">
                    {`curl -X POST \\
  https://api.tempmailguard.com/api/verify \\
  -H "Authorization: Bearer sk_temp_T3mpM4ilGu4Rd1234567890" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com"}'`}
                  </pre>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start space-y-2">
              <Button variant="outline">Regenerate API Key</Button>
              <p className="text-xs text-muted-foreground">
                Warning: Regenerating your API key will invalidate any existing key
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

