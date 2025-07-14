/**
 * Token计算和统计工具
 */
import { prisma } from '@/lib/prisma'

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
  const cleanText = text.trim()
  
  if (language === 'zh') {
    // 按照要求统计：
    // 1. 随机1-2个中文字符算1个token
    // 2. 一个英文单词（空格分隔）算1个token
    
    // 分离中文字符和非中文部分
    const chineseChars = (cleanText.match(/[\u4e00-\u9fff]/g) || []).join('')
    // 计算中文token数量：每1-2个汉字为1个token
    const chineseTokens = Math.ceil(chineseChars.length / 2)
    
    // 提取所有非中文部分，按空格分割成单词
    const nonChineseText = cleanText.replace(/[\u4e00-\u9fff]/g, ' ')
    const englishWords = nonChineseText.split(/\s+/).filter(word => word.length > 0)
    const englishTokens = englishWords.length
    
    return chineseTokens + englishTokens
  } else {
    // 英文：按照空格分隔的单词数量
    const words = cleanText.split(/\s+/).filter(word => word.length > 0)
    return words.length || 1 // 至少返回1个token
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
 * 计算token成本（使用数据库中的模型价格配置）
 * @param modelId 模型ID
 * @param promptTokens 输入token数
 * @param completionTokens 输出token数
 * @returns 成本（美元）
 */
export async function calculateTokenCost(
  modelId: string, 
  promptTokens: number, 
  completionTokens: number
): Promise<number> {
  try {
    // 获取模型信息，价格设置现在直接在Model表中
    const model = await prisma.model.findUnique({
      where: { id: modelId }
    });

    if (!model) {
      return calculateDefaultTokenCost(modelId, promptTokens, completionTokens);
    }
    
    // 直接使用模型的价格设置
    if (model.pricingType === 'usage' && model.usagePrice) {
      // 按次计费，每次API调用收取固定费用
      return model.usagePrice;
    } else {
      // 按token计费
      // 输入token计算
      const inputCost = promptTokens * (model.inputPrice / 1000000);
      
      // 输出token计算
      const outputCost = completionTokens * (model.outputPrice / 1000000);
      
      return inputCost + outputCost;
    }
  } catch (error) {
    console.error('Error calculating token cost:', error);
    // 出错时回退到默认计算方式
    return calculateDefaultTokenCost(modelId, promptTokens, completionTokens);
  }
}

/**
 * 使用默认价格计算token成本
 * 这是一个备用方法，当数据库中没有价格配置时使用
 */
function calculateDefaultTokenCost(
  modelId: string, 
  promptTokens: number, 
  completionTokens: number
): number {
  // 用户请求的默认定价：输入US$2.00 / 1M 令牌; 输出$8.00 / 1M 令牌
  const defaultInputPrice = 2.0 / 1000000; // $2.00 per 1M tokens
  const defaultOutputPrice = 8.0 / 1000000; // $8.00 per 1M tokens
  
  // 简化的默认定价表
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
    'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
    'claude-3-5-sonnet-20241022': { input: 0.003 / 1000, output: 0.015 / 1000 },
    'claude-3-5-haiku-20241022': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
    'claude-3-opus-20240229': { input: 0.015 / 1000, output: 0.075 / 1000 },
  }

  const modelPricing = pricing[modelId];
  if (!modelPricing) {
    // 对于未知模型，使用默认定价
    return promptTokens * defaultInputPrice + completionTokens * defaultOutputPrice;
  }

  return promptTokens * modelPricing.input + completionTokens * modelPricing.output;
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
