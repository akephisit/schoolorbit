import { PUBLIC_API_BASE } from '$env/static/public';

export interface ApiResponse<T> {
	data: T;
	meta?: any;
}

export interface ApiError {
	type: string;
	title: string;
	status: number;
	code: string;
	detail?: string;
	fields?: any;
	traceId: string;
}

export class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string = PUBLIC_API_BASE) {
		this.baseUrl = baseUrl;
	}

	async fetch<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		
		const defaultOptions: RequestInit = {
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			}
		};

		const response = await fetch(url, { ...defaultOptions, ...options });
		
		if (!response.ok) {
			if (response.headers.get('content-type')?.includes('application/problem+json')) {
				const error: ApiError = await response.json();
				throw new Error(error.title || 'API Error');
			}
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const contentType = response.headers.get('content-type');
		if (contentType && contentType.includes('application/json')) {
			return await response.json();
		}

		return response as any;
	}

	async get<T>(endpoint: string): Promise<T> {
		return this.fetch<T>(endpoint, { method: 'GET' });
	}

	async post<T>(endpoint: string, data?: any): Promise<T> {
		return this.fetch<T>(endpoint, {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined
		});
	}

	async put<T>(endpoint: string, data?: any): Promise<T> {
		return this.fetch<T>(endpoint, {
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined
		});
	}

	async delete<T>(endpoint: string): Promise<T> {
		return this.fetch<T>(endpoint, { method: 'DELETE' });
	}
}

export const api = new ApiClient();