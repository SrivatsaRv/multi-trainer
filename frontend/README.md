# Frontend Application (Next.js 14)

Client-facing application built with the App Router, ShadCN UI, and TailwindCSS.

## Structure
- **`src/app`**: Next.js App Router pages (Route Groups: `(auth)`, `(dashboard)`, etc.).
- **`src/components/ui`**: Reusable ShadCN components (Button, Input, Table).
- **`tests/e2e`**: Playwright End-to-End tests.

## Theme & UI
- **Design System**: "Clean Light" (Forced Light Mode).
- **Components**: ShadCN (Radix Primitive wrappers).
- **Charts**: Recharts (for Analytics).

## E2E Testing with Playwright
We test critical user journeys to ensure stability.

```bash
# Run all E2E tests
npx playwright test

# Run specific test (e.g., Trainer Template)
npx playwright test tests/trainer-template.spec.ts --project=chromium --headed
```

**Note**: Tests expect the backend and frontend to be running at `http://localhost:3000`. Use `make up` in the root directory first.
