const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiCall = async (endpoint, method = 'GET', body = null) => {
  // Use consistent token key used by Axios and AuthContext
  const token = localStorage.getItem('dawnow_token');
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    
    if (res.status === 401) {
      // ONLY remove specific keys, never use clear() as it might wipe other app data
      localStorage.removeItem('dawnow_token');
      localStorage.removeItem('dawnow_user');
      
      // Only redirect if we are not already at login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return;
    }
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'API Error' }));
        throw new Error(err.message || 'API Error');
    }
    
    return res.json();
  } catch (error) {
    console.error('Fetch API Error:', error);
    throw error;
  }
};
