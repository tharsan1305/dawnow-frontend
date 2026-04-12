import { apiCall } from '../utils/api';

// ============ STAFF API ============
export const staffAPI = {
    getMyReports: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/staff/my-reports?${query}`);
    },
    getStreak: () => apiCall('/staff/streak'),
    getResearchTargets: () => apiCall('/staff/targets'),
    getTasks: (params) => {
        const query = new URLSearchParams(params || {}).toString();
        return apiCall(`/staff/tasks?${query}`);
    },
    getById: (id) => apiCall(`/staff/tasks/${id}`),
    getTaskToday: () => apiCall('/staff/tasks/today'),
    getTaskByDate: (date) => apiCall(`/staff/tasks/date/${date}`),
    create: (data) => apiCall('/staff/tasks', 'POST', data),
    update: (id, data) => apiCall(`/staff/tasks/${id}`, 'PUT', data),
    delete: (id) => apiCall(`/staff/tasks/${id}`, 'DELETE'),
    
    getNotifications: () => apiCall('/staff/notifications'),
    getUnreadCount: () => apiCall('/staff/notifications/unread-count'),
    markAsRead: (id) => apiCall(`/staff/notifications/${id}/read`, 'PUT'),
    markAllAsRead: () => apiCall('/staff/notifications/read-all', 'PUT'),
    
    getProfile: () => apiCall('/staff/profile'),
    updateProfile: (data) => apiCall('/staff/profile', 'PUT', data),
    updatePassword: (data) => apiCall('/staff/profile/password', 'PUT', data),

    getSettings: () => apiCall('/settings/cutoff-time'),
    getHolidays: () => apiCall('/settings/holidays')
};

// ============ ADMIN API ============
export const adminAPI = {
    getDashboardStats: () => apiCall('/admin/dashboard/stats'),
    getTodayStatus: () => apiCall('/admin/dashboard/today-status'),
    getRecentReports: () => apiCall('/admin/dashboard/recent-reports'),
    
    getReports: (params) => {
        const query = new URLSearchParams(params || {}).toString();
        return apiCall(`/admin/reports?${query}`);
    },
    approveReport: (id) => apiCall(`/admin/reports/${id}/approve`, 'PUT'),
    rejectReport: (id, reason) => apiCall(`/admin/reports/${id}/reject`, 'PUT', { reason }),
    deleteReport: (id) => apiCall(`/admin/reports/${id}`, 'DELETE'),
    
    getWeeklyMatrix: (week = 'current') => apiCall(`/admin/weekly-matrix?week=${week}`),
    bulkUpdateMatrix: (edits) => apiCall('/admin/weekly-matrix/bulk-update', 'POST', { edits }),
    
    getAnalytics: (type) => apiCall(`/admin/dashboard/analytics/${type}`), // weekly-trend, activity-types, etc.
    
    getVerificationPending: () => apiCall('/admin/verification/pending'),
    approveVerification: (id) => apiCall(`/admin/verification/${id}/approve`, 'PUT'),
    rejectVerification: (id, reason) => apiCall(`/admin/verification/${id}/reject`, 'PUT', { reason }),

    getStaff: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/admin/staff?${query}`);
    },
    createStaff: (data) => apiCall('/admin/staff', 'POST', data),
    updateStaff: (id, data) => apiCall(`/admin/staff/${id}`, 'PUT', data),
    deleteStaff: (id) => apiCall(`/admin/staff/${id}`, 'DELETE'),
    setStaffTarget: (id, target) => apiCall(`/admin/staff/${id}/target`, 'PUT', { target }),
    sendReminder: (id) => apiCall(`/admin/staff/${id}/send-reminder`, 'POST'),

    getUsers: () => apiCall('/admin/users'),
    createUser: (data) => apiCall('/admin/users', 'POST', data),
    resetPassword: (id, data) => apiCall(`/admin/users/${id}/reset-password`, 'PUT', data),
    deleteUser: (id) => apiCall(`/admin/users/${id}`, 'DELETE'),

    getCutoffTime: () => apiCall('/settings/cutoff-time'),
    updateCutoffTime: (value) => apiCall('/settings/cutoff-time', 'PUT', { value }),
    getHolidays: () => apiCall('/settings/holidays'),
    addHoliday: (data) => apiCall('/settings/holidays', 'POST', data),
    deleteHoliday: (id) => apiCall(`/settings/holidays/${id}`, 'DELETE'),
    bulkApproveToday: () => apiCall('/settings/bulk-approve-today', 'POST'),

    getPwdRequests: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/admin/pwd-requests?${query}`);
    },
    updatePwdRequest: (id, data) => apiCall(`/admin/pwd-requests/${id}`, 'PATCH', data)
};

// ============ LEAVE API ============
export const leaveAPI = {
    apply: (data) => apiCall('/leave/apply', 'POST', data),
    getMyLeaves: () => apiCall('/leave/my-leaves'),
    getRequests: () => apiCall('/leave/requests'),
    approve: (id) => apiCall(`/leave/requests/${id}/approve`, 'PUT'),
    reject: (id, reason) => apiCall(`/leave/requests/${id}/reject`, 'PUT', { reason })
};

// ============ ANNOUNCEMENTS API ============
export const announcementAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/notices?${query}`);
    },
    create: (data) => apiCall('/notices', 'POST', data),
    update: (id, data) => apiCall(`/notices/${id}`, 'PUT', data),
    delete: (id) => apiCall(`/notices/${id}`, 'DELETE'),
    getReadStatus: (id) => apiCall(`/notices/${id}/read-status`),
    markRead: (id) => apiCall(`/notices/${id}/read`, 'POST')
};

// ============ AUTH API ============
export const authAPI = {
    login: (credentials) => apiCall('/auth/login', 'POST', credentials),
    logout: () => apiCall('/auth/logout', 'POST'),
    getMe: () => apiCall('/auth/me'),
    getProfile: () => apiCall('/auth/me'), // Alias
    updateProfile: (data) => apiCall('/auth/profile', 'PUT', data)
};

// ============ MESSAGES API ============
export const messageAPI = {
    getConversation: (userId) => apiCall(`/messages/${userId}`),
    sendMessage: (data) => apiCall('/messages', 'POST', data),
    markAsRead: (userId) => apiCall(`/messages/read/${userId}`, 'PUT'),
    getAdminConversations: () => apiCall('/messages/conversations'),
    getUnreadCount: () => apiCall('/messages/unread-count')
};

// ============ SYSTEM / MISC API ============
export const systemAPI = {
    getSettings: () => apiCall('/settings/cutoff-time'),
    getHolidays: () => apiCall('/settings/holidays')
};

export const questionAPI = {
    getActive: () => apiCall('/questions')
};

export const answerAPI = {
    submit: (data) => apiCall('/answers', 'POST', data),
    getByDate: (date) => apiCall(`/answers/${date}`)
};

// Aliases for compatibility
export const taskAPI = staffAPI;
export const reportAPI = staffAPI;
export const noticeAPI = announcementAPI;
