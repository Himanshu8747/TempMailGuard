import { Switch, Route } from "wouter"
import { Toaster } from "@/components/ui/toaster"
import Dashboard from "@/pages/dashboard"
import BulkCheck from "@/pages/bulk-check"
import ApiAccess from "@/pages/api-access"
import Analytics from "@/pages/analytics"
import DomainLists from "@/pages/domain-lists"
import Extension from "@/pages/extension"
import Account from "@/pages/account"
import NotFound from "@/pages/not-found"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"

function Router() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      <div className="md:fixed md:inset-y-0 md:left-0 md:w-64 z-30">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col md:ml-64">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/bulk-check" component={BulkCheck} />
              <Route path="/api-access" component={ApiAccess} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/domain-lists" component={DomainLists} />
              <Route path="/extension" component={Extension} />
              <Route path="/account" component={Account} />
              <Route component={NotFound} />
            </Switch>

            {/* Footer */}
            <footer className="mt-12 text-center text-muted-foreground text-sm">
              <p>&copy; {new Date().getFullYear()} TempMailGuard. All rights reserved.</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  )
}

export default App

