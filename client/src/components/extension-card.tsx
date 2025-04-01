import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const ExtensionCard = () => {
  return (
    <Card className="h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Chrome Extension</h2>
          <span className="bg-green-950/30 text-green-300 text-xs px-2 py-1 rounded-full border border-green-800/50">
            Active
          </span>
        </div>

        <div className="flex items-center justify-center py-4">
          <div className="bg-primary rounded-xl h-24 w-24 flex items-center justify-center text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div className="mt-2 text-center">
          <h3 className="font-medium">TempMailGuard Extension</h3>
          <p className="text-sm text-muted-foreground mt-1">Detect temp emails on any website</p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-sm">Real-time detection</span>
          </div>
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-sm">Form field monitoring</span>
          </div>
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-sm">Instant warnings</span>
          </div>
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-sm">Customizable settings</span>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <Button className="w-full mb-2">Configure Extension</Button>
          <Button variant="outline" className="w-full border-primary text-primary hover:text-primary/80">
            Download Extension
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ExtensionCard

