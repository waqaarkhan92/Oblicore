/**
 * API Client
 * Handles all API requests with authentication and error handling
 */

import { useAuthStore } from '@/lib/store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export interface ApiResponse<T> {
  data: T;
  pagination?: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const { accessToken } = useAuthStore.getState();
    
    console.log(`🌐 API Request: ${endpoint}`);
    console.log(`🔑 Has token:`, !!accessToken);
    console.log(`🔑 Token preview:`, accessToken ? `${accessToken.substring(0, 20)}...` : 'none');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      console.log(`✅ Authorization header set`);
    } else {
      console.warn(`⚠️ No access token available!`);
    }

    console.log(`📤 Request headers:`, Object.keys(headers));

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    console.log(`📥 Response status:`, response.status);
    console.log(`📥 Response ok:`, response.ok);
    console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));

    // Get response text first to see what we're dealing with
    const responseText = await response.text();
    console.log(`📥 Response text length:`, responseText.length);
    console.log(`📥 Response text preview:`, responseText.substring(0, 500));

    let data: any;
    try {
      data = JSON.parse(responseText);
      console.log(`📦 Parsed JSON successfully`);
      console.log(`📦 Response data keys:`, Object.keys(data));
      console.log(`📦 Response data type:`, typeof data.data);
      console.log(`📦 Response data is array:`, Array.isArray(data.data));
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON:`, parseError);
      console.error(`❌ Response text:`, responseText);
      // Create error with raw response text
      const error: any = new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      error.response = { data: responseText, status: response.status };
      error.status = response.status;
      throw error;
    }

    if (!response.ok) {
      console.error(`❌ API Error Status:`, response.status);
      console.error(`❌ API Error Data:`, data);
      console.error(`❌ API Error Keys:`, Object.keys(data));
      console.error(`❌ API Error Full:`, JSON.stringify(data, null, 2));
      // Create an error object that includes the full response
      const errorMessage = data?.error?.message || data?.message || `API request failed with status ${response.status}`;
      const error: any = new Error(errorMessage);
      error.response = { data, status: response.status };
      error.status = response.status;
      error.code = data?.error?.code;
      throw error;
    }

    console.log(`✅ API Success:`, {
      dataCount: Array.isArray(data.data) ? data.data.length : 'not array',
      pagination: data.pagination,
    });

    return data;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const { accessToken } = useAuthStore.getState();
    
    const headers: HeadersInit = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Upload failed');
    }

    return data;
  }
}

export const apiClient = new ApiClient();

