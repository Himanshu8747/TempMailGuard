import { useState } from "react"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Shield, User, Settings, LogOut, Moon, Sun } from "lucide-react"
import NotificationCenter from "@/components/notification-center"

const Header = () => {
  const [user] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    avatarUrl: "",
  })

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null
    return savedTheme || "dark"
  })
  
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    
    // Update class on HTML element
    const root = document.documentElement
    root.classList.remove("dark", "light")
    root.classList.add(newTheme)
    
    // Persist theme
    localStorage.setItem("theme", newTheme)
  }

  return (
    <header className="sticky top-0 z-20 w-full border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/">
            <div className="flex items-center space-x-2">
              <div className="bg-primary h-8 w-8 rounded-md flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">TempMailGuard</span>
            </div>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button> */}

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <Link href="/account">Account</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <Link href="/extension">Extension Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default Header

