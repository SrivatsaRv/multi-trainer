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
    auth: {
        register: (data: any) => fetcher('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
        login: async (data: any) => {
            const res = await fetch(`${API_URL}/auth/login/access-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(data),
            });
            if (!res.ok) throw new Error('Login failed');
            return res.json();
        }
    },
    gyms: {
        list: () => fetcher('/gyms/'),
        create: (data: any) => fetcher('/gyms/', { method: 'POST', body: JSON.stringify(data) }),
        get: (id: string) => fetcher(`/gyms/${id}`),
    },
    trainers: {
        list: () => fetcher('/trainers/'),
        create: (data: any) => fetcher('/trainers/', { method: 'POST', body: JSON.stringify(data) }),
        get: (id: string) => fetcher(`/trainers/${id}`),
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
