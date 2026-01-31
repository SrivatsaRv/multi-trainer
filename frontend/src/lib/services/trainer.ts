import { db } from "@/db";
import { trainerGymAssociations } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export class TrainerService {
    /**
     * Assigns a trainer to a gym, enforcing the "Max 2 Gyms" rule.
     */
    static async assignToGym(trainerId: string, gymId: string) {
        // 1. Check current active assignments
        const currentAssignments = await db
            .select({ value: count() })
            .from(trainerGymAssociations)
            .where(
                and(
                    eq(trainerGymAssociations.trainerId, trainerId),
                    eq(trainerGymAssociations.status, 'ACTIVE')
                )
            );

        const countValue = Number(currentAssignments[0].value);

        if (countValue >= 2) {
            throw new Error("Trainer already assigned to maximum of 2 gyms.");
        }

        // 2. Create new assignment
        return await db.insert(trainerGymAssociations).values({
            trainerId,
            gymId,
            status: 'ACTIVE',
            approvedAt: new Date(),
        }).returning();
    }
}
