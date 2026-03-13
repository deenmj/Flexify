const API_BASE_URL = '/api';

// =================== TYPES ===================

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'user' | 'owner' | 'subadmin' | 'superadmin';
  ownerType?: 'VERIFIED' | 'UNVERIFIED' | null;
  verified: boolean;
  isKycVerified: boolean;
  verificationStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  documents?: {
    nicFront?: string;
    nicBack?: string;
    license?: string;
    selfie?: string;
    address?: string;
  };
  profilePic: string;
  provider?: string;
  status?: string;
  createdAt?: string;
  subscription?: {
    tier: 'BASIC' | 'STANDARD' | 'ENTERPRISE';
    status: 'trial' | 'active' | 'expired';
    startDate: string;
    endDate: string | null;
  };
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
    type?: string;
    coordinates?: number[];
    address?: string;
  };
  serviceType?: string[];
  transmission: string;
  fuelType: string;
  seats: number;
  description?: string;
  photos: string[];
  status: 'pending' | 'active' | 'rejected';
  isActive: boolean;
  timesRented?: number;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
}

export interface Review {
  _id: string;
  booking: string;
  reviewer: User;
  reviewedOwner: string;
  vehicle: {
    _id: string;
    title: string;
    make: string;
    model: string;
  };
  rating: number;
  comment: string;
  status: 'visible' | 'hidden' | 'rejected';
  rejectionReason?: string;
  rejectionComment?: string;
  rejectedAt?: string;
  hiddenBy?: string;
  hiddenAt?: string;
  createdAt: string;
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
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  isReviewed?: boolean;
  createdAt?: string;
}

export interface BookedRange {
  start: string;
  end: string;
  status: 'CONFIRMED' | 'PENDING';
}

export interface BlackoutRange {
  start: string;
  end: string;
}

export interface Blackout {
  _id: string;
  vehicle: Vehicle | string;
  owner: User | string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt?: string;
}

export interface VehicleMake {
  _id: string;
  name: string;
  approved: boolean;
  createdBy?: User | string;
}

export interface VehicleModel {
  _id: string;
  make: VehicleMake | string;
  name: string;
  approved: boolean;
  createdBy?: User | string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface AdminStats {
  totalUsers: number;
  pendingKyc: number;
  totalVehicles: number;
  activeVehicles: number;
  pendingVehicles: number;
  totalEarnings: number;
  bookings: {
    total: number;
    confirmed: number;
    pending: number;
    byDistrict: Record<string, number>;
  };
  popularTypes: Record<string, number>;
  successRate: number;
}

export interface AuditLog {
  _id: string;
  action: string;
  performedBy: {
    _id: string;
    name: string;
    email: string;
  };
  targetUser: {
    _id: string;
    name: string;
    email: string;
  };
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  pages: number;
  currentPage: number;
}

export interface SubadminStats {
  pendingUsers: number;
  pendingVehicles: number;
  pendingMakes: number;
  pendingModels: number;
  approvedUsers: number;
  totalVehicles: number;
}

// =================== HELPERS ===================

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function authHeadersOnly(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

  createWithPhotos: (formData: FormData) =>
    fetch(`${API_BASE_URL}/vehicles`, {
      method: 'POST',
      headers: authHeadersOnly(),
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create vehicle');
      return data as Vehicle;
    }),

  updateWithPhotos: (id: string, formData: FormData) =>
    fetch(`${API_BASE_URL}/vehicles/${id}`, {
      method: 'PUT',
      headers: authHeadersOnly(),
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update vehicle');
      return data as Vehicle;
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/vehicles/${id}`, { method: 'DELETE' }),

  toggleStatus: (id: string) =>
    apiFetch<{ message: string; vehicle: Vehicle }>(`/vehicles/${id}/status`, {
      method: 'PATCH',
    }),

  getAvailability: (id: string) =>
    apiFetch<{ bookedRanges: BookedRange[]; blackoutRanges: BlackoutRange[] }>(`/vehicles/${id}/availability`),

  getMakes: () => apiFetch<VehicleMake[]>('/vehicles/makes'),

  getModels: (makeId: string) => apiFetch<VehicleModel[]>(`/vehicles/models/${makeId}`),
};

// =================== BOOKINGS ===================
export const bookingApi = {
  create: (vehicleId: string, startDate: string, endDate: string) =>
    apiFetch<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, startDate, endDate }),
    }),

  getMy: () => apiFetch<Booking[]>('/bookings/my'),

  accept: (id: string) =>
    apiFetch<Booking>(`/bookings/accept/${id}`, { method: 'PUT' }),

  reject: (id: string) =>
    apiFetch<{ message: string }>(`/bookings/reject/${id}`, { method: 'PUT' }),

  cancel: (id: string) =>
    apiFetch<{ message: string }>(`/bookings/cancel/${id}`, { method: 'PUT' }),
};

// =================== BLACKOUTS ===================
export const blackoutApi = {
  create: (vehicleId: string, startDate: string, endDate: string, reason?: string) =>
    apiFetch<Blackout>('/blackouts', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, startDate, endDate, reason }),
    }),

  getForVehicle: (vehicleId: string) =>
    apiFetch<Blackout[]>(`/blackouts/vehicle/${vehicleId}`),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/blackouts/${id}`, { method: 'DELETE' }),
};

// =================== ADMIN (SUPERADMIN) ===================
export const adminApi = {
  getStats: (filters?: { district?: string; timeRange?: string }) => {
    const params = new URLSearchParams();
    if (filters?.district) params.append('district', filters.district);
    if (filters?.timeRange) params.append('timeRange', filters.timeRange);
    return apiFetch<AdminStats>(`/admin/stats?${params.toString()}`);
  },

  getAllUsers: () => apiFetch<User[]>('/admin/users'),

  updateUserRole: (userId: string, role: string, ownerType?: string) =>
    apiFetch<{ message: string; user: User }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, ownerType }),
    }),

  deleteUser: (userId: string) =>
    apiFetch<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' }),

  getAllVehicles: () => apiFetch<Vehicle[]>('/admin/vehicles'),

  getAllBookings: () => apiFetch<Booking[]>('/admin/bookings'),

  getAuditLogs: (page: number = 1, limit: number = 20) =>
    apiFetch<AuditLogResponse>(`/admin/audit-logs?page=${page}&limit=${limit}`),

  getPendingPayments: () => apiFetch<any[]>('/admin/payments/pending'),

  verifyPayment: (paymentId: string, status: 'approved' | 'rejected', rejectionReason?: string) =>
    apiFetch<{ message: string }>(`/admin/payments/verify`, {
      method: 'POST',
      body: JSON.stringify({ paymentId, status, rejectionReason }),
    }),
};

// =================== SUBADMIN ===================
export const subadminApi = {
  getStats: () => apiFetch<SubadminStats>('/subadmin/stats'),

  getPendingUsers: () => apiFetch<User[]>('/subadmin/pending-users'),

  getUserKycDetails: (userId: string) => apiFetch<User>(`/subadmin/user/${userId}`),

  approveUser: (userId: string) =>
    apiFetch<{ message: string; user: User }>(`/subadmin/approve-user/${userId}`, {
      method: 'PATCH',
    }),

  rejectUser: (userId: string, reason: string, comment?: string) =>
    apiFetch<{ message: string; user: User }>(`/subadmin/reject-user/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reason, comment }),
    }),

  getPendingVehicles: () => apiFetch<Vehicle[]>('/subadmin/pending-vehicles'),

  approveVehicle: (vehicleId: string) =>
    apiFetch<{ message: string; vehicle: Vehicle }>(`/subadmin/approve-vehicle/${vehicleId}`, {
      method: 'PATCH',
    }),

  rejectVehicle: (vehicleId: string, reason: string, comment?: string) =>
    apiFetch<{ message: string; vehicle: Vehicle }>(`/subadmin/reject-vehicle/${vehicleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reason, comment }),
    }),

  updateReviewStatus: (reviewId: string, status: string, reason?: string, comment?: string) =>
    apiFetch<{ message: string; review: Review }>(`/subadmin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason, comment }),
    }),

  getAllReviews: () =>
    apiFetch<Review[]>('/subadmin/reviews'),

  getPendingMakes: () => apiFetch<VehicleMake[]>('/subadmin/pending-makes'),

  getPendingModels: () => apiFetch<VehicleModel[]>('/subadmin/pending-models'),

  approveMake: (id: string) => apiFetch<{ message: string; make: VehicleMake }>(`/subadmin/approve-make/${id}`, { method: 'PATCH' }),

  approveModel: (id: string) => apiFetch<{ message: string; model: VehicleModel }>(`/subadmin/approve-model/${id}`, { method: 'PATCH' }),

  deleteMake: (id: string) => apiFetch<{ message: string }>(`/subadmin/make/${id}`, { method: 'DELETE' }),

  deleteModel: (id: string) => apiFetch<{ message: string }>(`/subadmin/model/${id}`, { method: 'DELETE' }),
};

// =================== REVIEWS ===================
export const reviewApi = {
  create: (bookingId: string, rating: number, comment: string) =>
    apiFetch<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify({ bookingId, rating, comment }),
    }),

  getForVehicle: (vehicleId: string) =>
    apiFetch<Review[]>(`/reviews/vehicle/${vehicleId}`),

  getMyReviews: () =>
    apiFetch<Review[]>('/reviews/owner'),

  toggleVisibility: (reviewId: string) =>
    apiFetch<{ message: string; review: Review }>(`/reviews/${reviewId}/hide`, {
      method: 'PATCH',
    }),
};

// =================== USER ===================
export const userApi = {
  submitKyc: (formData: FormData) =>
    fetch(`${API_BASE_URL}/users/verify`, {
      method: 'POST',
      headers: authHeadersOnly(),
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'KYC submission failed');
      return data;
    }),

  updateProfile: (formData: FormData) =>
    fetch(`${API_BASE_URL}/users/update-profile`, {
      method: 'PUT',
      headers: authHeadersOnly(),
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Profile update failed');
      return data;
    }),

  becomeOwner: () =>
    apiFetch<{ message: string; user: User }>('/users/become-owner', {
      method: 'POST',
    }),
};

// =================== OWNER / SUBSCRIPTIONS ===================
export const ownerApi = {
  getSubscription: () =>
    apiFetch<{ subscription: User['subscription'] }>('/auth/me').then(res => res.subscription),

  // Placeholder for future implementation
  initiateSubscription: (tier: string, duration: string, amount: number, reference: string) =>
    apiFetch<{ message: string }>('/owner/subscribe', {
      method: 'POST',
      body: JSON.stringify({ tier, duration, amount, reference }),
    }),
};
