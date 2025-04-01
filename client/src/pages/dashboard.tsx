import { useQuery } from "@tanstack/react-query"
import { Mail, XCircle, Clock, Shield } from "lucide-react"
import EmailChecker from "@/components/email-checker"
import StatCard from "@/components/stat-card"
import ActivityList from "@/components/activity-list"
import ExtensionCard from "@/components/extension-card"
import ApiSection from "@/components/api-section"
import type { DashboardStats } from "@/types"
import { Skeleton } from "@/components/ui/skeleton"

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0])
      if (!res.ok) throw new Error("Failed to fetch stats")
      return res.json()
    },
  })

  return (
    <>
      {/* Email Checker Component */}
        <EmailChecker className="mb-6" />
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <Skeleton className="h-12 w-12 rounded-md mr-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Emails Checked"
              value={stats?.emailsChecked || 0}
              icon={<Mail />}
              change={{ value: "8.2%", isPositive: true }}
              subtitle="from last week"
            />

            <StatCard
              title="Temp Emails Detected"
              value={stats?.tempEmailsDetected || 0}
              icon={<XCircle />}
              iconBgColor="bg-red-950/30"
              iconColor="text-red-400"
              change={{ value: "12.5%", isPositive: false }}
              subtitle="from last week"
            />

            <StatCard
              title="API Calls Remaining"
              value={stats?.apiCallsRemaining || 0}
              icon={<Clock />}
              iconBgColor="bg-amber-950/30"
              iconColor="text-amber-400"
              subtitle="Free Tier: 50 calls per day"
            />

            <StatCard
              title="Detection Accuracy"
              value={`${stats?.detectionAccuracy || 0}%`}
              icon={<Shield />}
              iconBgColor="bg-green-950/30"
              iconColor="text-green-400"
              change={{ value: "1.2%", isPositive: true }}
              subtitle="from last week"
            />
          </>
        )}
      </div>

      {/* Recent Activity & Chrome Extension */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Activity */}
        <ActivityList className="lg:col-span-2" />

        {/* Chrome Extension Card */}
        <ExtensionCard />
      </div>

      {/* API Integration Section */}
      <ApiSection />
    </>
  )
}

export default Dashboard

