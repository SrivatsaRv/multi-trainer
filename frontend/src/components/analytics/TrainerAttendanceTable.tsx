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

export function TrainerAttendanceTable({ data }: TrainerTableProps) {
    return (
        <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
                <CardTitle>Trainer Performance</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Sessions</TableHead>
                            <TableHead>Revenue Generated</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((trainer) => (
                            <TableRow key={trainer.id}>
                                <TableCell className="font-medium">{trainer.id}</TableCell>
                                <TableCell>{trainer.name}</TableCell>
                                <TableCell>{trainer.sessions}</TableCell>
                                <TableCell>₹{trainer.revenue}</TableCell>
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
