import { signOut } from "next-auth/react";

const API_URL = typeof window !== 'undefined'
    ? '/api/v1'
    : (process.env.BACKEND_INTERNAL_URL || 'http://backend:8000') + '/api/v1';

export async function fetcher(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${path}`;

    // Debugging: track which URLs fail
    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errorData = await response.json();
                errorMsg = errorData.detail || errorMsg;
            } catch (e) { /* ignore */ }

            // Handle Managed Session Revocation (Tier 3)
            if (errorMsg === 'SESSION_EXPIRED' && typeof window !== 'undefined') {
                console.warn('Session expired. Initiating standardized logout via signOut()...');
                signOut({
                    callbackUrl: '/auth/login?message=session_expired',
                    redirect: true
                });
                return;
            }

            console.error(`API Error [${response.status}] ${url}:`, errorMsg);
            throw new Error(errorMsg);
        }

        return response.json();
    } catch (err) {
        console.error(`Fetch Failure ${url}:`, err);
        throw err;
    }
}

const fetchWithAuth = fetcher;


export const api = {
    // Generic methods
    get: (endpoint: string) => fetcher(endpoint, { method: 'GET' }),
    post: (endpoint: string, data: any) => fetcher(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    patch: (endpoint: string, data: any) => fetcher(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
    put: (endpoint: string, data: any) => fetcher(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (endpoint: string) => fetcher(endpoint, { method: 'DELETE' }),
    // Domain specific
    auth: {
        register: (data: any) => fetcher('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
        login: async (data: any) => {
            const res = await fetch(`${API_URL}/auth/access-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    username: data.username || data.email,
                    password: data.password,
                }),
            });
            if (!res.ok) throw new Error('Login failed');
            return res.json();
        }
    },
    gyms: {
        list: () => fetcher('/gyms/'),
        listAll: () => fetcher('/gyms/'),
        create: (data: any) => fetcher('/gyms/', { method: 'POST', body: JSON.stringify(data) }),
        get: (id: string) => fetcher(`/gyms/${id}`),
        getTrainers: (gymId: string) => fetcher(`/gyms/${gymId}/trainers/`),
        inviteTrainer: (gymId: string, email: string) => fetcher(`/gyms/${gymId}/trainers/invite/`, { method: 'POST', body: JSON.stringify({ email }) }),
        updateTrainerStatus: (gymId: string, trainerId: string, data: any) => fetcher(`/gyms/${gymId}/trainers/${trainerId}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
        getPackages: (gymId: string) => fetcher(`/gyms/${gymId}/packages/`),
        createPackage: (gymId: string, data: any) => fetcher(`/gyms/${gymId}/packages/`, { method: 'POST', body: JSON.stringify(data) }),
        updatePackage: (gymId: string, pkgId: number, data: any) => fetcher(`/gyms/${gymId}/packages/${pkgId}`, { method: 'PUT', body: JSON.stringify(data) }),
        deletePackage: (gymId: string, pkgId: number) => fetcher(`/gyms/${gymId}/packages/${pkgId}`, { method: 'DELETE' }),
        getAnalytics: (gymId: string) => fetcher(`/gyms/${gymId}/analytics/overview`),
        getClients: (gymId: string, skip: number = 0, limit: number = 25, search?: string) => {
            const params = new URLSearchParams({
                skip: skip.toString(),
                limit: limit.toString(),
                ...(search && { search })
            });
            return fetcher(`/gyms/${gymId}/clients?${params.toString()}`);
        },
        getBookings: (gymId: string) => fetcher(`/gyms/${gymId}/bookings/`),
    },
    trainers: {
        list: () => fetcher('/trainers/'),
        create: (data: any) => fetcher('/trainers/', { method: 'POST', body: JSON.stringify(data) }),
        get: (id: string) => fetcher(`/trainers/${id}`),
        patch: (id: string, data: any) => fetcher(`/trainers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        getGyms: (id: string) => fetcher(`/trainers/${id}/gyms`),
        applyToGym: (trainerId: string, gymId: number) => fetcher(`/trainers/${trainerId}/gyms/${gymId}/apply`, { method: 'POST' }),
        getSession: (trainerId: string, sessionId: string) => fetcher(`/trainers/${trainerId}/sessions/${sessionId}`),
        getExerciseHistory: (trainerId: string, exerciseId: number, clientId: number) => fetcher(`/trainers/${trainerId}/exercises/${exerciseId}/history?client_id=${clientId}`),
        getClients: (trainerId: string) => fetcher(`/trainers/${trainerId}/clients`),
        addClient: (trainerId: string, data: any) => fetcher(`/trainers/${trainerId}/clients/onboard`, { method: 'POST', body: JSON.stringify(data) }),
        getClient: (trainerId: string, clientId: string) => fetcher(`/trainers/${trainerId}/clients/${clientId}`),
        getClientAnalytics: (trainerId: string, clientId: string) => fetcher(`/trainers/${trainerId}/clients/${clientId}/analytics/overview`),
        getBookings: (trainerId: string) => fetcher(`/trainers/${trainerId}/bookings`),
        getAnalytics: (trainerId: string) => fetcher(`/trainers/${trainerId}/analytics`),
    },
    bookings: {
        create: (data: any) => fetchWithAuth(`/bookings`, { method: 'POST', body: JSON.stringify(data) }),
        updateStatus: (bookingId: string, status: string) => fetcher(`/bookings/${bookingId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
        log: (sessionId: string, data: any) => fetcher(`/bookings/${sessionId}/log`, { method: 'POST', body: JSON.stringify({ logs: data }) }),
    },
    templates: {
        list: () => fetcher('/templates/'),
        get: (id: number) => fetcher(`/templates/${id}`),
    },
    users: {
        me: () => fetcher('/users/me'),
    },
    admin: {
        listVerifications: () => fetcher('/admin/verifications/'),
        approveGym: (id: number) => fetcher(`/admin/verifications/gym/${id}/approve`, { method: 'POST' }),
        rejectGym: (id: number) => fetcher(`/admin/verifications/gym/${id}/reject`, { method: 'POST' }),
        approveTrainer: (id: number) => fetcher(`/admin/verifications/trainer/${id}/approve`, { method: 'POST' }),
        rejectTrainer: (id: number) => fetcher(`/admin/verifications/trainer/${id}/reject`, { method: 'POST' }),
    },
    certificates: {
        list: () => fetchWithAuth(`/certificates/`),
        create: (data: any) => fetchWithAuth(`/certificates/`, { method: 'POST', body: JSON.stringify(data) }),
        update: (id: number, data: any) => fetchWithAuth(`/certificates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: number) => fetchWithAuth(`/certificates/${id}`, { method: 'DELETE' }),
    },
    gymApplications: {
        list: () => fetchWithAuth(`/gym-applications/`),
        listForGym: (gymId: string) => fetchWithAuth(`/gym-applications/gym/${gymId}/`),
        create: (gymId: number, message?: string) => fetchWithAuth(`/gym-applications/`, { method: 'POST', body: JSON.stringify({ gym_id: gymId, message }) }),
        cancel: (id: number) => fetchWithAuth(`/gym-applications/${id}`),
        updateStatus: (id: number, status: "APPROVED" | "REJECTED") => fetchWithAuth(`/gym-applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    },
    workouts: {
        getTemplates: () => fetchWithAuth(`/workouts/templates`),
        createTemplate: (data: any) => fetchWithAuth(`/workouts/templates`, { method: 'POST', body: JSON.stringify(data) }),
        updateTemplate: (id: number, data: any) => fetchWithAuth(`/workouts/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteTemplate: (id: number) => fetchWithAuth(`/workouts/templates/${id}`, { method: 'DELETE' }),
        getLogs: (clientId?: number) => fetchWithAuth(`/workouts/logs${clientId ? `?client_id=${clientId}` : ''}`),
        createLog: (data: any) => fetchWithAuth(`/workouts/logs`, { method: 'POST', body: JSON.stringify(data) }),
    }
};
