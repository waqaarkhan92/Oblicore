/**
 * Test Client Helper
 * Provides utilities for API testing
 */

import { NextRequest } from 'next/server';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  token?: string;
  company_id?: string;
}

export class TestClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async request(
    method: string,
    path: string,
    options: {
      body?: any;
      headers?: Record<string, string>;
      token?: string;
    } = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (options.body) {
      if (options.body instanceof FormData) {
        delete headers['Content-Type']; // Let browser set multipart boundary
        fetchOptions.body = options.body;
      } else {
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    return fetch(url, fetchOptions);
  }

  async get(path: string, options?: { token?: string; headers?: Record<string, string> }) {
    return this.request('GET', path, options);
  }

  async post(path: string, body?: any, options?: { token?: string; headers?: Record<string, string> }) {
    return this.request('POST', path, { body, ...options });
  }

  async put(path: string, body?: any, options?: { token?: string; headers?: Record<string, string> }) {
    return this.request('PUT', path, { body, ...options });
  }

  async delete(path: string, options?: { token?: string; headers?: Record<string, string> }) {
    return this.request('DELETE', path, options);
  }

  async signup(email: string, password: string, companyName?: string): Promise<TestUser> {
    const response = await this.post('/api/v1/auth/signup', {
      email,
      password,
      company_name: companyName || `Test Company ${Date.now()}`,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Signup failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return {
      id: data.data.user.id,
      email,
      password,
      token: data.data.token?.access_token,
      company_id: data.data.user.company_id,
    };
  }

  async login(email: string, password: string): Promise<string> {
    const response = await this.post('/api/v1/auth/login', {
      email,
      password,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Login failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.data.token?.access_token || '';
  }
}

