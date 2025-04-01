import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export type Notification = {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  timestamp: Date
  read: boolean
}

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Add a mock notification for testing
  useEffect(() => {
    const initialNotifications: Notification[] = [
      {
        id: "1",
        title: "Welcome to TempMailGuard",
        message: "Thank you for using our temporary email detection service. Get started by checking your first email.",
        type: "info",
        timestamp: new Date(),
        read: false,
      },
      {
        id: "2",
        title: "API Limits Updated",
        message: "Your monthly API usage limits have been updated. Check your account settings for details.",
        type: "info",
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        read: false,
      },
    ]

    setNotifications(initialNotifications)
    setUnreadCount(initialNotifications.filter((n) => !n.read).length)
  }, [])

  const handleMarkAllAsRead = () => {
    const updatedNotifications = notifications.map((notification) => ({
      ...notification,
      read: true,
    }))

    setNotifications(updatedNotifications)
    setUnreadCount(0)
  }

  const handleDeleteNotification = (id: string) => {
    const updatedNotifications = notifications.filter((notification) => notification.id !== id)
    setNotifications(updatedNotifications)
    setUnreadCount(updatedNotifications.filter((n) => !n.read).length)
  }

  const handleMarkAsRead = (id: string) => {
    const updatedNotifications = notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification,
    )

    setNotifications(updatedNotifications)
    setUnreadCount(updatedNotifications.filter((n) => !n.read).length)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between mt-4">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button size="sm" className="bg-white text-black" onClick={handleMarkAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
        </SheetHeader>

        {notifications.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border border-border rounded-lg relative ${
                  !notification.read ? "bg-muted/30 border-l-4 border-l-primary" : ""
                }`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <Button
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6 bg-white text-black"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteNotification(notification.id)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-white">{notification.title}</h4>
                    {!notification.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(notification.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default NotificationCenter

