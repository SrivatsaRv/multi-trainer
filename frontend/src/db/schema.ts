import { pgTable, text, timestamp, uuid, boolean, integer, pgEnum, primaryKey } from 'drizzle-orm/pg-core';

// Enums for Roles and Statuses
export const userRoleEnum = pgEnum('user_role', ['SAAS_ADMIN', 'GYM_ADMIN', 'TRAINER']);
export const verificationStatusEnum = pgEnum('verification_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const associationStatusEnum = pgEnum('association_status', ['REQUESTED', 'ACTIVE', 'REJECTED', 'ENDED']);

// Users Table (Auth)
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name'),
    role: userRoleEnum('role').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Gyms Table
export const gyms = pgTable('gyms', {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id').references(() => users.id).notNull(),
    name: text('name').notNull(),
    location: text('location').notNull(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    website: text('website'),
    logoUrl: text('logo_url'),
    description: text('description'),
    operatingHours: text('operating_hours'), // e.g., "Mon-Fri: 6am-10pm"
    amenities: text('amenities'), // Comma separated list
    verificationStatus: verificationStatusEnum('verification_status').default('PENDING').notNull(),
    verifiedAt: timestamp('verified_at'),
    verifiedBy: uuid('verified_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Trainers Table
export const trainers = pgTable('trainers', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    phone: text('phone'),
    bio: text('bio'),
    specializations: text('specializations'), // e.g., "Strength, HIIT"
    certifications: text('certifications'), // e.g., "ACE, NASM"
    experienceYears: integer('experience_years').default(0),
    portfolioUrl: text('portfolio_url'),
    instagramUrl: text('instagram_url'),
    linkedinUrl: text('linkedin_url'),
    verificationStatus: verificationStatusEnum('verification_status').default('PENDING').notNull(),
    verifiedAt: timestamp('verified_at'),
    verifiedBy: uuid('verified_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Members Table (Managed Entities)
export const members = pgTable('members', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    assignedTrainerId: uuid('assigned_trainer_id').references(() => trainers.id),
    primaryGymId: uuid('primary_gym_id').references(() => gyms.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Join Table for Trainers and Gyms (Many-to-Many)
// Constraints for "Max 2 Gyms" will be handled at the Application/Service layer via triggers or app logic.
export const trainerGymAssociations = pgTable('trainer_gym_associations', {
    id: uuid('id').defaultRandom().primaryKey(),
    trainerId: uuid('trainer_id').references(() => trainers.id).notNull(),
    gymId: uuid('gym_id').references(() => gyms.id).notNull(),
    status: associationStatusEnum('status').default('REQUESTED').notNull(),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Multi-Gym Membership for Members (Optional based on requirements)
export const memberGymMemberships = pgTable('member_gym_memberships', {
    memberId: uuid('member_id').references(() => members.id).notNull(),
    gymId: uuid('gym_id').references(() => gyms.id).notNull(),
}, (t) => ({
    pk: primaryKey({ columns: [t.memberId, t.gymId] }),
}));
