const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiCall = async (endpoint, method = 'GET', body = null) => {
  const token = localStorage.getItem('token') || localStorage.getItem('dawnow_token');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    return;
  }
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'API Error' }));
    throw new Error(err.message || 'API Error');
  }
  
  return res.json();
};
