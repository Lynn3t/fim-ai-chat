// 用户相关类型
export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'USER' | 'GUEST';
  isActive: boolean;
  canShareAccessCode: boolean;
  hostUserId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatConfig {
  role: string;
  canSaveToDatabase: boolean;
  allowedModels: string[];
  tokenLimit?: number;
  tokenUsed?: number;
  hostUserId?: string;
}

// 消息相关类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  modelId?: string;
  providerId?: string;
  tokenUsage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

// AI提供商和模型类型
export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  baseUrl: string;
  isEnabled: boolean;
  order: number;
  models: AIModel[];
  createdAt: string;
  updatedAt: string;
}

export interface AIModel {
  id: string;
  providerId: string;
  modelId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  order: number;
  group?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  createdAt: string;
  updatedAt: string;
}

// 聊天历史类型
export interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  provider?: AIProvider;
  model?: AIModel;
}

export interface Conversation {
  id: string;
  userId: string;
  providerId: string;
  modelId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

// 邀请码和访问码类型
export interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  isActive: boolean;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessCode {
  id: string;
  code: string;
  createdBy: string;
  isActive: boolean;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  allowedModelIds?: string;
  tokenLimit?: number;
  createdAt: string;
  updatedAt: string;
}

// API请求和响应类型
export interface ChatRequest {
  messages: Message[];
  userId: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  message: Message;
  tokenUsage: TokenUsage;
  finishReason?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: any;
  timestamp: string;
}

// 权限相关类型
export interface UserPermission {
  id: string;
  userId: string;
  canChat: boolean;
  canCreateInvite: boolean;
  canCreateAccess: boolean;
  canAccessAdmin: boolean;
  allowedModelIds?: string[];
  tokenLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionCheck {
  canChat: boolean;
  canCreateInvite: boolean;
  canCreateAccess: boolean;
  canAccessAdmin: boolean;
  allowedModels: string[];
  tokenLimit?: number;
  tokenUsed?: number;
  error?: string;
}

// 统计相关类型
export interface TokenStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  todayTokens: number;
  todayCost: number;
}

export interface AdminStats {
  userCount: {
    total: number;
    active: number;
    admin: number;
    user: number;
    guest: number;
  };
  tokenUsage: {
    totalTokens: number;
    totalCost: number;
    todayTokens: number;
    todayCost: number;
  };
  codeUsage: {
    totalInviteCodes: number;
    activeInviteCodes: number;
    totalAccessCodes: number;
    activeAccessCodes: number;
  };
  modelUsage: {
    totalModels: number;
    activeModels: number;
    totalProviders: number;
    activeProviders: number;
  };
}

// 表单相关类型
export interface RegisterData {
  username: string;
  email?: string;
  password?: string;
  inviteCode?: string;
  accessCode?: string;
  isFirstAdmin?: boolean; // 是否是第一个管理员注册
}

export interface LoginData {
  username: string;
  password?: string;
  accessCode?: string;
}

// Toast相关类型
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// 组件Props类型
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'ADMIN' | 'USER' | 'GUEST';
}

export interface MessageActionsProps {
  content: string;
  messageRole: 'user' | 'assistant';
  onCopy?: () => void;
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  onResend?: () => void;
}

export interface AIIconProps {
  modelId: string;
  size?: number;
  className?: string;
}

// 工具函数类型
export interface AIModelCategory {
  name: string;
  pattern: RegExp;
  iconName: string;
}

// 数据库相关类型（Prisma生成的类型的简化版本）
export type UserRole = 'ADMIN' | 'USER' | 'GUEST';

export interface DatabaseUser {
  id: string;
  email?: string;
  username?: string;
  password?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  canShareAccessCode: boolean;
  invitedBy?: string;
  usedInviteCode?: string;
  usedAccessCode?: string;
  hostUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 环境变量类型
export interface EnvironmentConfig {
  DATABASE_URL: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

// 错误类型
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}
