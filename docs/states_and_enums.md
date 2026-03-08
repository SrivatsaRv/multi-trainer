# System States and Enums

This document lists all the state-related fields and enums used across the Multi-Trainer system to govern business logic and data flows.

## Core Entities

| Component | Field | Enum Values | Description |
| :--- | :--- | :--- | :--- |
| **User** | `role` | `TRAINER`, `GYM_ADMIN`, `SAAS_ADMIN` | Controls access permissions across the system. |
| **User** | `is_active` | `Boolean` | Determines if a user can log in. |
| **User** | `is_demo` | `Boolean` | Indicates if the account is a pre-seeded demo account. |
| **Gym** | `verification_status` | `PENDING`, `APPROVED`, `REJECTED` | Controls visibility in public listings and discovery. |
| **Trainer** | `verification_status` | `PENDING`, `APPROVED`, `REJECTED` | Controls if a trainer can apply to gyms or book clients. |

## Relationships & Applications

| Component | Field | Enum Values | Description |
| :--- | :--- | :--- | :--- |
| **Gym Application** | `status` | `PENDING`, `APPROVED`, `REJECTED` | Status of a trainer's request to join a gym. |
| **Association (GymTrainer)** | `status` | `PENDING`, `INVITED`, `ACTIVE`, `INACTIVE`, `REJECTED`, `TERMINATED` | Current state of the link between a gym and a trainer. |
| **Association (ClientTrainer)** | `status` | `PENDING`, `ACTIVE`, `INACTIVE` | Current state of the trainer-client coaching relationship. |

## Operations & Attendance

| Component | Field | Enum Values | Description |
| :--- | :--- | :--- | :--- |
| **Booking** | `status` | `SCHEDULED`, `ATTENDED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `LATE`, `PENDING`, `BLOCKED` | Tracks session attendance and lifecycle. |
| **Client Subscription** | `status` | `ACTIVE`, `EXPIRED`, `CANCELLED` | Determines if a client has valid sessions to book. |

## Workout Metadata

| Component | Type | Enum Values | Description |
| :--- | :--- | :--- | :--- |
| **Exercise** | `type` | `STRENGTH`, `CARDIO`, `FLEXIBILITY`, `HIIT` | Classification of movements. |
| **Exercise** | `unit` | `KG`, `REPS`, `SECONDS`, `METERS`, `PERCENT` | Measurement standard for tracking progress. |
| **Muscle Group** | `group` | `CHEST`, `BACK`, `LEGS`, etc. | Targeted body areas for exercises. |
