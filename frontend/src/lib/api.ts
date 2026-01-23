const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getHeaders = (token?: string) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export async function fetchCategories() {
    const res = await fetch(`${API_URL}/api/public/categories`, {
        next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    return res.json();
}

export async function fetchCommodities(params: {
    category?: string;
    search?: string;
    page?: number;
    size?: number
}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category_slug', params.category);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.size) query.append('size', params.size.toString());

    const res = await fetch(`${API_URL}/api/public/commodities?${query.toString()}`, {
        next: { revalidate: 30 },
    });

    if (!res.ok) return [];
    return res.json();
}

// Auth Actions
export const authApi = {
    login: async (credentials: any) => {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(credentials),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Login failed');
        return res.json();
    },
    getMe: async (token: string) => {
        const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: getHeaders(token),
        });
        if (!res.ok) throw new Error('Session expired');
        return res.json();
    },
    changePassword: async (token: string, newPassword: string) => {
        const query = new URLSearchParams({ new_password: newPassword });
        const res = await fetch(`${API_URL}/api/auth/change-password?${query}`, {
            method: 'POST',
            headers: getHeaders(token),
        });
        return res.json();
    }
};

// Admin Actions
export const adminApi = {
    listUsers: async (token: string) => {
        const res = await fetch(`${API_URL}/api/admin/users`, {
            headers: getHeaders(token),
        });
        return res.json();
    },
    createUser: async (token: string, username: string) => {
        const res = await fetch(`${API_URL}/api/admin/users`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify({ username, role: 'data_entry', password: 'placeholder' }),
        });
        return res.json();
    },
    createCategory: async (token: string, name: string) => {
        const res = await fetch(`${API_URL}/api/admin/categories`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify({ name, slug: name.toLowerCase().replace(/\s+/g, '-') }),
        });
        return res.json();
    },
    createCommodity: async (token: string, payload: any) => {
        const res = await fetch(`${API_URL}/api/admin/commodities`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create commodity');
        return res.json();
    },
    updateUserPermissions: async (token: string, userId: string, categoryIds: string[]) => {
        const res = await fetch(`${API_URL}/api/admin/users/${userId}/permissions`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(categoryIds),
        });
        return res.json();
    },
    updateCommodityCategory: async (token: string, commodityId: string, categoryId: string | null) => {
        const query = new URLSearchParams();
        if (categoryId) query.append('category_id', categoryId);
        const res = await fetch(`${API_URL}/api/admin/commodities/${commodityId}/category?${query}`, {
            method: 'PATCH',
            headers: getHeaders(token),
        });
        return res.json();
    },
    bulkUpdateCommodityCategory: async (token: string, commodityIds: string[], categoryId: string | null) => {
        const query = new URLSearchParams();
        if (categoryId) query.append('category_id', categoryId);
        const res = await fetch(`${API_URL}/api/admin/commodities/bulk-category?${query}`, {
            method: 'PATCH',
            headers: getHeaders(token),
            body: JSON.stringify(commodityIds),
        });
        return res.json();
    }
};

// Data Entry Actions
export const dataEntryApi = {
    updatePrice: async (token: string, payload: { commodity_id: string, price: number }) => {
        const query = new URLSearchParams({
            commodity_id: payload.commodity_id,
            price: payload.price.toString()
        });
        const res = await fetch(`${API_URL}/api/data-entry/prices?${query}`, {
            method: 'POST',
            headers: getHeaders(token),
        });
        return res.json();
    }
};
