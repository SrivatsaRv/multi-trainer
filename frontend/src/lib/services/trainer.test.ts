import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrainerService } from './trainer';
import { db } from '@/db';

// Mock DB
vi.mock('@/db', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
    },
}));

describe('TrainerService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should allow assigning to a gym if trainer has 0 active gyms', async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ value: 0 }]),
            }),
        });

        (db.insert as any).mockReturnValue({
            values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ id: 'new-association-id' }]),
            }),
        });

        const result = await TrainerService.assignToGym('trainer-1', 'gym-1');
        expect(result[0].id).toBe('new-association-id');
    });

    it('should throw error if trainer has 2 active gyms', async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ value: 2 }]),
            }),
        });

        await expect(TrainerService.assignToGym('trainer-1', 'gym-3'))
            .rejects.toThrow("Trainer already assigned to maximum of 2 gyms.");
    });
});
