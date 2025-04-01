import { useQuery } from "@tanstack/react-query"
import { Check, XCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import {cn} from "@/lib/utils"
interface ActivityListProps {
  className?: string
}

// Define the Verification type to match our API response
interface Verification {
  id: number
  email: string
  isTempEmail: boolean
  trustScore: number
  domainAge: string | null
  hasMxRecords: boolean | null
  patternMatch: string | null
  userId: number | null
  createdAt: string
}

// Define the paginated response from the API
interface VerificationResponse {
  verifications: Verification[]
  total: number
}

const ActivityList = ({ className }: ActivityListProps) => {
  const { data, isLoading, error } = useQuery<VerificationResponse>({
    queryKey: ["/api/recent-verifications"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string)
      if (!res.ok) throw new Error("Failed to fetch recent activity")
      return res.json()
    },
  })

  // Extract the verifications array from the response
  const activities = data?.verifications || []

  const getActivityIcon = (verification: Verification) => {
    if (verification.isTempEmail) {
      return (
        <div className="rounded-full h-8 w-8 flex items-center justify-center bg-red-950/50 text-red-400">
          <XCircle className="h-4 w-4" />
        </div>
      )
    } else if (verification.trustScore >= 70) {
      return (
        <div className="rounded-full h-8 w-8 flex items-center justify-center bg-green-950/50 text-green-400">
          <Check className="h-4 w-4" />
        </div>
      )
    } else {
      return (
        <div className="rounded-full h-8 w-8 flex items-center justify-center bg-yellow-950/50 text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
        </div>
      )
    }
  }

  const getActivityTitle = (verification: Verification) => {
    if (verification.isTempEmail) {
      return "Temp email detected"
    } else if (verification.trustScore >= 70) {
      return "Valid email verified"
    } else {
      return "Suspicious email detected"
    }
  }

  const getTimeAgo = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="py-6 text-center">
            <p className="text-red-400">Error loading verification activity</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-none", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <a href="#" className="text-sm text-primary hover:text-primary/80">
            View All
          </a>
        </div>

        <div className="overflow-hidden">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activities.length > 0 ? (
                activities.map((verification) => (
                  <li key={verification.id} className="py-3">
                    <div className="flex items-center space-x-4">
                      {getActivityIcon(verification)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{getActivityTitle(verification)}</p>
                        <p className="text-sm text-muted-foreground truncate">{verification.email}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">{getTimeAgo(verification.createdAt)}</div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="py-6 text-center">
                  <p className="text-muted-foreground">No verification activity yet</p>
                </li>
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityList

