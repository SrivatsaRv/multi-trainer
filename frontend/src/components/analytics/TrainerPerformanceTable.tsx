"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TrainerTableProps {
    data: {
        id: number;
        name: string;
        sessions: number;
        revenue: number;
        status: string;
    }[]
}

export function TrainerPerformanceTable({ data }: TrainerTableProps) {
    if (!data.length) {
        return (
            <Card className="col-span-4 lg:col-span-3">
                <CardHeader>
                    <CardTitle>Trainer Performance</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
                    No trainer data available yet.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
                <CardTitle>Trainer Performance</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Sessions</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((trainer) => (
                            <TableRow key={trainer.id}>
                                <TableCell className="font-medium">{trainer.id}</TableCell>
                                <TableCell>{trainer.name}</TableCell>
                                <TableCell>{trainer.sessions}</TableCell>
                                <TableCell>₹{trainer.revenue.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={trainer.status === "Active" ? "default" : "secondary"}>
                                        {trainer.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
