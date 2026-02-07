# Product Requirements Document (Reverse-Engineered)
## Multi-Trainer SaaS Platform

**Document Version:** 1.0  
**Generated:** February 2026  
**Platform Type:** B2B2C Fitness Management SaaS  

---

## 1. Executive Summary

### 1.1 Product Vision
A comprehensive fitness management platform that connects Gyms, Trainers, and Clients in a unified ecosystem. The platform enables gym owners to manage facilities, trainers to deliver personalized training, and clients to track their fitness journey.

### 1.2 Target Users
- **SaaS Admins**: Platform administrators managing verifications and system oversight
- **Gym Owners/Admins**: Facility managers overseeing trainers, packages, and operations
- **Trainers**: Fitness professionals delivering training sessions and tracking client progress
- **Clients**: End-users booking sessions and tracking workouts

### 1.3 Core Value Propositions
- **For Gyms**: Centralized facility management, trainer roster control, revenue analytics
- **For Trainers**: Session scheduling, workout logging, client progress tracking, multi-gym flexibility
- **For Clients**: Easy booking, workout history, progress visualization
- **For Platform**: Scalable multi-tenant architecture with verification workflows

---

## 2. User Roles & Permissions

### 2.1 Role Hierarchy

#### SAAS_ADMIN
**Capabilities:**
- View all pending gym and trainer verifications
- Approve/reject gym registrations
- Approve/reject trainer profiles
- Access platform-wide analytics
- Override authorization on any resource

**Restrictions:**
- Cannot directly manage gym operations
- Cannot book sessions on behalf of users

#### GYM_ADMIN
**Capabilities:**
- Create and manage gym profile (name, location, slug, photos, amenities, operating hours)
- View and manage trainer associations (approve/reject/terminate)
- Create and manage session packages (pricing, session counts)
- View gym analytics (revenue, attendance, trainer performance)
- View all clients associated with the gym
- View all bookings at the facility

**Restrictions:**
- Can only manage their own gym
- Cannot modify trainer profiles (only association status)
- Cannot directly book sessions for clients

#### TRAINER
**Capabilities:**
- Create and manage trainer profile (bio, specializations, certifications, availability)
- Apply to multiple gyms
- View and manage gym associations
- View assigned bookings/sessions
- Log workout exercises for sessions
- Load workout templates into sessions
- View client list and individual client analytics
- View exercise history for clients
- Onboard new clients (create user + subscription + first booking)
- Update session status (scheduled, completed, cancelled, no-show, late)

**Restrictions:**
- Cannot approve own gym associations (requires gym admin approval)
- Cannot modify gym details
- Can only view clients they've trained

#### CLIENT
**Capabilities:**
- Book sessions with trainers (subject to subscription credits)
- View own booking history
- View own workout logs
- Track exercise progress

**Restrictions:**
- Cannot create bookings without active subscription
- Cannot view other clients' data
- Cannot modify trainer or gym information

---

## 3. Core Features & Capabilities

### 3.1 Authentication & Session Management

**Registration Flow:**
- User registers with email, password, full_name, and role
- System creates User record with hashed password (bcrypt)
- Auto-creates empty profile based on role:
  - TRAINER → Creates Trainer profile (status: PENDING)
  - GYM_ADMIN → Creates Gym profile with placeholder data (status: PENDING)
- Auto-login after registration (creates session token)

**Login Flow:**
- OAuth2 password flow (username = email)
- JWT token generation (HS256 algorithm)
- Database-backed session management (UserSession table)
- One active session per user (previous sessions invalidated on new login)
- Session includes: token, user_id, expires_at, ip_address, user_agent, last_activity

**Session Security:**
- Token expiration: 8 days (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)
- Automatic session cleanup for expired tokens
- Session invalidation on logout
- Activity tracking (last_activity updated on each request)

**Authorization:**
- JWT token validation on protected endpoints
- Role-based access control (RBAC)
- Resource ownership validation (e.g., trainer can only modify own profile)
- Admin override capabilities for SAAS_ADMIN role

### 3.2 Verification & Onboarding

**Gym Verification States:**
- **DRAFT**: Initial state, incomplete profile
- **PENDING**: Submitted for review
- **APPROVED**: Verified and active
- **REJECTED**: Denied by platform admin

**Trainer Verification States:**
- **DRAFT**: Initial state, incomplete profile
- **PENDING**: Submitted for review
- **APPROVED**: Verified and can accept bookings
- **REJECTED**: Denied by platform admin

**Onboarding Requirements:**

*Gym Onboarding:*
- Required: name, location, slug (unique identifier)
- Optional: description, photos[], amenities[], operating_hours{}, social_links{}, business_reg_number
- Auto-transitions to PENDING after profile completion

*Trainer Onboarding:*
- Required: bio (minimal friction)
- Optional: headshot_url, specializations[], certifications[], experience_years, social_links{}, availability{}
- Auto-transitions to PENDING after profile completion

**Admin Verification Dashboard:**
- Lists all PENDING gyms and trainers
- One-click approve/reject actions
- Updates verification_status field
- No notification system (future enhancement)


### 3.3 Gym-Trainer Association Management

**Association States:**
- **PENDING**: Trainer applied, awaiting gym approval
- **INVITED**: Gym invited trainer (not implemented in current version)
- **ACTIVE**: Association approved, trainer can operate at gym
- **REJECTED**: Gym rejected trainer application
- **TERMINATED**: Association ended by either party

**Association Flow:**
1. Trainer applies to gym via POST `/trainers/{trainer_id}/gyms`
2. Association created with status=PENDING
3. Gym admin views pending requests via GET `/gyms/{gym_id}/trainers`
4. Gym admin approves/rejects via PATCH `/gyms/{gym_id}/trainers/{trainer_id}/status`
5. Status changes to ACTIVE or REJECTED

**Business Rules:**
- Trainers can be associated with multiple gyms simultaneously
- Gym admins can only manage associations for their own gym
- Trainers can only apply to APPROVED gyms
- Association status affects booking availability

### 3.4 Smart Booking System

**Booking Creation Requirements:**
1. **Active Subscription**: Client must have active subscription with available credits
2. **Trainer Availability**: Booking time must match trainer's availability slots
3. **No Conflicts**: No overlapping bookings for the same trainer
4. **Gym Association**: Trainer must be ACTIVE at the gym

**Subscription Validation:**
- Check ClientSubscription.status = ACTIVE
- Check ClientSubscription.expiry_date >= current_date
- Check sessions_used < total_sessions
- Auto-deduct credit on successful booking (sessions_used += 1)

**Availability Validation:**
- Trainer.availability structure: `{ "Monday": ["09:00-17:00"], "Tuesday": [...] }`
- Booking start_time must fall within defined slots
- Day-of-week matching required
- Hour-based validation (booking hour must be within slot range)

**Conflict Detection:**
- Query existing bookings for trainer_id
- Check for time overlap: `existing.start_time < new.end_time AND existing.end_time > new.start_time`
- Only consider SCHEDULED and COMPLETED bookings (ignore CANCELLED)
- Reject booking if conflict found

**Booking States:**
- **SCHEDULED**: Default state, session upcoming
- **COMPLETED**: Session finished successfully
- **CANCELLED**: Session cancelled by client or trainer
- **NO_SHOW**: Client didn't attend
- **LATE**: Client arrived late (tracking only)

**Booking Duration:**
- Fixed 1-hour sessions (start_time + 1 hour = end_time)
- No variable duration support in current version

### 3.5 Session Package Management

**Package Structure:**
- name (e.g., "10 Session Pack")
- description
- price_inr (integer, stored in INR)
- session_count (number of sessions included)
- gym_id (FK → Gym)

**Package Operations:**
- Create: POST `/gyms/{gym_id}/packages` (gym admin only)
- Update: PUT `/gyms/{gym_id}/packages/{package_id}` (gym admin only)
- Delete: DELETE `/gyms/{gym_id}/packages/{package_id}` (gym admin only)
- List: GET `/gyms/{gym_id}/packages` (authenticated users)

**Client Subscription:**
- user_id, gym_id, session_package_id
- total_sessions (copied from package)
- sessions_used (incremented on booking)
- start_date, expiry_date
- status (ACTIVE, EXPIRED, PAUSED, CANCELLED)

### 3.6 Workout Template System

**Global Templates:**
- Pre-defined workout templates accessible to all trainers
- No user-specific or trainer-specific templates
- Template includes: name, description, list of exercises with sets/reps

**Exercise Library:**
- name, description, category, muscle_group, unit_type, video_url
- Categories: STRENGTH, CARDIO, FLEXIBILITY, HIIT
- Muscle Groups: LEGS, CHEST, BACK, SHOULDERS, ARMS, CORE, FULL_BODY, CARDIO
- Measurement Units: WEIGHT_REPS, REPS_ONLY, TIME_DISTANCE, TIME_ONLY

**Template Operations:**
- List Templates: GET `/templates/`
- Get Template Details: GET `/templates/{template_id}` (includes exercises)
- Load into Session: Trainer copies template exercises to WorkoutSessionExercise


### 3.7 Workout Logging & Tracking

**Workout Session Structure:**
```
WorkoutSessionExercise (per booking)
├── booking_id (FK → Booking)
├── exercise_id (FK → Exercise)
├── sets (summary count)
├── reps (summary, optional)
├── weight_kg (summary, optional)
├── duration_seconds (summary, optional)
├── distance_meters (summary, optional)
└── notes

WorkoutSet (detailed tracking)
├── session_exercise_id (FK → WorkoutSessionExercise)
├── set_number (1, 2, 3...)
├── reps
├── weight_kg
├── rpe (Rate of Perceived Exertion, 1-10 scale)
├── duration_seconds
├── distance_meters
└── is_completed (boolean)
```

**Logging Flow:**
1. Trainer opens session via GET `/trainers/{trainer_id}/sessions/{session_id}`
2. Trainer adds exercises (manually or from template)
3. Trainer logs sets via POST `/bookings/{booking_id}/log`
4. System creates WorkoutSessionExercise + WorkoutSet records
5. Summary fields auto-populated from set data

**Exercise History:**
- GET `/trainers/{trainer_id}/exercises/{exercise_id}/history?client_id={client_id}`
- Returns all historical sets for specific exercise and client
- Used for progress tracking and 1RM calculations
- Ordered by date (most recent first)

**Progress Metrics:**
- Volume tracking: sets × reps × weight
- 1RM estimation: Based on weight and reps
- RPE trends: Perceived exertion over time
- Frequency: Sessions per week/month

### 3.8 Analytics & Reporting

**Trainer Analytics:**
- Endpoint: GET `/trainers/{trainer_id}/analytics`
- Metrics:
  - Total sessions completed
  - Active clients count
  - Revenue generated (estimated)
  - Session completion rate
  - Average sessions per client

**Gym Analytics:**
- Endpoint: GET `/gyms/{gym_id}/analytics/overview`
- Metrics:
  - **Total Revenue**: Sum of all package sales (via ClientSubscription)
  - **Attendance Trends**: Daily session counts (last 30 days)
  - **Trainer Performance**: Per-trainer stats (sessions, clients, revenue)
  - **Active Clients**: Unique clients with bookings
  - **Occupancy Rate**: (total_sessions / max_capacity) × 100

**Trainer Performance Breakdown:**
- trainer_id, name
- completed_sessions (count of COMPLETED bookings)
- total_clients (distinct client count)
- business_value (sessions × average_price)

**Client Analytics:**
- Endpoint: GET `/trainers/{trainer_id}/clients/{client_id}/analytics/overview`
- Metrics:
  - Total sessions completed
  - Workout frequency (sessions per week)
  - Exercise volume trends
  - Progress on key lifts
  - Attendance consistency

**Recent Bookings:**
- Endpoint: GET `/gyms/{gym_id}/analytics/recent-bookings`
- Returns last 10 bookings for the gym
- Ordered by start_time descending

### 3.9 Client Management

**Client Onboarding (by Trainer):**
- Endpoint: POST `/trainers/{trainer_id}/clients/onboard`
- Payload: full_name, email, gym_id, package_id, start_time (optional)
- Process:
  1. Create User with role=CLIENT
  2. Create ClientSubscription (links client to gym + package)
  3. Optionally create first Booking
  4. Create ClientTrainer association (status=ACTIVE)

**Client List (Trainer View):**
- Endpoint: GET `/trainers/{trainer_id}/clients`
- Returns all clients associated with trainer
- Includes: user info, subscription status, last session date, total sessions

**Client Detail (Trainer View):**
- Endpoint: GET `/trainers/{trainer_id}/clients/{client_id}`
- Returns: client profile, active subscriptions, booking history, workout summary

**Client List (Gym View):**
- Endpoint: GET `/gyms/{gym_id}/clients`
- Returns all clients with subscriptions at the gym
- Includes: user info, subscription details, assigned trainer

---

## 4. Data Model

### 4.1 Core Entities

**User**
```
id: int (PK)
email: string (unique, indexed)
full_name: string (optional)
hashed_password: string
role: UserRole (SAAS_ADMIN, GYM_ADMIN, TRAINER, CLIENT)
is_active: boolean (default: true)
is_demo: boolean (default: false)

Relationships:
- gym: Gym (one-to-one, as admin)
- trainer: Trainer (one-to-one)
```

**Gym**
```
id: int (PK)
admin_id: int (FK → User, unique)
name: string (indexed)
slug: string (unique, indexed)
location: string
description: string (optional)
photos: string[] (JSON)
amenities: string[] (JSON)
operating_hours: object (JSON)
social_links: object (JSON)
business_reg_number: string (optional)
verification_status: VerificationStatus (DRAFT, PENDING, APPROVED, REJECTED)

Relationships:
- admin: User
- trainers: Trainer[] (many-to-many via GymTrainer)
```

**Trainer**
```
id: int (PK)
user_id: int (FK → User, unique)
bio: string (optional)
headshot_url: string (optional)
specializations: string[] (JSON)
certifications: object[] (JSON)
experience_years: int (default: 0)
social_links: object (JSON)
availability: object (JSON, day → time slots)
verification_status: VerificationStatus

Relationships:
- user: User
- gyms: Gym[] (many-to-many via GymTrainer)
```

**GymTrainer (Association)**
```
id: int (PK)
gym_id: int (FK → Gym)
trainer_id: int (FK → Trainer)
status: AssociationStatus (PENDING, INVITED, ACTIVE, REJECTED, TERMINATED)
created_at: datetime
updated_at: datetime
```

**ClientTrainer (Association)**
```
id: int (PK)
client_id: int (FK → User)
trainer_id: int (FK → Trainer)
status: AssociationStatus
created_at: datetime
```


### 4.2 Booking & Subscription Entities

**Booking**
```
id: int (PK)
gym_id: int (FK → Gym, indexed)
trainer_id: int (FK → Trainer, indexed)
user_id: int (FK → User, indexed, client)
start_time: datetime
end_time: datetime
status: BookingStatus (SCHEDULED, COMPLETED, CANCELLED, NO_SHOW, LATE)
workout_focus: string (optional, e.g., "Legs")
notes: string (optional)
```

**SessionPackage**
```
id: int (PK)
name: string
description: string (optional)
price_inr: int
session_count: int
gym_id: int (FK → Gym, indexed)
```

**ClientSubscription**
```
id: int (PK)
user_id: int (FK → User, indexed)
gym_id: int (FK → Gym, optional)
session_package_id: int (FK → SessionPackage, optional)
total_sessions: int
sessions_used: int (default: 0)
start_date: datetime
expiry_date: datetime (optional)
status: SubscriptionStatus (ACTIVE, EXPIRED, PAUSED, CANCELLED)
```

### 4.3 Workout Entities

**Exercise**
```
id: int (PK)
name: string (indexed)
description: string (optional)
category: ExerciseType (STRENGTH, CARDIO, FLEXIBILITY, HIIT)
muscle_group: MuscleGroup (LEGS, CHEST, BACK, SHOULDERS, ARMS, CORE, FULL_BODY, CARDIO)
unit_type: MeasurementUnit (WEIGHT_REPS, REPS_ONLY, TIME_DISTANCE, TIME_ONLY)
video_url: string (optional)
```

**WorkoutTemplate**
```
id: int (PK)
name: string (indexed, e.g., "Legs", "Chest")
description: string (optional)
```

**WorkoutTemplateExercise**
```
id: int (PK)
template_id: int (FK → WorkoutTemplate, indexed)
exercise_id: int (FK → Exercise)
sets: int (default: 3)
reps: int (default: 10, optional)
notes: string (optional)
```

**WorkoutSessionExercise**
```
id: int (PK)
booking_id: int (FK → Booking, indexed)
exercise_id: int (FK → Exercise)
sets: int (default: 1)
reps: int (optional)
weight_kg: float (optional)
duration_seconds: int (optional)
distance_meters: float (optional)
notes: string (optional)

Relationships:
- workout_sets: WorkoutSet[] (cascade delete)
```

**WorkoutSet**
```
id: int (PK)
session_exercise_id: int (FK → WorkoutSessionExercise, indexed)
set_number: int
reps: int (optional)
weight_kg: float (optional)
rpe: float (optional, 1-10 scale)
duration_seconds: int (optional)
distance_meters: float (optional)
is_completed: boolean (default: true)

Relationships:
- session_exercise: WorkoutSessionExercise
```

### 4.4 Session Management

**UserSession**
```
id: int (PK)
user_id: int (FK → User, unique, indexed)
token: string (unique, indexed)
created_at: datetime
expires_at: datetime
last_activity: datetime
ip_address: string (optional)
user_agent: string (optional)
is_active: boolean (default: true)

Relationships:
- user: User
```

---

## 5. API Endpoints

### 5.1 Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/access-token` - Login (OAuth2 password flow)
- `POST /api/v1/auth/logout` - Logout (invalidate session)

### 5.2 Users
- `GET /api/v1/users/me` - Get current user profile

### 5.3 Gyms
- `GET /api/v1/gyms/` - List all gyms
- `POST /api/v1/gyms/` - Create gym (requires GYM_ADMIN role)
- `GET /api/v1/gyms/{gym_id}` - Get gym details
- `PUT /api/v1/gyms/{gym_id}` - Update gym (owner or admin)
- `DELETE /api/v1/gyms/{gym_id}` - Delete gym (owner or admin)
- `GET /api/v1/gyms/{gym_id}/trainers` - List gym trainers
- `POST /api/v1/gyms/{gym_id}/trainers` - Invite trainer (not implemented)
- `PATCH /api/v1/gyms/{gym_id}/trainers/{trainer_id}/status` - Update trainer association
- `GET /api/v1/gyms/{gym_id}/bookings` - List gym bookings
- `GET /api/v1/gyms/{gym_id}/clients` - List gym clients
- `GET /api/v1/gyms/{gym_id}/packages` - List session packages
- `POST /api/v1/gyms/{gym_id}/packages` - Create package
- `PUT /api/v1/gyms/{gym_id}/packages/{package_id}` - Update package
- `DELETE /api/v1/gyms/{gym_id}/packages/{package_id}` - Delete package
- `GET /api/v1/gyms/{gym_id}/analytics/overview` - Gym analytics
- `GET /api/v1/gyms/{gym_id}/analytics/recent-bookings` - Recent bookings

### 5.4 Trainers
- `GET /api/v1/trainers/` - List all trainers
- `POST /api/v1/trainers/` - Create trainer profile
- `GET /api/v1/trainers/{trainer_id}` - Get trainer details
- `PUT /api/v1/trainers/{trainer_id}` - Update trainer (owner or admin)
- `DELETE /api/v1/trainers/{trainer_id}` - Delete trainer (owner or admin)
- `GET /api/v1/trainers/{trainer_id}/analytics` - Trainer analytics
- `GET /api/v1/trainers/{trainer_id}/gyms` - List trainer's gyms
- `POST /api/v1/trainers/{trainer_id}/gyms` - Apply to gym
- `GET /api/v1/trainers/{trainer_id}/bookings` - List trainer bookings
- `GET /api/v1/trainers/{trainer_id}/sessions/{session_id}` - Get session details
- `PATCH /api/v1/trainers/{trainer_id}/sessions/{session_id}/status` - Update session status
- `GET /api/v1/trainers/{trainer_id}/exercises/{exercise_id}/history` - Exercise history
- `GET /api/v1/trainers/{trainer_id}/clients` - List trainer clients
- `GET /api/v1/trainers/{trainer_id}/clients/{client_id}` - Get client details
- `GET /api/v1/trainers/{trainer_id}/clients/{client_id}/analytics/overview` - Client analytics
- `POST /api/v1/trainers/{trainer_id}/clients/onboard` - Onboard new client

### 5.5 Bookings
- `POST /api/v1/bookings/` - Create booking
- `PATCH /api/v1/bookings/{booking_id}/status` - Update booking status
- `POST /api/v1/bookings/{booking_id}/log` - Log workout exercises

### 5.6 Templates
- `GET /api/v1/templates/` - List workout templates
- `GET /api/v1/templates/{template_id}` - Get template with exercises

### 5.7 Exercises
- `GET /api/v1/exercises/` - List exercises
- `POST /api/v1/exercises/` - Create exercise (admin only)

### 5.8 Admin
- `GET /api/v1/admin/verifications` - List pending verifications
- `POST /api/v1/admin/verifications/gym/{gym_id}/approve` - Approve gym
- `POST /api/v1/admin/verifications/gym/{gym_id}/reject` - Reject gym
- `POST /api/v1/admin/verifications/trainer/{trainer_id}/approve` - Approve trainer
- `POST /api/v1/admin/verifications/trainer/{trainer_id}/reject` - Reject trainer
- `GET /api/v1/admin/overview` - Platform overview

### 5.9 Test Utils
- `DELETE /api/v1/test-utils/purge-user` - Delete user and all related data (test only)

---

## 6. Business Rules & Constraints

### 6.1 Booking Rules
1. **Credit Requirement**: Client must have active subscription with available credits
2. **Availability Match**: Booking time must fall within trainer's defined availability slots
3. **No Double Booking**: Trainer cannot have overlapping bookings
4. **Fixed Duration**: All sessions are 1 hour (no variable duration)
5. **Gym Association**: Trainer must have ACTIVE status at the gym
6. **Auto-Deduction**: Subscription credit deducted immediately on booking creation

### 6.2 Verification Rules
1. **Gym Verification**: Required before trainers can apply
2. **Trainer Verification**: Required before accepting bookings
3. **Admin Approval**: Only SAAS_ADMIN can approve/reject
4. **State Transitions**: DRAFT → PENDING → APPROVED/REJECTED
5. **No Auto-Approval**: All verifications require manual admin action

### 6.3 Association Rules
1. **Multi-Gym Support**: Trainers can work at multiple gyms
2. **Approval Required**: Gym admin must approve trainer applications
3. **Active Status**: Only ACTIVE associations allow bookings
4. **Termination**: Either party can terminate association

### 6.4 Subscription Rules
1. **Credit System**: Pre-paid session packages
2. **Expiration**: Subscriptions expire by date or credit exhaustion
3. **No Refunds**: Credits cannot be refunded (not implemented)
4. **Single Gym**: Subscription tied to one gym
5. **Auto-Deduction**: Credits deducted on booking, not on completion

### 6.5 Authorization Rules
1. **Resource Ownership**: Users can only modify their own resources
2. **Admin Override**: SAAS_ADMIN can access all resources
3. **Gym Scoping**: Gym admins can only manage their own gym
4. **Trainer Scoping**: Trainers can only view their own clients
5. **Session Validation**: JWT token required for all protected endpoints


---

## 7. Technical Architecture

### 7.1 Technology Stack

**Backend:**
- Framework: FastAPI (Python 3.11+)
- ORM: SQLModel (SQLAlchemy + Pydantic)
- Database: PostgreSQL 16
- Authentication: JWT (HS256) + OAuth2 Password Flow
- Password Hashing: bcrypt
- API Documentation: Auto-generated OpenAPI/Swagger

**Frontend:**
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: TailwindCSS
- UI Components: ShadCN UI
- Charts: Recharts
- State Management: React Context API (AuthContext)

**Infrastructure:**
- Containerization: Docker + Docker Compose
- Database: PostgreSQL (Docker volume for persistence)
- Reverse Proxy: Nginx (optional)
- Build Tool: Make (standardized commands)

### 7.2 Architecture Patterns

**Backend Patterns:**
- **Repository Pattern**: SQLModel for data access
- **Service Layer**: BookingService for complex business logic
- **Dependency Injection**: FastAPI Depends for session management
- **DTO Pattern**: Pydantic models for request/response validation
- **Single Responsibility**: Separate models, services, and endpoints

**Frontend Patterns:**
- **Component-Based**: Reusable UI components
- **Context API**: Global auth state management
- **API Abstraction**: Centralized API client (`lib/api.ts`)
- **Protected Routes**: Auth-gated dashboard pages
- **Role-Based UI**: Conditional rendering based on user role

**Security Patterns:**
- **JWT Authentication**: Stateless token validation
- **Database Sessions**: One active session per user
- **RBAC**: Role-based access control at endpoint level
- **Resource Ownership**: Validation of user permissions
- **Password Security**: bcrypt hashing with salt

### 7.3 Database Design Principles

**Normalization:**
- 3NF compliance for core entities
- JSON columns for flexible data (photos, amenities, availability)
- Link tables for many-to-many relationships (GymTrainer, ClientTrainer)

**Indexing Strategy:**
- Primary keys on all tables
- Foreign key indexes for joins
- Unique indexes on email, slug, token
- Composite indexes on frequently queried columns

**Cascade Rules:**
- WorkoutSet cascade deletes with WorkoutSessionExercise
- GymTrainer cascade deletes with Gym
- UserSession cascade deletes with User

**Data Integrity:**
- Foreign key constraints enforced
- Enum types for status fields
- NOT NULL constraints on required fields
- Unique constraints on business keys (email, slug, token)

### 7.4 API Design Principles

**RESTful Conventions:**
- Resource-based URLs (`/gyms/{gym_id}/trainers`)
- HTTP methods: GET (read), POST (create), PUT (full update), PATCH (partial update), DELETE
- Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 403 (Forbidden), 404 (Not Found)

**Response Formats:**
- JSON for all responses
- Consistent error structure: `{"detail": "Error message"}`
- Pydantic models for type safety

**Authentication:**
- Bearer token in Authorization header
- OAuth2PasswordBearer for token extraction
- JWT validation on protected endpoints

**Versioning:**
- API prefix: `/api/v1`
- Version in URL path (not header)

---

## 8. User Workflows

### 8.1 Gym Owner Journey

**Onboarding:**
1. Register with role=GYM_ADMIN
2. System creates empty Gym profile (status=DRAFT)
3. Complete gym profile (name, location, slug, amenities, hours)
4. Submit for verification (status → PENDING)
5. Wait for SAAS_ADMIN approval
6. Status changes to APPROVED

**Daily Operations:**
1. View pending trainer applications
2. Approve/reject trainer requests
3. Create session packages (pricing, session counts)
4. View gym analytics (revenue, attendance, trainer performance)
5. Monitor client list and bookings

**Trainer Management:**
1. Review trainer applications (GET `/gyms/{gym_id}/trainers`)
2. Approve trainer (PATCH status → ACTIVE)
3. View trainer performance metrics
4. Terminate association if needed (PATCH status → TERMINATED)

### 8.2 Trainer Journey

**Onboarding:**
1. Register with role=TRAINER
2. System creates empty Trainer profile (status=DRAFT)
3. Complete trainer profile (bio, specializations, certifications, availability)
4. Submit for verification (status → PENDING)
5. Wait for SAAS_ADMIN approval
6. Status changes to APPROVED

**Gym Association:**
1. Browse available gyms (GET `/gyms/`)
2. Apply to gym (POST `/trainers/{trainer_id}/gyms`)
3. Wait for gym admin approval
4. Association status changes to ACTIVE

**Session Management:**
1. View today's schedule (GET `/trainers/{trainer_id}/bookings`)
2. Open session details (GET `/trainers/{trainer_id}/sessions/{session_id}`)
3. Load workout template or add exercises manually
4. Log sets and reps during session (POST `/bookings/{booking_id}/log`)
5. Mark session as COMPLETED (PATCH status)

**Client Management:**
1. Onboard new client (POST `/trainers/{trainer_id}/clients/onboard`)
2. View client list (GET `/trainers/{trainer_id}/clients`)
3. View client progress (GET `/trainers/{trainer_id}/clients/{client_id}/analytics/overview`)
4. View exercise history (GET `/trainers/{trainer_id}/exercises/{exercise_id}/history`)

### 8.3 Client Journey

**Onboarding:**
1. Trainer creates client account (POST `/trainers/{trainer_id}/clients/onboard`)
2. System creates User (role=CLIENT) + ClientSubscription + first Booking
3. Client receives credentials (manual process)

**Booking Sessions:**
1. Client logs in
2. Views available trainers
3. Selects trainer and time slot
4. System validates subscription credits and availability
5. Booking created (status=SCHEDULED)
6. Credit deducted from subscription

**Tracking Progress:**
1. View booking history
2. View workout logs for each session
3. Track exercise progress (volume, 1RM, frequency)
4. View analytics dashboard

### 8.4 Platform Admin Journey

**Verification Management:**
1. View pending verifications (GET `/admin/verifications`)
2. Review gym details (business registration, location, photos)
3. Approve or reject gym (POST `/admin/verifications/gym/{gym_id}/approve`)
4. Review trainer details (certifications, experience, bio)
5. Approve or reject trainer (POST `/admin/verifications/trainer/{trainer_id}/approve`)

**Platform Oversight:**
1. View platform overview (GET `/admin/overview`)
2. Monitor system health
3. Access any resource (admin override)

---

## 9. Frontend Components

### 9.1 Dashboard Views

**Trainer Dashboard:**
- Profile status badge (DRAFT, PENDING, APPROVED, REJECTED)
- Today's schedule (upcoming sessions)
- Weekly session count
- Monthly earnings
- Specializations and certifications display
- Quick actions: Complete profile, view clients, view analytics

**Gym Dashboard:**
- Facility status badge
- Pending trainer requests alert
- Revenue metrics (total, monthly)
- Attendance trends chart (last 30 days)
- Trainer performance table (sessions, clients, revenue)
- Occupancy rate visualization
- Quick actions: Review trainers, manage packages, view clients

**Admin Dashboard:**
- Pending verifications count
- Platform statistics (total gyms, trainers, clients)
- Recent activity feed
- Quick actions: Approve/reject verifications

**Client Dashboard:**
- Upcoming sessions
- Workout history
- Progress charts (volume, frequency)
- Subscription status (credits remaining, expiry date)

### 9.2 Key UI Components

**Authentication:**
- Login form (email/password)
- Registration form (email, password, full_name, role selector)
- Protected route wrapper (redirects to login if not authenticated)

**Onboarding:**
- Gym onboarding form (name, location, slug, amenities, hours)
- Trainer onboarding form (bio, specializations, certifications, availability grid)

**Gym Management:**
- Trainer list with status badges (PENDING, ACTIVE, REJECTED)
- Approve/reject buttons
- Package creation form (name, price, session count)
- Package list with edit/delete actions

**Trainer Management:**
- Gym application list
- Client onboarding form
- Session detail view (exercises, sets, reps)
- Workout template selector
- Exercise logger (add sets, track weight/reps/RPE)

**Analytics:**
- Revenue chart (line chart, last 30 days)
- Attendance chart (bar chart, daily sessions)
- Trainer performance table (sortable)
- Client progress chart (volume over time)
- Metric cards (total revenue, active clients, occupancy rate)

---

## 10. Testing Strategy

### 10.1 Test Pyramid

**Unit Tests (Backend):**
- Model validation (Pydantic schemas)
- Business logic (BookingService)
- Authentication (JWT, password hashing)
- Authorization (role checks, resource ownership)
- Test framework: pytest
- Coverage target: 80%+

**Integration Tests (Backend):**
- API endpoint testing (FastAPI TestClient)
- Database operations (SQLModel with test DB)
- End-to-end flows (registration → onboarding → booking)
- Test framework: pytest with fixtures
- Database: Dockerized PostgreSQL (test container)

**E2E Tests (Frontend):**
- Authentication flow (login, logout, session persistence)
- Trainer template loading (select template → load exercises)
- Gym association flow (trainer applies → gym approves)
- Test framework: Playwright
- Browser: Chromium (headless)

### 10.2 Test Data Management

**Demo Data:**
- Seeded via `app/db/demo_data.py`
- Personas: gym_draft, gym_pending, gym_active, tr_draft, tr_pending, tr_active, admin
- Includes: Users, Gyms, Trainers, Associations, Packages, Subscriptions, Bookings
- Password: Configurable via environment variables

**Test Data:**
- Seeded via `app/db/seed_test_data.py`
- Minimal personas for E2E stability
- Cleaned up after test runs

**Fixtures:**
- pytest fixtures for common entities (users, gyms, trainers, clients)
- Session-scoped database fixtures
- Auto-cleanup after tests

### 10.3 CI/CD Integration

**Make Commands:**
- `make unit-tests` - Run backend unit tests
- `make test-integration` - Run backend integration tests
- `make playwright` - Run frontend E2E tests
- `make test` - Run all tests
- `make lint` - Run linters (flake8, eslint)
- `make format` - Format code (black, isort)

**Production Readiness:**
- `make prod-all` - Full build → lint → test → seed → status check
- `make investor-demo-setup` - Production setup with rich demo data

---

## 11. Deployment & Operations

### 11.1 Environment Configuration

**Backend Environment Variables:**
```
DATABASE_URL=postgresql://user:password@host:port/dbname
SECRET_KEY=<jwt-secret-key>
ACCESS_TOKEN_EXPIRE_MINUTES=11520  # 8 days
BACKEND_CORS_ORIGINS=http://localhost:3000,https://app.example.com
```

**Frontend Environment Variables:**
```
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_INTERNAL_URL=http://backend:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<nextauth-secret>
```

**Database Environment Variables:**
```
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=gym_saas
DB_PORT=5432
```

### 11.2 Docker Compose Services

**Services:**
1. **backend**: FastAPI app (port 8000)
2. **frontend**: Next.js app (port 3000)
3. **db**: PostgreSQL 16 (port 5432)

**Volumes:**
- `postgres_data`: Persistent database storage
- Backend code mounted for hot reload
- Frontend code mounted for hot reload

**Health Checks:**
- Database: `pg_isready` command (5s interval, 5 retries)
- Backend depends on healthy database
- Frontend depends on backend

### 11.3 CLI Administration

**Commands (via `make admin cmd=<command>`):**
- `list-gyms` - List all gyms with admin info
- `list-trainers` - List all trainers with user info
- `list-pending` - List pending verifications
- `approve-gym --id <gym_id>` - Approve gym
- `reject-gym --id <gym_id>` - Reject gym
- `approve-trainer --id <trainer_id>` - Approve trainer
- `reject-trainer --id <trainer_id>` - Reject trainer
- `create-gym` - Create gym with admin user
- `create-trainer` - Create trainer with user
- `delete-gym --id <gym_id>` - Delete gym
- `delete-trainer --id <trainer_id>` - Delete trainer
- `create-association --gym-id <id> --trainer-id <id>` - Create gym-trainer association
- `list-associations` - List all associations

**System Status:**
- `make sitrep` - Database statistics, table counts, system health

**Data Management:**
- `make seed-demo-users` - Seed full demo environment
- `make clean-demo-users` - Wipe all demo data

---

## 12. Constraints & Limitations

### 12.1 Current Limitations

**Booking System:**
- Fixed 1-hour session duration (no variable length)
- No recurring bookings (must book individually)
- No cancellation policy enforcement
- No waitlist functionality
- No booking reminders/notifications

**Payment System:**
- No payment gateway integration
- Manual subscription creation (no self-service purchase)
- No refund mechanism
- No invoice generation
- Credits deducted on booking (not on completion)

**Communication:**
- No email notifications (registration, booking confirmation, verification)
- No in-app messaging between trainers and clients
- No push notifications

**Scheduling:**
- No calendar view for trainers
- No availability conflict detection across gyms
- No time zone support (assumes single timezone)
- Availability defined per day (no date-specific overrides)

**Analytics:**
- No export functionality (CSV, PDF)
- No custom date range selection
- No comparative analytics (month-over-month, year-over-year)
- No predictive analytics

**Multi-tenancy:**
- No white-label support
- No custom branding per gym
- No subdomain routing

### 12.2 Technical Debt

**Backend:**
- No caching layer (Redis)
- No background job processing (Celery)
- No rate limiting
- No API versioning strategy beyond URL prefix
- No database migration tool (Alembic not configured)
- No comprehensive logging (structured logs)
- No monitoring/observability (Prometheus, Grafana)

**Frontend:**
- No offline support (PWA)
- No optimistic UI updates
- No error boundary implementation
- No loading state management library
- No form validation library (using basic HTML5)
- No internationalization (i18n)

**Testing:**
- No load testing
- No security testing (penetration testing)
- No accessibility testing (a11y)
- E2E tests limited to critical paths

**DevOps:**
- No CI/CD pipeline (GitHub Actions, GitLab CI)
- No staging environment
- No automated database backups
- No disaster recovery plan
- No horizontal scaling support

### 12.3 Scalability Considerations

**Database:**
- Single PostgreSQL instance (no replication)
- No connection pooling configuration
- No query optimization (no EXPLAIN analysis)
- No partitioning strategy for large tables

**Application:**
- No load balancing
- No CDN for static assets
- No image optimization/compression
- No API response caching

**Architecture:**
- Monolithic backend (no microservices)
- Synchronous request handling (no async workers)
- No event-driven architecture

---

## 13. Future Enhancements

### 13.1 High Priority

**Payment Integration:**
- Stripe/Razorpay integration for package purchases
- Automated subscription creation on payment
- Invoice generation and email delivery
- Refund processing

**Notification System:**
- Email notifications (registration, booking, verification)
- SMS notifications for booking reminders
- In-app notification center
- Push notifications (mobile)

**Enhanced Scheduling:**
- Calendar view for trainers (day/week/month)
- Recurring booking support
- Cancellation policy enforcement (24-hour notice)
- Waitlist management

**Mobile App:**
- React Native mobile app (iOS/Android)
- Offline workout logging
- Push notifications
- QR code check-in

### 13.2 Medium Priority

**Advanced Analytics:**
- Custom date range selection
- Export to CSV/PDF
- Comparative analytics (MoM, YoY)
- Predictive analytics (churn prediction, revenue forecasting)

**Communication:**
- In-app messaging (trainer ↔ client)
- Group announcements (gym → trainers/clients)
- Video call integration (Zoom, Google Meet)

**Workout Features:**
- Custom workout templates (trainer-specific)
- Workout plan builder (multi-week programs)
- Exercise video library
- Form check (video upload and review)

**Client Features:**
- Self-service booking (client-initiated)
- Package purchase (self-service)
- Progress photos
- Body measurements tracking
- Nutrition logging

### 13.3 Low Priority

**White-Label:**
- Custom branding per gym (logo, colors, domain)
- Subdomain routing (gym-slug.platform.com)
- Custom email templates

**Marketplace:**
- Public trainer directory
- Gym discovery (search by location, amenities)
- Reviews and ratings
- Featured listings

**Gamification:**
- Achievement badges
- Leaderboards
- Challenges and competitions
- Referral program

**Integrations:**
- Wearable device sync (Fitbit, Apple Watch, Garmin)
- Calendar sync (Google Calendar, Outlook)
- Accounting software (QuickBooks, Xero)
- Marketing tools (Mailchimp, HubSpot)

---

## 14. Success Metrics

### 14.1 Platform Metrics
- Total registered gyms
- Total verified trainers
- Total active clients
- Monthly active users (MAU)
- Platform revenue (commission or subscription)

### 14.2 Engagement Metrics
- Average sessions per client per month
- Trainer utilization rate (booked hours / available hours)
- Gym occupancy rate (sessions / capacity)
- Client retention rate (90-day)
- Trainer retention rate (90-day)

### 14.3 Business Metrics
- Average revenue per gym (ARPG)
- Average revenue per trainer (ARPT)
- Customer acquisition cost (CAC)
- Lifetime value (LTV)
- Churn rate (monthly)

### 14.4 Technical Metrics
- API response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Uptime (99.9% target)
- Database query performance
- Test coverage (80%+ target)

---

## 15. Appendix

### 15.1 Glossary

- **Association**: Relationship between gym and trainer (GymTrainer table)
- **Booking**: Scheduled training session between trainer and client
- **Credit**: Single session unit in a subscription package
- **Onboarding**: Process of completing profile after registration
- **Package**: Pre-paid bundle of sessions (SessionPackage)
- **Session**: Training appointment (synonym for Booking)
- **Subscription**: Client's purchased package with credit balance
- **Template**: Pre-defined workout with exercises (WorkoutTemplate)
- **Verification**: Admin approval process for gyms and trainers
- **Workout Log**: Recorded exercises and sets for a session

### 15.2 Demo Credentials

**Trainer:**
- Email: `tr_active@example.com`
- Password: `password`
- Status: APPROVED

**Gym Owner:**
- Email: `gym_owner@example.com`
- Password: `password`
- Status: APPROVED

**Client:**
- Email: `client_active@example.com`
- Password: `password`

**Platform Admin:**
- Email: `admin@example.com`
- Password: `password`

### 15.3 Quick Start

```bash
# Full teardown & rebuild with seeded data
make investor-demo-setup

# Access application
open http://localhost:3000

# View system status
make sitrep

# View logs
make logs

# Run tests
make test
```

---

**Document End**
