import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApiConfig {
  baseURL: string;
  apiKey: string;
  timeout: number;
}

interface UserProfile {
  telegram_id: number;
  username?: string;
  name: string;
  title: string;
  description: string;
  github_username?: string;
  linkedin_url?: string;
  website_url?: string;
  world_id?: string;
  privacy_settings: {
    profile_visible: boolean;
    show_github: boolean;
    show_linkedin: boolean;
    show_website: boolean;
    show_world_id: boolean;
    allow_search: boolean;
    allow_connections: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface Connection {
  id: string;
  requester_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  results: UserProfile[];
  cached: boolean;
  query: string;
  limit: number;
  offset: number;
  total: number;
}

class ApiClient {
  private client: AxiosInstance;
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          await AsyncStorage.removeItem('auth_token');
          // You might want to redirect to login here
        }
        return Promise.reject(error);
      }
    );
  }

  // User Profile Methods
  async getUserProfile(userId: number): Promise<UserProfile> {
    const response = await this.client.get(`/api/v1/users/${userId}`);
    return response.data.user;
  }

  async updateUserProfile(userId: number, updates: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.client.put(`/api/v1/users/${userId}`, updates);
    return response.data.user;
  }

  async deleteUserProfile(userId: number): Promise<void> {
    await this.client.delete(`/api/v1/users/${userId}`);
  }

  // Connection Methods
  async getUserConnections(userId: number): Promise<Connection[]> {
    const response = await this.client.get(`/api/v1/connections?userId=${userId}`);
    return response.data.connections;
  }

  async createConnection(requesterId: number, receiverId: number): Promise<Connection> {
    const response = await this.client.post('/api/v1/connections', {
      requesterId,
      receiverId
    });
    return response.data.connection;
  }

  async updateConnectionStatus(connectionId: string, status: 'accepted' | 'declined'): Promise<Connection> {
    const response = await this.client.put(`/api/v1/connections/${connectionId}`, { status });
    return response.data.connection;
  }

  async getPendingRequests(userId: number): Promise<Connection[]> {
    const response = await this.client.get(`/api/v1/connections/pending?userId=${userId}`);
    return response.data.pending_requests;
  }

  // Search Methods
  async searchUsers(query: string, limit: number = 10, offset: number = 0, userId?: number): Promise<SearchResult> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (userId) {
      params.append('userId', userId.toString());
    }

    const response = await this.client.get(`/api/v1/search?${params}`);
    return response.data;
  }

  async advancedSearch(filters: {
    industry?: string;
    skills?: string[];
    location?: string;
    experience?: string;
    availability?: string;
  }, limit: number = 10, offset: number = 0, userId?: number): Promise<SearchResult> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (userId) {
      params.append('userId', userId.toString());
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value);
        }
      }
    });

    const response = await this.client.get(`/api/v1/search/advanced?${params}`);
    return response.data;
  }

  async getRecommendations(userId: number): Promise<UserProfile[]> {
    const response = await this.client.get(`/api/v1/search/recommendations?userId=${userId}`);
    return response.data.recommendations;
  }

  // Health Check
  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Admin Methods (if user has admin privileges)
  async getSystemStats(): Promise<any> {
    const response = await this.client.get('/api/v1/admin/stats');
    return response.data;
  }

  async getPerformanceMetrics(): Promise<any> {
    const response = await this.client.get('/api/v1/admin/performance');
    return response.data;
  }

  async getCacheStats(): Promise<any> {
    const response = await this.client.get('/api/v1/admin/cache');
    return response.data;
  }

  // Authentication
  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('auth_token', token);
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  }

  async clearAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
  }

  // Error handling
  handleError(error: any): string {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}

// Create default API client instance
const apiClient = new ApiClient({
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY || 'your-api-key-here',
  timeout: 10000
});

export default apiClient;
export type { UserProfile, Connection, SearchResult }; 