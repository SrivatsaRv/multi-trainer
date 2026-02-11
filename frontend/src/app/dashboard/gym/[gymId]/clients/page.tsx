"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import {
    Users,
    UserPlus,
    Search,
    Filter,
    MoreVertical,
    FileDown,
    Trash2,
    Loader2,
    LayoutGrid,
    List as ListIcon,
    ChevronLeft,
    ChevronRight
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Client {
    id: number
    name: string
    email: string
    subscription: {
        status: string
        sessions_remaining: number
        expiry_date: string
    }
}

export default function GymClientsPage({ params }: { params: Promise<{ gymId: string }> }) {
    const resolvedParams = use(params)
    const gymId = resolvedParams.gymId
    const router = useRouter()

    const [clients, setClients] = useState<Client[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [pageSize, setPageSize] = useState(25)
    const [currentPage, setCurrentPage] = useState(1)

    const fetchData = async () => {
        setLoading(true)
        try {
            const skip = (currentPage - 1) * pageSize
            const data = await api.gyms.getClients(gymId, skip, pageSize, search)
            setClients(data.items)
            setTotal(data.total)
        } catch (e) {
            console.error(e)
            toast.error("Failed to load clients")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData()
        }, 300)
        return () => clearTimeout(timer)
    }, [gymId, currentPage, pageSize, search])

    const totalPages = Math.ceil(total / pageSize)

    if (loading && clients.length === 0) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Client Management</h1>
                    <p className="text-muted-foreground">Manage your member directory and subscriptions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <FileDown className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={() => toast.info("Onboarding flow coming soon")}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Client
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by ID, Name or Email..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setCurrentPage(1)
                        }}
                    />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                            setPageSize(Number(v))
                            setCurrentPage(1)
                        }}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Page Size" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25 per page</SelectItem>
                            <SelectItem value="50">50 per page</SelectItem>
                            <SelectItem value="100">100 per page</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Subscription</TableHead>
                                <TableHead>Sessions</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        {loading ? "Loading clients..." : "No clients found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                clients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-mono text-xs">#{client.id}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{client.name}</span>
                                                <span className="text-xs text-muted-foreground">{client.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={client.subscription.status === "ACTIVE" ? "default" : "secondary"}>
                                                {client.subscription.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-amber-600">
                                                {client.subscription.sessions_remaining}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-1">remaining</span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {client.subscription.expiry_date ? new Date(client.subscription.expiry_date).toLocaleDateString() : "N/A"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/gym/${gymId}/clients/${client.id}`)}>
                                                        View Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>Assign Trainer</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive">
                                                        Terminate Subscription
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Showing {Math.min(clients.length, pageSize)} of {total} clients
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1 || loading}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            // Simple pagination logic for now
                            const pageNum = i + 1
                            return (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    className="w-8 h-8 p-0"
                                    onClick={() => setCurrentPage(pageNum)}
                                >
                                    {pageNum}
                                </Button>
                            )
                        })}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages || loading}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
