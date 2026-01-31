import { MOCK_CURRENT_USER_ID } from "@/features/messaging/domain/constants";

export interface HttpClientConfig {
  baseURL?: string;
  getAuthToken?: () => string | null;
}

export abstract class BaseRepository {
  protected baseURL: string;
  protected getAuthToken: () => string | null;

  constructor(config: HttpClientConfig = {}) {
    this.baseURL = config.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    this.getAuthToken = config.getAuthToken || (() => null);
  }

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Mock-User-Id': MOCK_CURRENT_USER_ID, // TODO: Replace with real auth
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  protected async extractError(response: Response): Promise<string> {
    try {
      const json = await response.json();
      return json.error || json.message || `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }

  protected handleError(error: unknown): string {
    if (error instanceof TypeError) {
      return 'Network error. Please check your connection.';
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}