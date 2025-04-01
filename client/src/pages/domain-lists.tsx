import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Pencil, Trash2, Info } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

type TempDomain = {
  id: number
  domain: string
  source: "builtin" | "user"
  createdAt: string
}

export default function DomainLists() {
  const [searchQuery, setSearchQuery] = useState("")
  const [newDomain, setNewDomain] = useState("")
  const [editDomain, setEditDomain] = useState<TempDomain | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deleteDomainId, setDeleteDomainId] = useState<number | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["/api/temp-domains"],
    queryFn: async () => {
      const response = await fetch("/api/temp-domains")
      if (!response.ok) throw new Error("Failed to fetch domains")
      const data = await response.json()
      return data
    },
  })

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await apiRequest("/api/temp-domains", "POST", { domain })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/temp-domains"] })
      toast({
        title: "Domain added",
        description: "The domain has been added to the blocklist",
      })
      setNewDomain("")
      setIsAddDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to add domain",
        description: error.message,
      })
    },
  })

  const updateDomainMutation = useMutation({
    mutationFn: async ({ id, domain }: { id: number; domain: string }) => {
      const res = await apiRequest(`/api/temp-domains/${id}`, "PATCH", { domain })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/temp-domains"] })
      toast({
        title: "Domain updated",
        description: "The domain has been updated",
      })
      setEditDomain(null)
      setIsEditDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update domain",
        description: error.message,
      })
    },
  })

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/temp-domains/${id}`, "DELETE")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/temp-domains"] })
      toast({
        title: "Domain deleted",
        description: "The domain has been removed from the blocklist",
      })
      setDeleteDomainId(null)
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete domain",
        description: error.message,
      })
    },
  })

  const handleAddDomain = () => {
    if (!newDomain) return
    addDomainMutation.mutate(newDomain)
  }

  const handleUpdateDomain = () => {
    if (!editDomain || !editDomain.domain) return
    updateDomainMutation.mutate({
      id: editDomain.id,
      domain: editDomain.domain,
    })
  }

  const handleDeleteDomain = () => {
    if (deleteDomainId === null) return
    deleteDomainMutation.mutate(deleteDomainId)
  }

  const filteredDomains = domains.filter((domain: TempDomain) =>
    domain.domain.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Temporary Email Domains</h1>
          <p className="text-muted-foreground">
            Manage the list of known temporary email domains that TempMailGuard will detect
          </p>
        </div>

        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add new temporary email domain</DialogTitle>
                <DialogDescription>
                  Add a domain that should be recognized as a temporary email service
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="domain" className="text-sm font-medium">
                      Domain Name
                    </label>
                    <Input
                      id="domain"
                      placeholder="example.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDomain} disabled={!newDomain || addDomainMutation.isPending}>
                  {addDomainMutation.isPending ? "Adding..." : "Add Domain"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Domain Database</CardTitle>
          <CardDescription>These domains are identified as temporary email providers</CardDescription>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDomains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        {searchQuery ? "No domains match your search" : "No domains in the database"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDomains.map((domain: TempDomain) => (
                      <TableRow key={domain.id}>
                        <TableCell>{domain.domain}</TableCell>
                        <TableCell>
                          {domain.source === "builtin" ? (
                            <Badge variant="outline" className="bg-blue-950/30 text-blue-300 border-blue-800">
                              Built-In
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-950/30 text-green-300 border-green-800">
                              User Added
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{domain.createdAt ? formatDate(domain.createdAt) : "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {domain.source === "user" ? (
                              <>
                                <Dialog
                                  open={isEditDialogOpen && editDomain?.id === domain.id}
                                  onOpenChange={(isOpen) => {
                                    setIsEditDialogOpen(isOpen)
                                    if (!isOpen) setEditDomain(null)
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditDomain(domain)
                                        setIsEditDialogOpen(true)
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                      <span className="sr-only">Edit</span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                      <DialogTitle>Edit domain</DialogTitle>
                                      <DialogDescription>Update the domain name</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <div className="space-y-4">
                                        <div className="space-y-2">
                                          <label htmlFor="edit-domain" className="text-sm font-medium">
                                            Domain Name
                                          </label>
                                          <Input
                                            id="edit-domain"
                                            value={editDomain?.domain || ""}
                                            onChange={(e) => setEditDomain({ ...editDomain!, domain: e.target.value })}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={handleUpdateDomain}
                                        disabled={!editDomain?.domain || updateDomainMutation.isPending}
                                      >
                                        {updateDomainMutation.isPending ? "Saving..." : "Save Changes"}
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setDeleteDomainId(domain.id)}>
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove {domain.domain} from the temporary email domain list. This
                                        action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setDeleteDomainId(null)}>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={handleDeleteDomain}
                                        disabled={deleteDomainMutation.isPending}
                                      >
                                        {deleteDomainMutation.isPending ? "Deleting..." : "Delete"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            ) : (
                              <Button variant="ghost" size="icon" disabled title="Built-in domains cannot be modified">
                                <Info className="h-4 w-4" />
                                <span className="sr-only">Info</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

