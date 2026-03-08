"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import { toast } from "sonner"
import {
    User,
    Activity,
    Target,
    HeartPulse,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Scale,
    Ruler,
    Loader2
} from "lucide-react"

export default function ClientOnboardingPage() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        dob: "",
        gender: "",
        weight_kg: "",
        height_cm: "",
        medical_history: "",
        fitness_goals: "",
        emergency_contact: "",
        address: ""
    })

    const totalSteps = 3
    const progress = (step / totalSteps) * 100

    useEffect(() => {
        if (user && user.role !== "CLIENT") {
            // toast.error("Onboarding is for clients only")
            // router.push("/dashboard")
        }
    }, [user, router])

    const handleNext = () => setStep(s => Math.min(s + 1, totalSteps))
    const handleBack = () => setStep(s => Math.max(s - 1, 1))

    const handleSubmit = async () => {
        setSaving(true)
        try {
            // In a real app, we'd use the user.id from context
            await api.post("/clients/", {
                user_id: user?.id || 1, // Fallback for demo if needed
                ...formData,
                weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
                height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
                dob: formData.dob || null
            })
            toast.success("Profile completed successfully!")
            router.push("/dashboard")
        } catch (e) {
            console.error(e)
            toast.error("Failed to save profile")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-xl space-y-8">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome to Multi-Trainer</h1>
                    <p className="text-muted-foreground">Let&apos;s set up your profile to get the most out of your training.</p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <span>Step {step} of {totalSteps}</span>
                        <span>{Math.round(progress)}% Complete</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <Card className="shadow-lg border-zinc-200/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {step === 1 && <User className="w-5 h-5 text-primary" />}
                            {step === 2 && <Activity className="w-5 h-5 text-primary" />}
                            {step === 3 && <Target className="w-5 h-5 text-primary" />}
                            {step === 1 && "Basic Information"}
                            {step === 2 && "Health & Metrics"}
                            {step === 3 && "Your Fitness Goals"}
                        </CardTitle>
                        <CardDescription>
                            {step === 1 && "We need a few details to personalize your experience."}
                            {step === 2 && "This information helps your trainer design safe and effective workouts."}
                            {step === 3 && "Tell us what you're looking to achieve."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="min-h-[300px]">
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dob">Date of Birth</Label>
                                        <Input
                                            id="dob"
                                            type="date"
                                            value={formData.dob}
                                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gender</Label>
                                        <Select
                                            value={formData.gender}
                                            onValueChange={(v) => setFormData({ ...formData, gender: v })}
                                        >
                                            <SelectTrigger id="gender">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                                <SelectItem value="non-binary">Non-binary</SelectItem>
                                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        placeholder="City, Area"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergency">Emergency Contact</Label>
                                    <Input
                                        id="emergency"
                                        placeholder="Name - Phone Number"
                                        value={formData.emergency_contact}
                                        onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Scale className="w-4 h-4" />
                                            Weight (kg)
                                        </Label>
                                        <Input
                                            type="number"
                                            placeholder="70.5"
                                            value={formData.weight_kg}
                                            onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Ruler className="w-4 h-4" />
                                            Height (cm)
                                        </Label>
                                        <Input
                                            type="number"
                                            placeholder="175"
                                            value={formData.height_cm}
                                            onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <HeartPulse className="w-4 h-4" />
                                        Medical History / Injuries
                                    </Label>
                                    <Textarea
                                        placeholder="Please list any preexisting conditions, past surgeries, or recurring pains."
                                        className="h-32"
                                        value={formData.medical_history}
                                        onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Primary Fitness Goals</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {["Weight Loss", "Muscle Gain", "Athletic Performance", "Flexibility", "General Fitness", "Rehabilitation"].map(goal => (
                                            <Button
                                                key={goal}
                                                type="button"
                                                variant={formData.fitness_goals.includes(goal) ? "default" : "outline"}
                                                className="justify-start font-normal"
                                                onClick={() => {
                                                    const current = formData.fitness_goals.split(", ").filter(Boolean)
                                                    let updated
                                                    if (current.includes(goal)) {
                                                        updated = current.filter(g => g !== goal)
                                                    } else {
                                                        updated = [...current, goal]
                                                    }
                                                    setFormData({ ...formData, fitness_goals: updated.join(", ") })
                                                }}
                                            >
                                                {goal}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Any specific outcome you expect?</Label>
                                    <Textarea
                                        placeholder="e.g. I want to run a 5k in 25 minutes..."
                                        className="h-24"
                                        value={formData.fitness_goals}
                                    // Simple string value for now or append to the selected ones
                                    />
                                </div>
                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex gap-3 items-start mt-4">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <p className="text-sm text-primary/80">
                                        You can handover this device to your client to fill these details privately.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-6 bg-zinc-50/50">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={step === 1 || saving}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        {step < totalSteps ? (
                            <Button onClick={handleNext}>
                                Next
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Complete Profile
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
