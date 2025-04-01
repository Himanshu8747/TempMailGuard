import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "wouter"

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
          <h1 className="text-3xl font-bold mb-2">404</h1>
          <h2 className="text-xl font-semibold mb-4">Page Not Found</h2>

          <p className="text-muted-foreground mb-6">The page you are looking for doesn't exist or has been moved.</p>

          <Button asChild className="w-full">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

