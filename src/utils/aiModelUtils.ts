// AI模型分类和logo匹配工具

export interface AIModelCategory {
  name: string;
  pattern: RegExp;
  iconName: string;
}

// AI模型分类规则
export const AI_MODEL_CATEGORIES: AIModelCategory[] = [
  { name: 'Claude', pattern: /claude/i, iconName: 'Claude' },
  { name: 'DALL-E', pattern: /dall/i, iconName: 'OpenAI' },
  { name: 'DeepSeek', pattern: /deepseek/i, iconName: 'DeepSeek' },
  { name: 'Grok', pattern: /grok/i, iconName: 'X' },
  { name: 'Gemini', pattern: /gemini/i, iconName: 'Google' },
  { name: 'MoonShot', pattern: /(moonshot|kimi)/i, iconName: 'Moonshot' },
  { name: 'WenXin', pattern: /(wenxin|ernie)/i, iconName: 'Baidu' },
  { name: 'DouBao', pattern: /doubao/i, iconName: 'ByteDance' },
  { name: 'HunYuan', pattern: /hunyuan/i, iconName: 'Tencent' },
  { name: 'Cohere', pattern: /command/i, iconName: 'Cohere' },
  { name: 'GLM', pattern: /glm/i, iconName: 'Zhipu' },
  { name: 'Llama', pattern: /llama/i, iconName: 'Meta' },
  { name: 'Qwen', pattern: /(qwen|qwq|qvq)/i, iconName: 'Alibaba' },
  { name: 'ChatGPT', pattern: /(gpt|o1|o3|o4|openai)/i, iconName: 'OpenAI' },
  { name: 'Mistral', pattern: /mistral/i, iconName: 'Mistral' },
  { name: 'Yi', pattern: /\byi[-_:]|^yi$/i, iconName: 'Yi' },
  { name: 'SenseNova', pattern: /(sensenova|sense)/i, iconName: 'SenseTime' },
  { name: 'Spark', pattern: /spark/i, iconName: 'iFlytek' },
  { name: 'MiniMax', pattern: /(minimax|abab)/i, iconName: 'MiniMax' },
  { name: 'HaiLuo', pattern: /hailuo/i, iconName: 'MiniMax' },
  { name: 'Gemma', pattern: /gemma/i, iconName: 'Google' },
  { name: 'StepFun', pattern: /stepfun/i, iconName: 'StepFun' },
  { name: 'Ollama', pattern: /ollama/i, iconName: 'Ollama' },
  { name: 'ComfyUI', pattern: /comfyui/i, iconName: 'ComfyUI' },
  { name: 'VolcEngine', pattern: /volcengine/i, iconName: 'ByteDance' },
  { name: 'VertexAI', pattern: /vertexai/i, iconName: 'Google' },
  { name: 'SiliconCloud', pattern: /siliconcloud/i, iconName: 'SiliconCloud' },
  { name: 'Perplexity', pattern: /perplexity/i, iconName: 'Perplexity' },
  { name: 'Stability', pattern: /stability/i, iconName: 'StabilityAI' },
  { name: 'Flux', pattern: /flux/i, iconName: 'Flux' },
];

/**
 * 根据模型ID获取AI分类
 */
export function getAIModelCategory(modelId: string): AIModelCategory | null {
  for (const category of AI_MODEL_CATEGORIES) {
    if (category.pattern.test(modelId)) {
      return category;
    }
  }
  return null;
}

/**
 * 根据模型ID获取图标名称
 */
export function getAIModelIcon(modelId: string): string {
  const category = getAIModelCategory(modelId);
  return category?.iconName || 'OpenAI'; // 默认使用OpenAI图标
}

/**
 * 根据模型ID获取分类名称
 */
export function getAIModelCategoryName(modelId: string): string {
  const category = getAIModelCategory(modelId);
  return category?.name || 'Other';
}

/**
 * 根据分组名称获取图标名称
 */
export function getGroupIcon(groupName: string): string {
  // 查找匹配的分类
  const category = AI_MODEL_CATEGORIES.find(cat => cat.name === groupName);
  return category?.iconName || 'OpenAI'; // 默认使用OpenAI图标
}

/**
 * 根据用户自定义的分组排序对分组进行排序
 */
export function sortGroupsByUserOrder(
  groups: Record<string, any[]>,
  userGroupOrders: Array<{ groupName: string; order: number }> = []
): string[] {
  const groupNames = Object.keys(groups);

  // 创建用户自定义排序的映射
  const userOrderMap = new Map<string, number>();
  userGroupOrders.forEach(({ groupName, order }) => {
    userOrderMap.set(groupName, order);
  });

  // 获取默认排序作为后备
  const defaultOrder = getCategorySortOrder();

  return groupNames.sort((a, b) => {
    // 优先使用用户自定义排序
    const userOrderA = userOrderMap.get(a);
    const userOrderB = userOrderMap.get(b);

    if (userOrderA !== undefined && userOrderB !== undefined) {
      return userOrderA - userOrderB;
    }

    if (userOrderA !== undefined) return -1;
    if (userOrderB !== undefined) return 1;

    // 回退到默认排序
    const defaultIndexA = defaultOrder.indexOf(a);
    const defaultIndexB = defaultOrder.indexOf(b);

    if (defaultIndexA !== -1 && defaultIndexB !== -1) {
      return defaultIndexA - defaultIndexB;
    }

    if (defaultIndexA !== -1) return -1;
    if (defaultIndexB !== -1) return 1;

    // 最后按字母顺序排序
    return a.localeCompare(b);
  });
}

/**
 * 获取带有用户自定义排序的模型分组
 */
export function getModelGroupsWithUserOrder(
  models: any[],
  userGroupOrders: Array<{ groupName: string; order: number }> = []
): { groupName: string; models: any[]; order: number }[] {
  const groups = getModelGroups(models);
  const sortedGroupNames = sortGroupsByUserOrder(groups, userGroupOrders);

  // 创建用户排序映射
  const userOrderMap = new Map<string, number>();
  userGroupOrders.forEach(({ groupName, order }) => {
    userOrderMap.set(groupName, order);
  });

  return sortedGroupNames.map((groupName, index) => ({
    groupName,
    models: groups[groupName],
    order: userOrderMap.get(groupName) ?? (index + 1000) // 没有自定义排序的分组放在后面
  }));
}

/**
 * 将模型列表按分类分组
 */
export function groupModelsByCategory<T extends { modelId: string }>(models: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  
  models.forEach(model => {
    const categoryName = getAIModelCategoryName(model.modelId);
    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }
    groups[categoryName].push(model);
  });
  
  return groups;
}

/**
 * 获取分组的排序顺序
 * 按照用户要求的顺序
 */
export function getCategorySortOrder(): string[] {
  return [
    'ChatGPT',
    'Claude',
    'DeepSeek',
    'Gemini',
    'Grok',
    'Qwen',
    'Llama',
    'DouBao',
    'Gemma',
    'Mistral',
    // 剩下的按字母排序
    'Baichuan',
    'Cohere',
    'ComfyUI',
    'DALL-E',
    'Flux',
    'GLM',
    'HaiLuo',
    'HunYuan',
    'MiniMax',
    'MoonShot',
    'Ollama',
    'Perplexity',
    'SenseNova',
    'SiliconCloud',
    'Spark',
    'Stability',
    'StepFun',
    'VertexAI',
    'VolcEngine',
    'WenXin',
    'Yi',
    'Other'
  ];
}

/**
 * 按预定义顺序排序分组
 */
export function sortCategoriesByOrder(categories: string[]): string[] {
  const sortOrder = getCategorySortOrder();
  return categories.sort((a, b) => {
    const indexA = sortOrder.indexOf(a);
    const indexB = sortOrder.indexOf(b);

    // 如果都在排序列表中，按顺序排序
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // 如果只有一个在排序列表中，在列表中的排在前面
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // 如果都不在排序列表中，按字母顺序排序
    return a.localeCompare(b);
  });
}

/**
 * 按order字段排序列表
 */
export function sortByOrder<T extends { order?: number; id: string }>(items: T[]): T[] {
  return items.sort((a, b) => {
    // 如果都有order字段，按order排序
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // 如果只有一个有order字段，有order的排在前面
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    // 如果都没有order字段，按id排序（保持稳定顺序）
    return a.id.localeCompare(b.id);
  });
}

/**
 * 按order字段排序模型列表
 */
export function sortModelsByOrder<T extends { order?: number; id: string }>(models: T[]): T[] {
  return sortByOrder(models);
}

// 获取模型的混合分组（自定义分组优先，然后是AI分类）
export function getModelGroups<T extends { modelId: string; group?: string; order?: number; id: string }>(
  models: T[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  customGroups: { id: string; name: string }[] = []
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  models.forEach(model => {
    const groupName = model.group || getAIModelCategoryName(model.modelId);
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(model);
  });

  // 对每个分组内的模型按order排序
  Object.keys(groups).forEach(groupName => {
    groups[groupName] = sortModelsByOrder(groups[groupName]);
  });

  return groups;
}

// Auto pricing mapping based on model ID and global LLM API pricing.
export interface ModelTokenPricing {
  inputPrice: number;
  outputPrice: number;
}

export const MODEL_TOKEN_PRICING: Record<string, ModelTokenPricing> = {
  'gpt-4.1': { inputPrice: 2.0, outputPrice: 8.0 },
  'gpt-4.1-mini': { inputPrice: 0.4, outputPrice: 1.6 },
  'gpt-4.1-nano': { inputPrice: 0.1, outputPrice: 0.4 },
  'gpt-4o': { inputPrice: 5.0, outputPrice: 20.0 },
  'gpt-4o-mini': { inputPrice: 0.6, outputPrice: 2.4 },
  'gpt-4-turbo': { inputPrice: 10.0, outputPrice: 30.0 },
  'gpt-4': { inputPrice: 30.0, outputPrice: 60.0 },
  'gpt-3.5-turbo': { inputPrice: 0.5, outputPrice: 1.5 },
  'gemini-2.5-pro': { inputPrice: 4.0, outputPrice: 20.0 },
  'gemini-1.5-pro': { inputPrice: 2.5, outputPrice: 15.0 },
  'gemini-1.5-flash': { inputPrice: 0.15, outputPrice: 0.6 },
  'gemini-2.0-flash': { inputPrice: 0.3, outputPrice: 2.5 },
  'gemini-2.0-flash-lite': { inputPrice: 0.1, outputPrice: 0.4 },
  'claude-4-opus': { inputPrice: 15.0, outputPrice: 75.0 },
  'claude-4-sonnet': { inputPrice: 3.0, outputPrice: 15.0 },
  'claude-3.5-sonnet': { inputPrice: 3.0, outputPrice: 15.0 },
  'claude-3.5-haiku': { inputPrice: 0.8, outputPrice: 4.0 },
  'claude-3-opus': { inputPrice: 15.0, outputPrice: 75.0 },
  'claude-3-sonnet': { inputPrice: 3.0, outputPrice: 15.0 },
  'claude-3-haiku': { inputPrice: 0.25, outputPrice: 1.25 },
  'grok-4': { inputPrice: 3.0, outputPrice: 15.0 },
  'grok-3-mini': { inputPrice: 0.3, outputPrice: 0.5 },
  'glm-4-flash': { inputPrice: 0.0, outputPrice: 0.0 },
  'glm-z1-flashx': { inputPrice: 0.01, outputPrice: 0.01 },
  'glm-4-air': { inputPrice: 0.07, outputPrice: 0.07 },
  'glm-4-plus': { inputPrice: 0.69, outputPrice: 0.69 },
  'glm-4-airx': { inputPrice: 1.38, outputPrice: 1.38 },
  'glm-4-0520': { inputPrice: 13.79, outputPrice: 13.79 },
  'doubao-1.5-pro-32k': { inputPrice: 0.11, outputPrice: 0.28 },
  'doubao-1.5-pro-256k': { inputPrice: 0.69, outputPrice: 1.24 },
  'kimi-k2-0711-preview': { inputPrice: 0.55, outputPrice: 2.21 },
  'kimi-latest-128k': { inputPrice: 1.38, outputPrice: 4.14 },
  'kimi-thinking-preview': { inputPrice: 27.59, outputPrice: 27.59 },
  'deepseek-r1': { inputPrice: 0.55, outputPrice: 2.19 },
  'deepseek-v3': { inputPrice: 0.14, outputPrice: 0.28 },
  'deepseek-chat': { inputPrice: 0.27, outputPrice: 1.10 },
  'deepseek-reasoner': { inputPrice: 0.55, outputPrice: 2.19 },
};

export function getAutoPricing(modelId: string): ModelTokenPricing | null {
  const normalizedId = modelId.toLowerCase();
  if (normalizedId.includes('free')) {
    return { inputPrice: 0, outputPrice: 0 };
  }
  const keys = Object.keys(MODEL_TOKEN_PRICING).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (normalizedId.includes(key)) {
      return MODEL_TOKEN_PRICING[key];
    }
  }
  return null;
}
