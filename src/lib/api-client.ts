/**
 * API 客户端层
 * 统一处理 API 请求，减少重复代码
 */

import type {
  Provider,
  Model,
  User,
  InviteCode,
  AccessCode,
  TokenStats,
  SystemSettings,
  SystemStats,
} from '@/types';

// API 响应类型
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API 客户端配置
interface ApiClientConfig {
  baseUrl?: string;
  authenticatedFetch?: typeof fetch;
}

class ApiClient {
  private config: ApiClientConfig = {};

  configure(config: ApiClientConfig) {
    this.config = { ...this.config, ...config };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const fetchFn = this.config.authenticatedFetch || fetch;
    const url = `${this.config.baseUrl || ''}${endpoint}`;

    const response = await fetchFn(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      // 401 未授权时自动重定向到主页（登录页）
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        throw new Error('Unauthorized');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============ Provider API ============

  async getProviders(): Promise<Provider[]> {
    return this.request<Provider[]>('/api/admin/providers');
  }

  async getProvider(id: string): Promise<Provider> {
    return this.request<Provider>(`/api/admin/providers/${id}`);
  }

  async createProvider(data: Partial<Provider>): Promise<Provider> {
    return this.request<Provider>('/api/admin/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProvider(id: string, data: Partial<Provider>): Promise<Provider> {
    return this.request<Provider>(`/api/admin/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProvider(id: string): Promise<void> {
    await this.request(`/api/admin/providers/${id}`, {
      method: 'DELETE',
    });
  }

  async updateProviderOrder(
    providers: Array<{ id: string; order: number }>,
    adminUserId: string
  ): Promise<void> {
    await this.request('/api/admin/providers', {
      method: 'PUT',
      body: JSON.stringify({ adminUserId, providers }),
    });
  }

  // ============ Model API ============

  async getModels(): Promise<Model[]> {
    return this.request<Model[]>('/api/admin/models');
  }

  async getModel(id: string): Promise<Model> {
    return this.request<Model>(`/api/admin/models/${id}`);
  }

  async updateModel(id: string, data: Partial<Model>): Promise<Model> {
    return this.request<Model>(`/api/admin/models/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteModel(id: string): Promise<void> {
    await this.request(`/api/admin/models/${id}`, {
      method: 'DELETE',
    });
  }

  async fetchModelsFromAPI(apiKey: string, baseUrl: string): Promise<{ models: string[]; total: number }> {
    return this.request('/api/fetch-models', {
      method: 'POST',
      body: JSON.stringify({ apiKey, baseUrl }),
    });
  }

  // ============ User API ============

  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/api/admin/users');
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/api/admin/users/${id}`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.request<User>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async resetUserPassword(id: string, newPassword: string): Promise<void> {
    await this.request(`/api/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  // ============ Code API ============

  async getInviteCodes(): Promise<InviteCode[]> {
    return this.request<InviteCode[]>('/api/admin/codes?type=invite');
  }

  async getAccessCodes(): Promise<AccessCode[]> {
    return this.request<AccessCode[]>('/api/admin/codes?type=access');
  }

  async createCode(
    type: 'invite' | 'access',
    data: { maxUses?: number; allowedModelIds?: string[] }
  ): Promise<InviteCode | AccessCode> {
    return this.request('/api/user/codes', {
      method: 'POST',
      body: JSON.stringify({ type, ...data }),
    });
  }

  async deleteCode(codeId: string, type: 'invite' | 'access'): Promise<void> {
    await this.request('/api/user/codes', {
      method: 'DELETE',
      body: JSON.stringify({ codeId, type }),
    });
  }

  // ============ Dashboard API ============

  async getUserDashboard(): Promise<{
    tokenStats: TokenStats;
    accessCodes: AccessCode[];
    inviteCodes: InviteCode[];
    allowedModels: Model[];
    userSettings?: { defaultModelId?: string };
  }> {
    return this.request('/api/user/dashboard');
  }

  async getAdminDashboard(): Promise<{
    stats: SystemStats;
    recentUsers: User[];
    recentCodes: InviteCode[];
  }> {
    return this.request('/api/admin/dashboard');
  }

  async getAdminStats(): Promise<SystemStats> {
    return this.request('/api/admin/stats');
  }

  async getTokenStats(): Promise<TokenStats> {
    return this.request('/api/token-usage');
  }

  // ============ Settings API ============

  async getSystemSettings(): Promise<SystemSettings> {
    return this.request('/api/admin/system-settings');
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return this.request('/api/admin/system-settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async updateUserSettings(settings: { defaultModelId?: string }): Promise<void> {
    await this.request('/api/user/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // ============ Model Groups API ============

  async getModelGroups(): Promise<Array<{ groupName: string; order: number }>> {
    const result = await this.request<ApiResponse<Array<{ groupName: string; order: number }>>>('/api/admin/model-groups');
    return result.data || [];
  }

  async updateModelGroupOrder(
    groupOrders: Array<{ groupName: string; order: number }>
  ): Promise<void> {
    await this.request('/api/admin/model-groups', {
      method: 'PUT',
      body: JSON.stringify({ groupOrders }),
    });
  }

  // ============ Test API ============

  async testConnection(config: {
    openaiApiKey: string;
    openaiBaseUrl: string;
    model: string;
  }): Promise<{
    success: boolean;
    message: string;
    modelAvailable: boolean;
    availableModels: string[];
  }> {
    return this.request('/api/test-connection', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
}

// 导出单例
export const apiClient = new ApiClient();

// 导出配置函数（用于在 AuthContext 中配置）
export function configureApiClient(config: ApiClientConfig) {
  apiClient.configure(config);
}

export default apiClient;
