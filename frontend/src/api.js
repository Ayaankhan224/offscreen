const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const TOKEN_KEY = 'offscreen_auth_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.detail ||
        (Array.isArray(data?.detail)
          ? data.detail.map((e) => e.msg).join(', ')
          : 'Request failed');
      const error = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Could not connect to the backend server. Please verify it is running.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  async register(email, password) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data?.access_token) {
      setToken(data.access_token);
    }
    return data;
  },

  async getMe() {
    return apiRequest('/users/me');
  },

  logout() {
    removeToken();
  },

  // Profile & Survey
  async getProfile() {
    try {
      return await apiRequest('/users/me/profile');
    } catch (err) {
      if (err.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async submitSurvey(surveyData) {
    return apiRequest('/survey/recommendations', {
      method: 'POST',
      body: JSON.stringify(surveyData),
    });
  },

  async updateProfile(surveyData) {
    return apiRequest('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(surveyData),
    });
  },

  // Movies Catalog
  async searchMovies(query, limit = 10) {
    if (!query || !query.trim()) return [];
    return apiRequest(`/movies/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  async getPopularMovies(limit = 30, genre = '') {
    const url = genre
      ? `/movies/popular?limit=${limit}&genre=${encodeURIComponent(genre)}`
      : `/movies/popular?limit=${limit}`;
    return apiRequest(url);
  },

  async getGenres() {
    return apiRequest('/movies/genres');
  },

  // User Recommendations
  async getUserRecommendations(refresh = 0) {
    return apiRequest(`/recommendations/user?refresh=${refresh}`);
  },

  // Library & Interactions
  async toggleWatchlist(movieTitle) {
    return apiRequest('/users/me/watchlist', {
      method: 'POST',
      body: JSON.stringify({ movie_title: movieTitle }),
    });
  },

  async toggleWatched(movieTitle) {
    return apiRequest('/users/me/watched', {
      method: 'POST',
      body: JSON.stringify({ movie_title: movieTitle }),
    });
  },

  async submitReview(movieTitle, review, rating = 5.0) {
    return apiRequest('/users/me/reviews', {
      method: 'POST',
      body: JSON.stringify({
        movie_title: movieTitle,
        review,
        rating: Number(rating),
      }),
    });
  },

  async getLibrary() {
    return apiRequest('/users/me/library');
  },
};
