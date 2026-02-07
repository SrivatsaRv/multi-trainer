"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ProgressChartProps {
    data: any[];
    exerciseName: string;
}

export function ProgressChart({ data, exerciseName }: ProgressChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">No historical data available</p>
            </div>
        );
    }

    // Transform data for chart
    const chartData = data.map((entry, index) => ({
        session: `S${index + 1}`,
        weight: entry.weight_kg || entry.max_weight || 0,
        volume: entry.total_volume || (entry.weight_kg * entry.reps * entry.sets) || 0,
        date: entry.date || entry.created_at
    }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                    dataKey="session"
                    stroke="#888"
                    style={{ fontSize: '12px' }}
                />
                <YAxis
                    stroke="#888"
                    style={{ fontSize: '12px' }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Weight (kg)"
                />
                <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Volume"
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
