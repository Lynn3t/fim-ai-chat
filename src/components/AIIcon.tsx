'use client';

import { getAIModelIcon } from '@/utils/aiModelUtils';
import {
  OpenAI,
  Anthropic,
  Google,
  Baidu,
  Tencent,
  Alibaba,
  XAI,
  DeepSeek,
  Moonshot,
  ByteDance,
  Cohere,
  Zhipu,
  Mistral,
  Yi,
  SenseNova,
  Spark,
  Ollama,
  ComfyUI,
  SiliconCloud,
  Perplexity,
  Stability,
  Flux
} from '@lobehub/icons';

interface AIIconProps {
  modelId: string;
  size?: number;
  className?: string;
}

// 图标映射 - 使用lobe icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_COMPONENTS: Record<string, React.ComponentType<any>> = {
  OpenAI: OpenAI,
  Claude: Anthropic,
  Google: Google,
  Baidu: Baidu,
  Tencent: Tencent,
  Alibaba: Alibaba,
  X: XAI,
  DeepSeek: DeepSeek,
  Moonshot: Moonshot,
  ByteDance: ByteDance,
  Cohere: Cohere,
  Zhipu: Zhipu,
  Meta: OpenAI, // 使用OpenAI作为Meta的图标
  Mistral: Mistral,
  Yi: Yi,
  SenseTime: SenseNova,
  iFlytek: Spark,
  MiniMax: OpenAI, // 使用OpenAI作为默认
  StepFun: OpenAI,
  Ollama: Ollama,
  ComfyUI: ComfyUI,
  SiliconCloud: SiliconCloud,
  Perplexity: Perplexity,
  StabilityAI: Stability,
  Flux: Flux,
};

export function AIIcon({ modelId, size = 20, className = '' }: AIIconProps) {
  const iconName = getAIModelIcon(modelId);
  const IconComponent = ICON_COMPONENTS[iconName] || OpenAI;

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title={iconName}
    >
      <IconComponent
        size={size * 0.8}
        className=""
      />
    </div>
  );
}

// 更高级的图标组件，支持lobe icons
export function AIIconAdvanced({ modelId, size = 20, className = '' }: AIIconProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {/* 这里可以根据iconName动态导入lobe icons */}
      {/* 目前使用简化版本 */}
      <AIIcon modelId={modelId} size={size} className={className} />
    </div>
  );
}
