"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Loader2, Plus, Trash2, Save, Dumbbell, Calendar, User, Search, ChevronLeft } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

// Common exercises for quick add
const COMMON_EXERCISES = [
    "Squat", "Bench Press", "Deadlift", "Overhead Press",
    "Pull Up", "Dumbbell Row", "Lunge", "Leg Press",
    "Lat Pulldown", "Push Up", "Plank", "Russian Twist"
];

type SetData = {
    weight: string;
    reps: string;
    rpe?: string;
};

type ExerciseData = {
    id: string; // temp id
    name: string;
    sets: SetData[];
};

export default function WorkoutLoggerPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    // Data
    const [clients, setClients] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedClientId, setSelectedClientId] = useState<string>(searchParams.get('client') || "");
    const [workoutDate, setWorkoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [workoutName, setWorkoutName] = useState("");
    const [notes, setNotes] = useState("");
    const [exercises, setExercises] = useState<ExerciseData[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Add Exercise State
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [searchExercise, setSearchExercise] = useState("");

    useEffect(() => {
        async function fetchData() {
            try {
                const [clientsData, templatesData] = await Promise.all([
                    api.trainers.getClients(params.trainerId as string),
                    api.workouts.getTemplates()
                ]);
                setClients(clientsData);
                setTemplates(templatesData);
            } catch (err) {
                console.error("Failed to fetch data:", err);
            } finally {
                setLoading(false);
            }
        }
        if (params.trainerId) fetchData();
    }, [params.trainerId]);

    const handleLoadTemplate = (templateId: string) => {
        const template = templates.find(t => t.id.toString() === templateId);
        if (template) {
            setWorkoutName(template.name);
            if (template.workout_template_exercises) {
                const newExercises = template.workout_template_exercises.map((te: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: te.exercise?.name || "Unknown Exercise",
                    sets: Array(te.sets).fill({ weight: "", reps: te.reps?.toString() || "", rpe: "" })
                }));
                setExercises(newExercises);
                toast.success(`Loaded template: ${template.name}`);
            } else {
                toast.info("Template has no exercises");
            }
        }
    };

    const handleAddExercise = (name: string) => {
        const newExercise: ExerciseData = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            sets: [{ weight: "", reps: "", rpe: "" }]
        };
        setExercises([...exercises, newExercise]);
        setIsAddSheetOpen(false);
        setSearchExercise("");
        toast.success(`Added ${name}`);
    };

    const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetData, value: string) => {
        const updatedExercises = [...exercises];
        updatedExercises[exerciseIndex].sets[setIndex][field] = value;
        setExercises(updatedExercises);
    };

    const addSet = (exerciseIndex: number) => {
        const updatedExercises = [...exercises];
        // Copy values from previous set for convenience
        const prevSet = updatedExercises[exerciseIndex].sets[updatedExercises[exerciseIndex].sets.length - 1];
        updatedExercises[exerciseIndex].sets.push({
            weight: prevSet ? prevSet.weight : "",
            reps: prevSet ? prevSet.reps : "",
            rpe: ""
        });
        setExercises(updatedExercises);
    };

    const removeSet = (exerciseIndex: number, setIndex: number) => {
        const updatedExercises = [...exercises];
        if (updatedExercises[exerciseIndex].sets.length > 1) {
            updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
            setExercises(updatedExercises);
        }
    };

    const removeExercise = (index: number) => {
        const updated = [...exercises];
        updated.splice(index, 1);
        setExercises(updated);
    };

    const handleSaveLog = async () => {
        if (!selectedClientId) {
            toast.error("Please select a client");
            return;
        }
        if (exercises.length === 0) {
            toast.error("Please add at least one exercise");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                client_id: parseInt(selectedClientId),
                trainer_id: parseInt(params.trainerId as string),
                date: new Date(workoutDate).toISOString(),
                name: workoutName || "Workout Session",
                notes: notes,
                exercises: exercises.map(ex => ({
                    exercise_name: ex.name,
                    sets: ex.sets.map(s => ({
                        weight: parseFloat(s.weight) || 0,
                        reps: parseInt(s.reps) || 0,
                        rpe: parseFloat(s.rpe || "0") || 0
                    }))
                }))
            };

            await api.workouts.createLog(payload);
            toast.success("Workout logged successfully!");
            router.push(`/dashboard/trainer/${params.trainerId}/clients/${selectedClientId}`);
        } catch (err) {
            toast.error("Failed to save workout log");
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    const filteredCommonExercises = COMMON_EXERCISES.filter(ex =>
        ex.toLowerCase().includes(searchExercise.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-24 md:pb-10 max-w-2xl mx-auto md:mx-0">
            <div className="flex items-center gap-4 border-b pb-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold">Log Workout</h1>
            </div>

            <div className="grid gap-4">
                {/* 1. Client & Date */}
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={workoutDate}
                                    onChange={(e) => setWorkoutDate(e.target.value)}
                                />
                            </div>
                        </div>
                        {templates.length > 0 && (
                            <div className="space-y-2">
                                <Label>Load From Template</Label>
                                <Select onValueChange={handleLoadTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map(t => (
                                            <SelectItem key={t.id} value={t.id.toString()}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Workout Name</Label>
                            <Input
                                placeholder="e.g. Upper Body Power"
                                value={workoutName}
                                onChange={(e) => setWorkoutName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input
                                placeholder="Session notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Exercises List */}
                <div className="space-y-4">
                    {exercises.map((exercise, exIndex) => (
                        <Card key={exercise.id} className="relative overflow-hidden">
                            <CardHeader className="py-3 bg-muted/30 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                                        {exIndex + 1}
                                    </Badge>
                                    {exercise.name}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeExercise(exIndex)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-3">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="w-12 text-center text-xs">Set</TableHead>
                                            <TableHead className="text-center text-xs">kg</TableHead>
                                            <TableHead className="text-center text-xs">Reps</TableHead>
                                            <TableHead className="text-center text-xs">RPE</TableHead>
                                            <TableHead className="w-8"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {exercise.sets.map((set, setIndex) => (
                                            <TableRow key={setIndex} className="hover:bg-transparent border-none">
                                                <TableCell className="py-2 text-center">
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground mx-auto">
                                                        {setIndex + 1}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        className="h-9 text-center px-1"
                                                        value={set.weight}
                                                        onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        className="h-9 text-center px-1"
                                                        value={set.reps}
                                                        onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="-"
                                                        className="h-9 text-center px-1"
                                                        value={set.rpe}
                                                        onChange={(e) => updateSet(exIndex, setIndex, 'rpe', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-2 text-center">
                                                    {exercise.sets.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => removeSet(exIndex, setIndex)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full mt-3 text-xs border-dashed border h-8"
                                    onClick={() => addSet(exIndex)}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add Set
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
                        <SheetTrigger asChild>
                            <Button className="w-full py-6 text-base" variant="outline">
                                <Plus className="w-5 h-5 mr-2" /> Add Exercise
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[80vh]">
                            <SheetHeader>
                                <SheetTitle>Add Exercise</SheetTitle>
                                <SheetDescription>Select from common exercises or type to create custom.</SheetDescription>
                            </SheetHeader>
                            <div className="py-4 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search or type custom name..."
                                        className="pl-9"
                                        value={searchExercise}
                                        onChange={(e) => setSearchExercise(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && searchExercise) {
                                                handleAddExercise(searchExercise);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[50vh]">
                                    {searchExercise && !filteredCommonExercises.some(ex => ex.toLowerCase() === searchExercise.toLowerCase()) && (
                                        <Button variant="secondary" className="justify-start col-span-2" onClick={() => handleAddExercise(searchExercise)}>
                                            <Plus className="w-4 h-4 mr-2" /> Create "{searchExercise}"
                                        </Button>
                                    )}
                                    {filteredCommonExercises.map(ex => (
                                        <Button key={ex} variant="outline" className="justify-start" onClick={() => handleAddExercise(ex)}>
                                            {ex}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Save Button */}
                <div className="sticky bottom-4 pt-2">
                    <Button size="lg" className="w-full shadow-lg" onClick={handleSaveLog} disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        Finish Workout
                    </Button>
                </div>
            </div>
        </div>
    );
}
