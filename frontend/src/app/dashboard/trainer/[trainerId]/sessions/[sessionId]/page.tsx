"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, User, MapPin, Plus, Trash2, Save, FileText, CheckCircle2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

const ProgressChart = dynamic<{ data: any[]; exerciseName: string }>(
    () => import("@/components/analytics/progress-chart").then(mod => mod.ProgressChart),
    {
        ssr: false,
        loading: () => <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-lg" />
    }
);

interface SetData {
    set_number: number;
    reps: number;
    weight_kg: number;
    rpe: number | null;
}

interface Exercise {
    id: number;
    exercise_id: number;
    name: string;
    sets: number;
    reps: number;
    weight_kg: number;
    notes: string;
    sets_data: SetData[];
}

interface Session {
    id: number;
    start_time: string;
    status: string;
    notes: string;
    client: { id: number; name: string };
    gym: { id: number; name: string };
    exercises: Exercise[];
}

interface TemplateExercise {
    id: number;
    name: string;
    sets: number;
    reps: number;
    notes: string;
}

interface Template {
    id: number;
    name: string;
    description: string;
    exercises: TemplateExercise[];
}

export default function SessionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const trainerId = params.trainerId as string;
    const sessionId = params.sessionId as string;

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<Record<number, any[]>>({});

    // Template State
    const [isTemplateOpen, setIsTemplateOpen] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

    const fetchAnalytics = useCallback(async (data: Session) => {
        if (!data.client?.id) {
            setLoading(false);
            return;
        }

        const uniqueExercises = Array.from(new Set(data.exercises.map((e) => e.exercise_id))) as number[];
        const analyticsMap: Record<number, any[]> = {};

        await Promise.all(uniqueExercises.map(async (exId) => {
            try {
                const history = await api.trainers.getExerciseHistory(trainerId, exId, data.client.id);
                analyticsMap[exId] = history as any[];
            } catch (e) {
                console.error(`Failed to fetch history for ex ${exId}`, e);
            }
        }));

        setAnalytics(analyticsMap);
        setLoading(false);
    }, [trainerId]);

    const fetchSessionData = useCallback(() => {
        setLoading(true);
        api.trainers.getSession(trainerId, sessionId)
            .then(async (data: Session) => {
                // Initialize sets_data if it's missing or empty
                const sanitizedExercises = data.exercises.map((ex: Exercise) => ({
                    ...ex,
                    sets_data: ex.sets_data && ex.sets_data.length > 0
                        ? ex.sets_data
                        : Array.from({ length: ex.sets || 3 }, (_, i) => ({
                            set_number: i + 1,
                            reps: ex.reps || 10,
                            weight_kg: ex.weight_kg || 0,
                            rpe: null
                        }))
                }));
                const sessionData = { ...data, exercises: sanitizedExercises };
                setSession(sessionData);
                fetchAnalytics(sessionData);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [trainerId, sessionId, fetchAnalytics]);

    useEffect(() => {
        if (trainerId && sessionId) {
            fetchSessionData();
        }
    }, [trainerId, sessionId, fetchSessionData]);

    useEffect(() => {
        if (isTemplateOpen && templates.length === 0) {
            api.templates.list()
                .then(data => setTemplates(data))
                .catch(() => toast.error("Failed to load templates"));
        }
    }, [isTemplateOpen, templates.length]);

    const handleStatusUpdate = async (newStatus: string) => {
        if (!session) return;
        try {
            // Optimistic update
            setSession({ ...session, status: newStatus });

            await api.bookings.updateStatus(sessionId, newStatus);
            toast.success(`Session marked as ${newStatus}`);
        } catch {
            toast.error("Failed to update status");
            fetchSessionData(); // Revert on failure
        }
    }

    const handleLoadTemplate = async () => {
        if (!selectedTemplateId) return;
        setIsLoadingTemplate(true);
        try {
            const templateData: Template = await api.templates.get(parseInt(selectedTemplateId));
            if (!templateData.exercises || templateData.exercises.length === 0) {
                toast.error("Template has no exercises");
                setIsLoadingTemplate(false);
                return;
            }

            const logs = templateData.exercises.map((ex) => ({
                exercise_id: ex.id,
                sets: ex.sets || 3,
                reps: ex.reps || 10,
                weight_kg: 0,
                notes: ex.notes || "From Template",
                sets_data: Array.from({ length: ex.sets || 3 }, (_, i) => ({
                    set_number: i + 1,
                    reps: ex.reps || 10,
                    weight_kg: 0,
                    rpe: null
                }))
            }));

            await api.bookings.log(sessionId, logs);
            toast.success(`Loaded ${logs.length} exercises from template`);
            setIsTemplateOpen(false);
            fetchSessionData();
        } catch {
            toast.error("Failed to load template");
        } finally {
            setIsLoadingTemplate(false);
        }
    };

    const [savingLogs, setSavingLogs] = useState(false);

    const autoSaveLogs = async (updatedExercises: Exercise[]) => {
        setSavingLogs(true);
        try {
            const logs = updatedExercises.map((ex) => ({
                exercise_id: ex.exercise_id,
                sets: ex.sets_data.length,
                reps: ex.sets_data[0]?.reps || 0,
                weight_kg: ex.sets_data[0]?.weight_kg || 0,
                notes: ex.notes,
                sets_data: ex.sets_data
            }));
            await api.bookings.log(sessionId, logs);
        } catch (err) {
            console.error("Auto-save failed", err);
        } finally {
            setSavingLogs(false);
        }
    };

    const updateSet = (exIdx: number, setIdx: number, field: string, value: string) => {
        if (!session) return;
        const newExercises = [...session.exercises];
        const val = value === "" ? 0 : parseFloat(value);
        (newExercises[exIdx].sets_data[setIdx] as any)[field] = val;
        setSession({ ...session, exercises: newExercises });
        autoSaveLogs(newExercises);
    };

    const addSet = (exIdx: number) => {
        if (!session) return;
        const newExercises = [...session.exercises];
        const lastSet = newExercises[exIdx].sets_data[newExercises[exIdx].sets_data.length - 1];
        newExercises[exIdx].sets_data.push({
            set_number: newExercises[exIdx].sets_data.length + 1,
            reps: lastSet?.reps || 10,
            weight_kg: lastSet?.weight_kg || 0,
            rpe: null
        });
        setSession({ ...session, exercises: newExercises });
        autoSaveLogs(newExercises);
    };

    const removeSet = (exIdx: number, setIdx: number) => {
        if (!session) return;
        const newExercises = [...session.exercises];
        newExercises[exIdx].sets_data.splice(setIdx, 1);
        newExercises[exIdx].sets_data = newExercises[exIdx].sets_data.map((s, i) => ({ ...s, set_number: i + 1 }));
        setSession({ ...session, exercises: newExercises });
        autoSaveLogs(newExercises);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
    if (!session) return <div className="p-8 text-center text-muted-foreground">Session not found.</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Session Details</h1>
                        <p className="text-sm text-muted-foreground">Workout management & tracking</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {savingLogs && (
                        <div className="flex items-center gap-2 text-xs text-primary animate-pulse mr-4">
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving logs...
                        </div>
                    )}
                    <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <FileText className="w-4 h-4 mr-2" />
                                Load Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Apply Workout Template</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Select Template</Label>
                                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose a template..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map(t => (
                                                <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleLoadTemplate}
                                    disabled={!selectedTemplateId || isLoadingTemplate}
                                >
                                    {isLoadingTemplate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Apply Template"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Separator orientation="vertical" className="h-8 mx-2" />

                    {session.status === 'COMPLETED' ? (
                        <Badge variant="outline" className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-full">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-semibold italic uppercase tracking-wider">Session Complete</span>
                        </Badge>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="text-amber-600 border-amber-600/20 hover:bg-amber-600/10"
                                onClick={() => handleStatusUpdate('LATE')}
                                disabled={session.status === 'LATE'}
                            >
                                Late
                            </Button>
                            <Button
                                variant="outline"
                                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                                onClick={() => handleStatusUpdate('NO_SHOW')}
                                disabled={session.status === 'NO_SHOW'}
                            >
                                No-Show
                            </Button>
                            <Button
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 ml-2"
                                onClick={() => handleStatusUpdate('COMPLETED')}
                            >
                                Mark Completed
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">Session Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">CLIENT</p>
                                <p className="font-semibold">{session.client.name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">SCHEDULED</p>
                                <p className="font-semibold">{new Date(session.start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">FACILITY</p>
                                <p className="font-semibold">{session.gym.name}</p>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <p className="text-xs text-muted-foreground font-medium mb-2 uppercase">Trainer Intent / Session Notes</p>
                            <div className="p-3 bg-muted/30 border rounded-lg text-sm italic text-muted-foreground">
                                {session.notes || "No session notes provided."}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    {session.exercises.length === 0 ? (
                        <Card className="border-dashed text-center py-20">
                            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-muted-foreground">No Exercises Planned</h3>
                            <p className="text-muted-foreground mb-6">Load a template or add exercises to begin tracking.</p>
                            <Button onClick={() => setIsTemplateOpen(true)}>Choose a Template</Button>
                        </Card>
                    ) : (
                        session.exercises.map((ex, exIdx) => (
                            <Card key={exIdx} className="overflow-hidden">
                                <div className="p-4 bg-muted/10 border-b flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className="font-mono">EX {exIdx + 1}</Badge>
                                        <h3 className="text-lg font-bold">{ex.name}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground italic max-w-xs truncate">{ex.notes}</p>
                                </div>

                                <CardContent className="p-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2">
                                        <div className="p-6 border-r">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-16">Set</TableHead>
                                                        <TableHead>Reps</TableHead>
                                                        <TableHead>Weight (kg)</TableHead>
                                                        <TableHead className="text-right"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {ex.sets_data.map((set, setIdx) => (
                                                        <TableRow key={setIdx} className="group">
                                                            <TableCell className="font-mono text-muted-foreground">{set.set_number}</TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    className="w-20 h-9 font-semibold"
                                                                    value={set.reps}
                                                                    data-testid="set-reps"
                                                                    onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    className="w-20 h-9 font-semibold"
                                                                    value={set.weight_kg}
                                                                    data-testid="set-weight"
                                                                    onChange={(e) => updateSet(exIdx, setIdx, 'weight_kg', e.target.value)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={() => removeSet(exIdx, setIdx)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full mt-4 border-dashed"
                                                onClick={() => addSet(exIdx)}
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Add Set
                                            </Button>
                                        </div>

                                        <div className="p-6 bg-muted/5">
                                            <p className="text-xs text-muted-foreground font-medium mb-4 uppercase flex items-center gap-2">
                                                <TrendingUp className="w-3 h-3" /> Historical Performance
                                            </p>
                                            <div className="h-[200px] w-full">
                                                <ProgressChart
                                                    data={analytics[ex.exercise_id] || []}
                                                    exerciseName={ex.name}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
