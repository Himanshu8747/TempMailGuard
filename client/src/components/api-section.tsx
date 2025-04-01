import { Card, CardContent } from "@/components/ui/card"
import { Code, ShieldCheck, Users } from "lucide-react"

const ApiSection = () => {
  return (
    <Card className="mb-6 border-none">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">API Integration</h2>
        <p className="text-muted-foreground mb-4">
          Integrate our email verification API into your applications with a few lines of code.
        </p>

        <div className="bg-muted rounded-md p-4 overflow-x-auto border border-border">
          <pre className="text-foreground font-mono text-sm">
            <code>
              {`// Example API Request
fetch('https://api.tempmailguard.com/v1/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    email: 'user@example.com'
  })
})
.then(response => response.json())
.then(data => console.log(data));`}
            </code>
          </pre>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-border rounded-md p-4 bg-muted/20">
            <div className="flex items-center mb-3">
              <Code className="h-5 w-5 text-primary mr-2" />
              <h3 className="font-medium">Simple Integration</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Easy to implement with any programming language that supports REST APIs.
            </p>
          </div>

          <div className="border border-border rounded-md p-4 bg-muted/20">
            <div className="flex items-center mb-3">
              <ShieldCheck className="h-5 w-5 text-primary mr-2" />
              <h3 className="font-medium">Secure Authentication</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              API keys with rate limiting and secure token-based authentication.
            </p>
          </div>

          <div className="border border-border rounded-md p-4 bg-muted/20">
            <div className="flex items-center mb-3">
              <Users className="h-5 w-5 text-primary mr-2" />
              <h3 className="font-medium">Detailed Response</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Get comprehensive results including trust score, domain info, and detection reasons.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <a href="#" className="text-primary hover:text-primary/80 font-medium">
            View API Documentation
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

export default ApiSection

