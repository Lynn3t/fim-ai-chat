/**
 * Token计算和统计工具
 */

/**
 * 估算文本的token数量
 * 这是一个简化的估算方法，实际项目中可以使用更精确的tokenizer
 * @param text 要计算的文本
 * @param language 语言类型，默认为中文
 * @returns 估算的token数量
 */
export function estimateTokens(text: string, language: 'zh' | 'en' = 'zh'): number {
  if (!text) return 0

  // 移除多余的空白字符
  const cleanText = text.trim().replace(/\s+/g, ' ')
  
  if (language === 'zh') {
    // 中文：大约1个汉字 = 1.5个token，1个英文单词 = 1个token
    const chineseChars = (cleanText.match(/[\u4e00-\u9fff]/g) || []).length
    const englishWords = (cleanText.match(/[a-zA-Z]+/g) || []).length
    const numbers = (cleanText.match(/\d+/g) || []).length
    const punctuation = (cleanText.match(/[^\w\s\u4e00-\u9fff]/g) || []).length
    
    return Math.ceil(chineseChars * 1.5 + englishWords + numbers * 0.5 + punctuation * 0.3)
  } else {
    // 英文：大约4个字符 = 1个token
    return Math.ceil(cleanText.length / 4)
  }
}

/**
 * 从API响应中提取token使用量
 * @param usage API返回的usage对象
 * @returns 标准化的token使用量
 */
export function extractTokenUsage(usage: any): {
  promptTokens: number
  completionTokens: number
  totalTokens: number
} {
  if (!usage) {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  }

  return {
    promptTokens: usage.prompt_tokens || usage.promptTokens || 0,
    completionTokens: usage.completion_tokens || usage.completionTokens || 0,
    totalTokens: usage.total_tokens || usage.totalTokens || 0,
  }
}

/**
 * 计算token成本（基于OpenAI定价）
 * @param modelId 模型ID
 * @param promptTokens 输入token数
 * @param completionTokens 输出token数
 * @returns 成本（美元）
 */
export function calculateTokenCost(
  modelId: string, 
  promptTokens: number, 
  completionTokens: number
): number {
  // 简化的定价表（实际项目中应该从配置文件或数据库读取）
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
    'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
    'claude-3-5-sonnet-20241022': { input: 0.003 / 1000, output: 0.015 / 1000 },
    'claude-3-5-haiku-20241022': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
    'claude-3-opus-20240229': { input: 0.015 / 1000, output: 0.075 / 1000 },
  }

  const modelPricing = pricing[modelId]
  if (!modelPricing) {
    return 0 // 未知模型，返回0成本
  }

  return promptTokens * modelPricing.input + completionTokens * modelPricing.output
}

/**
 * 格式化token数量显示
 * @param tokens token数量
 * @returns 格式化的字符串
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString()
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K`
  } else {
    return `${(tokens / 1000000).toFixed(1)}M`
  }
}

/**
 * 格式化成本显示
 * @param cost 成本（美元）
 * @returns 格式化的字符串
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(2)}‰` // 千分之几
  } else {
    return `$${cost.toFixed(4)}`
  }
}
