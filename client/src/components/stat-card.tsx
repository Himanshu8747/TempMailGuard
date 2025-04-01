import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  change?: {
    value: string
    isPositive: boolean
  }
  subtitle?: string
  iconBgColor?: string
  iconColor?: string
}

const StatCard = ({
  title,
  value,
  icon,
  change,
  subtitle,
  iconBgColor = "bg-primary/20",
  iconColor = "text-primary",
}: StatCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`rounded-md ${iconBgColor} p-3 mr-4`}>
            <div className={`h-6 w-6 ${iconColor}`}>{icon}</div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-xl font-semibold">{value}</h3>
          </div>
        </div>
        {(change || subtitle) && (
          <div className="mt-4 flex items-center text-sm">
            {change && (
              <span className={`${change.isPositive ? "text-green-400" : "text-red-400"} flex items-center`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={change.isPositive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"}
                  />
                </svg>
                {change.value}
              </span>
            )}
            {subtitle && <span className="text-muted-foreground ml-2">{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StatCard

