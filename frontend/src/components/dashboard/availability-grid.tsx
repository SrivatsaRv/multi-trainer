"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, X } from "lucide-react";

interface AvailabilityGridProps {
    initialAvailability: Record<string, string[]>;
    onSave: (availability: Record<string, string[]>) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00"
];

export function AvailabilityGrid({ initialAvailability, onSave }: AvailabilityGridProps) {
    const [availability, setAvailability] = useState<Record<string, string[]>>(initialAvailability);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const toggleSlot = (day: string, slot: string) => {
        const daySlots = availability[day] || [];
        const newSlots = daySlots.includes(slot)
            ? daySlots.filter(s => s !== slot)
            : [...daySlots, slot].sort();

        setAvailability({ ...availability, [day]: newSlots });
    };

    const clearDay = (day: string) => {
        setAvailability({ ...availability, [day]: [] });
    };

    const addAllSlots = (day: string) => {
        setAvailability({ ...availability, [day]: [...TIME_SLOTS] });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Weekly Availability</CardTitle>
                        <Button onClick={() => onSave(availability)}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {DAYS.map(day => {
                            const daySlots = availability[day] || [];
                            const isExpanded = selectedDay === day;

                            return (
                                <div key={day} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-lg">{day}</h3>
                                            <Badge variant={daySlots.length > 0 ? "default" : "secondary"}>
                                                {daySlots.length} slots
                                            </Badge>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addAllSlots(day)}
                                            >
                                                <Plus className="w-3 h-3 mr-1" />
                                                All Day
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => clearDay(day)}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Clear
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedDay(isExpanded ? null : day)}
                                            >
                                                {isExpanded ? "Collapse" : "Expand"}
                                            </Button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mt-4">
                                            {TIME_SLOTS.map(slot => {
                                                const isSelected = daySlots.includes(slot);
                                                return (
                                                    <button
                                                        key={slot}
                                                        onClick={() => toggleSlot(day, slot)}
                                                        className={`
                                                            px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200
                                                            ${isSelected
                                                                ? "bg-primary text-primary-foreground shadow-sm scale-105"
                                                                : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                                            }
                                                        `}
                                                    >
                                                        {slot}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {!isExpanded && daySlots.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {daySlots.slice(0, 6).map(slot => (
                                                <Badge key={slot} variant="outline" className="text-xs">
                                                    {slot}
                                                </Badge>
                                            ))}
                                            {daySlots.length > 6 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{daySlots.length - 6} more
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
