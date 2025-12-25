export interface User {
    id: string;
    username: string;
    email?: string;
    role: 'ADMIN' | 'USER' | 'GUEST';
    isActive: boolean;
    canShareAccessCode: boolean;
    createdAt: string;
    tokenUsage?: {
        totalTokens: number;
        cost: number;
    };
}

export interface InviteCode {
    id: string;
    code: string;
    isUsed: boolean;
    usedBy?: string;
    usedAt?: string;
    expiresAt?: string;
    maxUses: number;
    currentUses: number;
    createdAt: string;
    creator: {
        id: string;
        username: string;
    };
}

export interface SystemStats {
    totalUsers: number;
    activeUsers: number;
    totalInviteCodes: number;
    usedInviteCodes: number;
    totalAccessCodes: number;
    usedAccessCodes: number;
    detailed?: {
        userCount?: {
            admin: number;
        };
        modelUsage?: {
            totalModels: number;
            activeModels: number;
            totalProviders: number;
        };
    };
}

export interface SystemSettings {
    systemNameSuffix?: string;
    systemDescription?: string;
    allowRegistration?: boolean;
    requireInviteCode?: boolean;
    sessionTimeout?: number;
    maxConcurrentRequests?: number;
    enableRateLimit?: boolean;
    title_generation_model_id?: string;
    system_default_model_id?: string;
    enable_last_used_model?: boolean;
}

export interface Model {
    id: string;
    modelId: string;
    name: string;
    providerId: string;
    isEnabled: boolean;
    isCustom?: boolean;
    contextWindow?: number;
    maxTokens?: number;
    inputPrice?: number;
    outputPrice?: number;
    description?: string;
    group?: string;
    order?: number;
    _isTemporary?: boolean;
    providerName?: string;
}

export interface Provider {
    id: string;
    name: string;
    displayName: string;
    icon?: string;
    description?: string;
    isEnabled: boolean;
    sortOrder: number;
    models?: Model[];
    config?: any;
}
