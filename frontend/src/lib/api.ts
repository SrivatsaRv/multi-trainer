const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetcher(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
}

export const api = {
    // Generic methods
    get: async (endpoint: string, token?: string | null) => {
        const headers: any = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}${endpoint}`, { headers });
        if (!res.ok) throw new Error("API Error");
        return res.json();
    },
    post: async (endpoint: string, data: any, token?: string | null) => {
        const headers: any = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("API Error");
        return res.json();
    },
    patch: async (endpoint: string, data: any, token?: string | null) => {
        const headers: any = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("API Error");
        return res.json();
    },
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
        getTrainers: (gymId: string) => fetcher(`/gyms/${gymId}/trainers`),
        inviteTrainer: (gymId: string, email: string) => fetcher(`/gyms/${gymId}/trainers/invite`, { method: 'POST', body: JSON.stringify({ email }) }),
        updateTrainerStatus: (gymId: string, trainerId: string, status: string) => fetcher(`/gyms/${gymId}/trainers/${trainerId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
        getPackages: (gymId: string) => fetcher(`/gyms/${gymId}/packages`),
        createPackage: (gymId: string, data: any) => fetcher(`/gyms/${gymId}/packages`, { method: 'POST', body: JSON.stringify(data) }),
        updatePackage: (gymId: string, packageId: number, data: any) => fetcher(`/gyms/${gymId}/packages/${packageId}`, { method: 'PUT', body: JSON.stringify(data) }),
        deletePackage: (gymId: string, packageId: number) => fetcher(`/gyms/${gymId}/packages/${packageId}`, { method: 'DELETE' }),
        getAnalytics: (gymId: string) => fetcher(`/gyms/${gymId}/analytics/overview`),
        getClients: (gymId: string) => fetcher(`/gyms/${gymId}/clients`),
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
    },
    bookings: {
        updateStatus: (trainerId: string, bookingId: string, status: string) => fetcher(`/bookings/${bookingId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
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
        listVerifications: () => fetcher('/admin/verifications'),
        approveGym: (id: number) => fetcher(`/admin/verifications/gym/${id}/approve`, { method: 'POST' }),
        rejectGym: (id: number) => fetcher(`/admin/verifications/gym/${id}/reject`, { method: 'POST' }),
        approveTrainer: (id: number) => fetcher(`/admin/verifications/trainer/${id}/approve`, { method: 'POST' }),
        rejectTrainer: (id: number) => fetcher(`/admin/verifications/trainer/${id}/reject`, { method: 'POST' }),
    }
};
