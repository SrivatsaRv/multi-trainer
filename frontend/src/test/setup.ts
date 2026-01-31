import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mocking Next.js features that commonly cause warnings/errors in tests
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
}));

vi.mock('next-auth/react', () => ({
    useSession: () => ({ data: null, status: 'unauthenticated' }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
