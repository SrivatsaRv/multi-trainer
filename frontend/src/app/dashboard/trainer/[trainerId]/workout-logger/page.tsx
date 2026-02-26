"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import {
    Loader2,
    Plus,
    Trash2,
    Save,
    ChevronLeft,
    Copy,
    Check,
    History,
    Dumbbell,
    Search
} from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { id: "LEGS", label: "Legs", icon: "🦵" },
    { id: "CHEST", label: "Chest", icon: "👕" },
    { id: "BACK", label: "Back", icon: "🎒" },
    { id: "SHOULDERS", label: "Shoulders", icon: "👔" },
    { id: "ARMS", label: "Arms", icon: "💪" },
    { id: "CORE", label: "Core", icon: "🧘" },
    { id: "CARDIO", label: "Cardio", icon: "🏃" },
];

const EXERCISE_MAP: Record<string, string[]> = {
    LEGS: ["Squat", "Leg Press", "Lunge", "Leg Extension", "Leg Curl", "Deadlift", "Calf Raise"],
    CHEST: ["Bench Press", "Incline Press", "Chest Fly", "Push Up", "Dips", "Cable Cross"],
    BACK: ["Lat Pulldown", "Bent Over Row", "Pull Up", "Deadlift", "Face Pull", "Seated Row"],
    SHOULDERS: ["Overhead Press", "Lateral Raise", "Front Raise", "Reverse Fly", "Shrags"],
    ARMS: ["Bicep Curl", "Tricep Extension", "Hammer Curl", "Skull Crusher", "Preacher Curl"],
    CORE: ["Plank", "Crunch", "Russian Twist", "Leg Raise", "Ab Wheel"],
    CARDIO: ["Treadmill", "Cycling", "Rowing", "Jump Rope", "Elliptical"],
};

type SetData = {
    weight: string;
    reps: string;
};

type ExerciseData = {
    id: string;
    name: string;
    category?: string;
    sets: SetData[];
};

export default function WorkoutLoggerPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const bookingId = searchParams.get('booking');
    const clientId = searchParams.get('client');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Core State
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [exercises, setExercises] = useState<ExerciseData[]>([]);
    const [workoutDate, setWorkoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [notes, setNotes] = useState("");

    // Persistent State Key
    const storageKey = `workout_cache_${params.trainerId}_${clientId || 'adhoc'}`;

    // Load Persistence
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setExercises(parsed.exercises || []);
                setNotes(parsed.notes || "");
                toast.info("Resumed unsaved session");
            } catch (e) { console.error("Cache load failed", e); }
        }
        setLoading(false);
    }, [storageKey]);

    // Save Persistence
    useEffect(() => {
        if (exercises.length > 0 || notes) {
            localStorage.setItem(storageKey, JSON.stringify({ exercises, notes, date: workoutDate }));
        }
    }, [exercises, notes, workoutDate, storageKey]);

    const addExercise = (name: string) => {
        const newEx: ExerciseData = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            sets: [{ weight: "0", reps: "10" }]
        };
        setExercises([...exercises, newEx]);
        setSelectedCategory(null);
        toast.success(`Added ${name}`);
    };

    const removeExercise = (id: string) => {
        setExercises(exercises.filter(ex => ex.id !== id));
    };

    const updateSet = (exId: string, setIndex: number, field: keyof SetData, value: string) => {
        setExercises(exercises.map(ex => {
            if (ex.id !== exId) return ex;
            const newSets = [...ex.sets];
            newSets[setIndex] = { ...newSets[setIndex], [field]: value };
            return { ...ex, sets: newSets };
        }));
    };

    const adjustValue = (exId: string, setIndex: number, field: keyof SetData, delta: number) => {
        setExercises(exercises.map(ex => {
            if (ex.id !== exId) return ex;
            const newSets = [...ex.sets];
            const current = parseFloat(newSets[setIndex][field]) || 0;
            newSets[setIndex] = { ...newSets[setIndex], [field]: (current + delta).toString() };
            return { ...ex, sets: newSets };
        }));
    };

    const duplicatePrevSet = (exId: string) => {
        setExercises(exercises.map(ex => {
            if (ex.id !== exId) return ex;
            const lastSet = ex.sets[ex.sets.length - 1];
            return { ...ex, sets: [...ex.sets, { ...lastSet }] };
        }));
    };

    const removeSet = (exId: string, setIndex: number) => {
        setExercises(exercises.map(ex => {
            if (ex.id !== exId) return ex;
            if (ex.sets.length <= 1) return ex;
            return { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) };
        }));
    };

    const handleFinish = async () => {
        if (exercises.length === 0) return toast.error("Add at least one exercise");
        setSubmitting(true);
        try {
            const payload = {
                client_id: clientId ? parseInt(clientId) : undefined,
                trainer_id: parseInt(params.trainerId as string),
                booking_id: bookingId ? parseInt(bookingId) : undefined,
                date: new Date(workoutDate).toISOString(),
                name: selectedCategory ? `${selectedCategory} Session` : "Workout Session",
                workout_category: selectedCategory,
                notes: notes,
                exercises: exercises.map(ex => ({
                    exercise_name: ex.name,
                    sets: ex.sets.map(s => ({
                        weight: parseFloat(s.weight) || 0,
                        reps: parseInt(s.reps) || 0
                    }))
                }))
            };

            await api.workouts.createLog(payload);

            // If linked to booking, mark booking as COMPLETED
            if (bookingId) {
                await api.bookings.updateStatus(bookingId, "COMPLETED");
            }

            toast.success("Workout saved!");
            localStorage.removeItem(storageKey);
            router.push(`/dashboard/trainer/${params.trainerId}`);
        } catch (err) {
            toast.error("Finish failed. Check connection.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 pb-32 max-w-lg mx-auto md:max-w-3xl lg:max-w-4xl px-4 md:px-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 px-1">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                        <ChevronLeft />
                    </Button>
                    <h1 className="text-2xl font-black tracking-tight">Logger</h1>
                </div>
                <Button
                    variant="ghost"
                    className="text-destructive font-bold"
                    onClick={() => {
                        if (confirm("Discard workout?")) {
                            localStorage.removeItem(storageKey);
                            router.back();
                        }
                    }}
                >
                    Discard
                </Button>
            </div>

            {/* Category Grid (Start of Flow) */}
            {!selectedCategory && exercises.length === 0 && (
                <div className="space-y-4">
                    <p className="text-center font-bold text-muted-foreground uppercase text-xs tracking-widest">Select Focus</p>
                    <div className="grid grid-cols-2 gap-3">
                        {CATEGORIES.map(cat => (
                            <Button
                                key={cat.id}
                                variant="outline"
                                className="h-24 flex-col gap-2 rounded-2xl border-2 hover:border-primary transition-all active:scale-95"
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                <span className="text-2xl">{cat.icon}</span>
                                <span className="font-black">{cat.label}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Exercise Selection for Category */}
            {selectedCategory && (
                <Card className="border-2 border-primary/20 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-black">{selectedCategory} Exercises</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)} className="font-bold">Change</Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                        {EXERCISE_MAP[selectedCategory].map(ex => (
                            <Button
                                key={ex}
                                variant="secondary"
                                className="justify-start font-bold h-12 truncate"
                                onClick={() => addExercise(ex)}
                            >
                                {ex}
                            </Button>
                        ))}
                        <div className="col-span-2 mt-2 pt-2 border-t">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Custom Exercise..."
                                    className="h-10 font-bold"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addExercise(e.currentTarget.value);
                                            e.currentTarget.value = "";
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Log List */}
            <div className="space-y-4">
                {exercises.map((ex, exIdx) => (
                    <Card key={ex.id} className="border-2 shadow-sm overflow-hidden">
                        <CardHeader className="p-4 bg-muted/30 flex flex-row items-center justify-between border-b">
                            <div className="flex items-center gap-3">
                                <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center bg-primary font-black">
                                    {exIdx + 1}
                                </Badge>
                                <h3 className="font-black text-lg">{ex.name}</h3>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeExercise(ex.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {ex.sets.map((set, sIdx) => (
                                <div key={sIdx} className="p-4 border-b last:border-0 relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">SET {sIdx + 1}</span>
                                        {ex.sets.length > 1 && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive " onClick={() => removeSet(ex.id, sIdx)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Weight Controls */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">WEIGHT (KG)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={set.weight}
                                                    onChange={(e) => updateSet(ex.id, sIdx, 'weight', e.target.value)}
                                                    className="h-12 text-center text-xl font-black bg-muted/40 border-0 focus-visible:ring-primary rounded-xl"
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                <Button size="sm" variant="outline" className="h-8 font-bold border-muted" onClick={() => adjustValue(ex.id, sIdx, 'weight', 1)}>+1</Button>
                                                <Button size="sm" variant="outline" className="h-8 font-bold border-muted" onClick={() => adjustValue(ex.id, sIdx, 'weight', 2.5)}>+2.5</Button>
                                                <Button size="sm" variant="outline" className="h-8 font-bold border-muted" onClick={() => adjustValue(ex.id, sIdx, 'weight', 5)}>+5</Button>
                                            </div>
                                        </div>

                                        {/* Reps Controls */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">REPS</Label>
                                            <Input
                                                type="number"
                                                value={set.reps}
                                                onChange={(e) => updateSet(ex.id, sIdx, 'reps', e.target.value)}
                                                className="h-12 text-center text-xl font-black bg-muted/40 border-0 focus-visible:ring-primary rounded-xl"
                                            />
                                            <div className="grid grid-cols-3 gap-1">
                                                <Button size="sm" variant="outline" className="h-8 font-bold border-muted" onClick={() => adjustValue(ex.id, sIdx, 'reps', 1)}>+1</Button>
                                                <Button size="sm" variant="outline" className="h-8 font-bold border-muted" onClick={() => adjustValue(ex.id, sIdx, 'reps', -1)}>-</Button>
                                                <Button size="sm" variant="outline" className="h-8 font-bold border-muted" onClick={() => adjustValue(ex.id, sIdx, 'reps', 5)}>+5</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="p-3 bg-muted/10">
                                <Button
                                    variant="ghost"
                                    className="w-full font-black text-primary border-2 border-dashed border-primary/20 h-12 gap-2"
                                    onClick={() => duplicatePrevSet(ex.id)}
                                >
                                    <Copy className="w-4 h-4" />
                                    Same as Above
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Add More Button */}
            {exercises.length > 0 && (
                <Button
                    variant="outline"
                    className="w-full border-2 border-dashed h-16 font-black text-lg gap-2"
                    onClick={() => setSelectedCategory("LEGS")} // Just default to trigger the list
                >
                    <Plus className="w-6 h-6" /> Add Another Exercise
                </Button>
            )}

            {/* Finalize Button */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg z-50">
                <Button
                    size="lg"
                    disabled={submitting || exercises.length === 0}
                    className="w-full h-16 rounded-2xl shadow-2xl shadow-emerald-500/30 bg-emerald-600 hover:bg-emerald-700 font-black text-xl gap-3"
                    onClick={handleFinish}
                >
                    {submitting ? <Loader2 className="animate-spin" /> : <Save className="w-6 h-6" />}
                    Finish & Save
                </Button>
            </div>
        </div>
    );
}
