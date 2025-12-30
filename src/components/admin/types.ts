// 从中央类型文件导出，保持向后兼容
export type {
  User,
  InviteCode,
  AIModel as Model,
  AIProvider as Provider,
  SystemSettings,
  SystemStats,
} from '@/types';

// 重新导出 Model 和 Provider 别名
import type { AIModel, AIProvider } from '@/types';
export type Model = AIModel;
export type Provider = AIProvider;
