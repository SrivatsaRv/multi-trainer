"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    UserCircle,
    ExternalLink,
    MoreVertical,
    ShieldAlert,
    ShieldCheck,
    UserMinus,
    Search,
    History
} from "lucide-react"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface TrainerRosterProps {
    roster: any[]
    onUpdate?: (trainerId: number, data: any) => Promise<void>
}

export function TrainerRoster({ roster, onUpdate }: TrainerRosterProps) {
    const [search, setSearch] = useState("")

    const filteredRoster = roster.filter(item => {
        const name = (item.trainer?.user?.full_name || "").toLowerCase()
        const email = (item.trainer?.user?.email || "").toLowerCase()
        const query = search.toLowerCase()
        return name.includes(query) || email.includes(query)
    })

    return (
        <div className="space-y-4">
            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search trainers..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Trainer Name</TableHead>
                        <TableHead>Compliance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Linked Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredRoster.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                {search ? "No trainers match your search." : "No active trainers in your roster yet."}
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredRoster.map((item) => (
                            <TableRow key={item.trainer.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <UserCircle className="w-8 h-8 text-muted-foreground" />
                                        <div>
                                            <div>{item.trainer?.user?.full_name || item.trainer?.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{item.trainer?.user?.email || item.trainer?.email}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.is_compliant ? (
                                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 gap-1">
                                            <ShieldCheck className="w-3 h-3" />
                                            Compliant
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 gap-1">
                                            <ShieldAlert className="w-3 h-3" />
                                            Non-Compliant
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(item.accepted_at || item.updated_at || Date.now()).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/trainer/${item.trainer.id}/profile`}>
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                View
                                            </Link>
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuLabel>Trainer Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    onClick={() => onUpdate?.(item.trainer.id, { is_compliant: !item.is_compliant })}
                                                >
                                                    {item.is_compliant ? (
                                                        <>
                                                            <ShieldAlert className="mr-2 h-4 w-4" />
                                                            Mark Non-Compliant
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                                            Mark Compliant
                                                        </>
                                                    )}
                                                </DropdownMenuItem>

                                                <DropdownMenuItem>
                                                    <History className="mr-2 h-4 w-4" />
                                                    View History Log
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => onUpdate?.(item.trainer.id, { status: "TERMINATED" })}
                                                >
                                                    <UserMinus className="mr-2 h-4 w-4" />
                                                    Remove Association
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
