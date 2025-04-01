import { useState } from "react"
import { Link, useLocation } from "wouter"
import { Shield, ClipboardList, Code, BarChart2, Globe, Settings, User, Menu, Home } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

const Sidebar = () => {
  const [location] = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Get user stats for the plan display
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0])
      if (!res.ok) throw new Error("Failed to fetch stats")
      return res.json()
    },
  })

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const isActive = (path: string) => {
    return location === path || (path === "/dashboard" && location === "/")
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
  }

  return (
    <aside className="bg-background border-r border-border text-foreground w-full md:w-64 flex-shrink-0 h-full md:min-h-screen overflow-y-auto flex flex-col">
      <div className="p-4 flex items-center justify-between border-border">
        <div className="flex items-center space-x-2">
          <div className="bg-primary h-8 w-8 rounded-md flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold">TempMailGuard</h1>
        </div>
        <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={toggleMobileMenu}>
          <Menu className="h-6 w-6" />
        </button>
      </div>

      <nav className={`mt-4 ${!isMobileMenuOpen && "hidden md:block"}`}>
        <div className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Main</div>
        <Link href="/dashboard" className={`flex items-center px-4 py-3 ${isActive("/dashboard")}`}>
          <Home className="h-5 w-5 mr-3" />
          Dashboard
        </Link>
        <Link href="/bulk-check" className={`flex items-center px-4 py-3 ${isActive("/bulk-check")}`}>
          <ClipboardList className="h-5 w-5 mr-3" />
          Bulk Check
        </Link>
        <Link href="/api-access" className={`flex items-center px-4 py-3 ${isActive("/api-access")}`}>
          <Code className="h-5 w-5 mr-3" />
          API Access
        </Link>
        <Link href="/analytics" className={`flex items-center px-4 py-3 ${isActive("/analytics")}`}>
          <BarChart2 className="h-5 w-5 mr-3" />
          Analytics
        </Link>

        <div className="px-4 py-2 mt-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Settings
        </div>
        <Link href="/domain-lists" className={`flex items-center px-4 py-3 ${isActive("/domain-lists")}`}>
          <Globe className="h-5 w-5 mr-3" />
          Domain Lists
        </Link>
        <Link href="/extension" className={`flex items-center px-4 py-3 ${isActive("/extension")}`}>
          <Settings className="h-5 w-5 mr-3" />
          Extension
        </Link>
        <Link href="/account" className={`flex items-center px-4 py-3 ${isActive("/account")}`}>
          <User className="h-5 w-5 mr-3" />
          Account
        </Link>
      </nav>

      <div className="mt-auto px-4 py-2 mb-8 hidden md:flex flex-col">
        <div className="bg-muted rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Current Plan</p>
          <p className="text-foreground font-medium">
            {stats?.plan ? stats.plan.charAt(0).toUpperCase() + stats.plan.slice(1) : "Free"} Tier
          </p>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">API Calls</span>
              <span className="text-muted-foreground">
                {stats ? `${stats.apiCallsRemaining}/${stats.apiCallsTotal || 50}` : "0/50"}
              </span>
            </div>
            <div className="bg-background h-2 rounded-full">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: stats ? `${(stats.apiCallsRemaining / (stats.apiCallsTotal || 50)) * 100}%` : "0%" }}
              ></div>
            </div>
          </div>
          <Link
            href="/account"
            className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-md text-sm font-medium inline-block text-center"
          >
            Manage Plan
          </Link>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

