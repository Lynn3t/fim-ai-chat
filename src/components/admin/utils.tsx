import React from 'react';
import {
    OpenAI, Anthropic, Google, Microsoft, Meta, HuggingFace, Cohere, Stability, Replicate, Together,
    Perplexity, Mistral, Baidu, Alibaba, Tencent, ByteDance, DeepSeek, Moonshot, Zhipu, Yi,
    SenseNova, Spark, Ollama, ComfyUI, SiliconCloud, Flux, XAI, Groq, Fireworks, OpenRouter,
    Bedrock, Azure, VertexAI, Claude, Gemini, Qwen, Hunyuan, Wenxin, Doubao, Stepfun, DeepInfra,
    Anyscale, Novita, Runway, Pika, Suno, Ideogram, Recraft
} from '@lobehub/icons';

// 图标映射 - 仅使用黑白风格的图标组件
export const PROVIDER_ICON_MAPPING: Record<string, { component?: React.ComponentType<any>, emoji?: string }> = {
    // 国际主流 AI 提供商
    openai: { component: OpenAI },
    anthropic: { component: Anthropic },
    google: { component: Google },
    microsoft: { component: Microsoft },
    meta: { component: Meta },
    huggingface: { component: HuggingFace },
    cohere: { component: Cohere },
    stability: { component: Stability },
    replicate: { component: Replicate },
    together: { component: Together },
    perplexity: { component: Perplexity },
    mistral: { component: Mistral },
    groq: { component: Groq },
    fireworks: { component: Fireworks },
    openrouter: { component: OpenRouter },
    bedrock: { component: Bedrock },
    azure: { component: Azure },
    vertexai: { component: VertexAI },
    claude: { component: Claude },
    gemini: { component: Gemini },
    xai: { component: XAI },

    // 中国 AI 提供商
    baidu: { component: Baidu },
    alibaba: { component: Alibaba },
    tencent: { component: Tencent },
    bytedance: { component: ByteDance },
    deepseek: { component: DeepSeek },
    moonshot: { component: Moonshot },
    zhipu: { component: Zhipu },
    yi: { component: Yi },
    sensenova: { component: SenseNova },
    spark: { component: Spark },
    qwen: { component: Qwen },
    hunyuan: { component: Hunyuan },
    wenxin: { component: Wenxin },
    doubao: { component: Doubao },
    stepfun: { component: Stepfun },

    // 开源和部署平台
    ollama: { component: Ollama },
    comfyui: { component: ComfyUI },
    siliconcloud: { component: SiliconCloud },
    deepinfra: { component: DeepInfra },
    anyscale: { component: Anyscale },
    novita: { component: Novita },

    // 多媒体 AI
    flux: { component: Flux },
    runway: { component: Runway },
    pika: { component: Pika },
    suno: { component: Suno },
    ideogram: { component: Ideogram },
    recraft: { component: Recraft },

    // 自定义选项
    custom: {},
};

// 获取提供商图标的函数
export function getProviderIcon(iconKey?: string): React.ReactNode {
    if (!iconKey) return <span style={{ fontWeight: 'bold' }}>AI</span>;

    // 处理自定义图标，显示实际的emoji
    if (iconKey.startsWith('custom:')) {
        const customEmoji = iconKey.replace('custom:', '');
        return <span style={{ fontSize: '16px' }}>{customEmoji || '⚙️'}</span>;
    }

    const iconConfig = PROVIDER_ICON_MAPPING[iconKey.toLowerCase()];
    if (!iconConfig) return <span style={{ fontWeight: 'bold' }}>AI</span>;

    // 只使用组件图标，不使用emoji
    if (iconConfig.component) {
        const IconComponent = iconConfig.component;
        return <IconComponent size={16} style={{ color: '#000000' }} />;
    }

    // 如果没有组件图标，使用文本替代
    return <span style={{ fontWeight: 'bold' }}>AI</span>;
}
