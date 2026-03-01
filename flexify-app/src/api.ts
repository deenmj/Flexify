const API_BASE_URL = '/api';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'user' | 'owner' | 'verifiedOwner' | 'admin' | 'staff';
  verified: boolean;
  profilePic: string;
  provider?: string;
  status?: string;
  dashboardCreated?: boolean;
  verificationRequest?: VerificationRequest;
  verifiedBusiness?: VerifiedBusiness;
  createdAt?: string;
}

export interface VerificationRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  years?: number;
  description?: string;
  idFront?: string;
  idBack?: string;
  userPhoto?: string;
  idFile?: string;
  status: 'pending' | 'approved' | 'rejected';
  type?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface VerifiedBusiness {
  businessName?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  registrationNo?: string;
  documents?: string[];
  verifiedAt?: string;
  approvedBy?: string;
}

export interface Vehicle {
  _id: string;
  owner: User | string;
  title: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  location?: {
    text?: string;
    lat?: number;
    lng?: number;
    address?: string;
    coordinates?: number[];
  };
  serviceType?: string[];
  transmission: string;
  fuelType: string;
  seats: number;
  description?: string;
  photos: string[];
  images?: string[]; // backwards compatibility
  approved: boolean;
  dashboardRequested?: boolean;
  published?: boolean;
  isActive: boolean;
  subscribedUntil?: string;
  timesRented?: number;
  createdAt?: string;
}

export interface Booking {
  _id: string;
  user: User | string;
  vehicle: Vehicle | string;
  owner: User | string;
  startDate: string;
  endDate: string;
  days: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalVehicles: number;
  pendingVehicles: number;
  totalBookings: number;
  totalEarnings: number;
  commissionCollected: number;
}

// Helper to get auth headers
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

// Generic fetch wrapper
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

// =================== AUTH ===================
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (name: string, email: string, password: string) =>
    apiFetch<{ message: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  me: () => apiFetch<User>('/auth/me'),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiFetch<{ message: string }>(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  googleLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  },
};

// =================== VEHICLES ===================
export const vehicleApi = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<Vehicle[]>(`/vehicles${query}`);
  },

  getById: (id: string) => apiFetch<Vehicle>(`/vehicles/${id}`),

  getMy: () => apiFetch<Vehicle[]>('/vehicles/my'),

  create: (data: Partial<Vehicle>) =>
    apiFetch<{ message: string; vehicle: Vehicle }>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createWithPhotos: (formData: FormData) =>
    fetch(`${API_BASE_URL}/vehicles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    }).then(res => res.json()),

  update: (id: string, data: Partial<Vehicle>) =>
    apiFetch<{ message: string; vehicle: Vehicle }>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateWithPhotos: (id: string, formData: FormData) =>
    fetch(`${API_BASE_URL}/vehicles/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    }).then(res => res.json()),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/vehicles/${id}`, {
      method: 'DELETE',
    }),

  approve: (id: string) =>
    apiFetch<{ message: string; vehicle: Vehicle }>(`/vehicles/approve/${id}`, {
      method: 'PUT',
    }),

  reject: (id: string) =>
    apiFetch<{ message: string; vehicle: Vehicle }>(`/vehicles/reject/${id}`, {
      method: 'PUT',
    }),

  toggleStatus: (id: string) =>
    apiFetch<{ message: string; vehicle: Vehicle }>(`/vehicles/${id}/status`, {
      method: 'PATCH',
    }),
};

// =================== BOOKINGS ===================
export const bookingApi = {
  create: (vehicleId: string, startDate: string, endDate: string) =>
    apiFetch<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, startDate, endDate }),
    }),

  getMy: () => apiFetch<Booking[]>('/bookings/my'),

  approve: (id: string) =>
    apiFetch<Booking>(`/bookings/approve/${id}`, { method: 'PUT' }),

  pay: (id: string) =>
    apiFetch<{ booking: Booking }>(`/bookings/pay/${id}`, { method: 'PUT' }),

  cancel: (id: string) =>
    apiFetch<{ message: string }>(`/bookings/cancel/${id}`, { method: 'PUT' }),
};

// =================== ADMIN ===================
export const adminApi = {
  getStats: () => apiFetch<AdminStats>('/admin/stats'),

  getPendingVehicles: () => apiFetch<Vehicle[]>('/admin/pending-vehicles'),

  getPendingVerifications: () => apiFetch<User[]>('/admin/pending-verifications'),

  getVerificationRequest: (userId: string) => apiFetch<User>(`/admin/verification/${userId}`),

  approveOwner: (userId: string) =>
    apiFetch<{ message: string; user: User }>(`/admin/verify-owner/${userId}`, {
      method: 'PUT',
    }),

  rejectOwner: (userId: string) =>
    apiFetch<{ message: string; user: User }>(`/admin/reject-owner/${userId}`, {
      method: 'PUT',
    }),

  getRequests: () =>
    apiFetch<{
      pendingVehicles: Vehicle[];
      pendingVerifications: User[];
      archived: User[];
    }>('/admin/requests'),
};

// =================== OWNERS ===================
export const ownerApi = {
  getVerifiedOwners: () =>
    fetch(`${API_BASE_URL}/owners/verified-owners`).then(r => r.json()) as Promise<User[]>,

  submitVerification: (formData: FormData) =>
    fetch(`${API_BASE_URL}/owners/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    }).then(r => r.json()),

  submitBusinessVerification: (formData: FormData) =>
    fetch(`${API_BASE_URL}/owners/verify-business`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    }).then(r => r.json()),
};

// =================== USERS ===================
export const userApi = {
  submitVerification: (formData: FormData) =>
    fetch(`${API_BASE_URL}/users/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    }).then(r => r.json()),

  updateProfile: (formData: FormData) =>
    fetch(`${API_BASE_URL}/users/update-profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    }).then(r => r.json()),
};

