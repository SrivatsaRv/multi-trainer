"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OccupancyChartProps {
    data: { date: string; occupancy: number }[]
}

export function OccupancyChart({ data }: OccupancyChartProps) {
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Gym Occupancy (%)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip />
                        <Area
                            type="monotone"
                            dataKey="occupancy"
                            stroke="#8884d8"
                            fillOpacity={1}
                            fill="url(#colorOccupancy)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
