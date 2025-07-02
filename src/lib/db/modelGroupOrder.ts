import { prisma } from '@/lib/prisma'

export interface ModelGroupOrder {
  id: string
  userId: string
  groupName: string
  order: number
  createdAt: Date
  updatedAt: Date
}

// 临时内存存储，直到数据库迁移完成
const memoryStorage = new Map<string, ModelGroupOrder[]>();

/**
 * 获取用户的模型分组排序配置
 */
export async function getUserModelGroupOrders(userId: string): Promise<ModelGroupOrder[]> {
  try {
    // 使用内存存储作为临时解决方案
    const userOrders = memoryStorage.get(userId) || [];
    return userOrders.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error fetching user model group orders:', error)
    return []
  }
}

/**
 * 更新用户的模型分组排序
 */
export async function updateUserModelGroupOrders(
  userId: string,
  groupOrders: Array<{ groupName: string; order: number }>
): Promise<boolean> {
  try {
    // 使用内存存储作为临时解决方案
    const userOrders: ModelGroupOrder[] = groupOrders.map(({ groupName, order }) => ({
      id: `${userId}-${groupName}`,
      userId,
      groupName,
      order,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    memoryStorage.set(userId, userOrders);
    console.log('Updated group orders in memory for user:', userId, userOrders);
    return true;
  } catch (error) {
    console.error('Error updating user model group orders:', error)
    return false
  }
}

/**
 * 设置单个分组的排序
 */
export async function setGroupOrder(
  userId: string,
  groupName: string,
  order: number
): Promise<boolean> {
  try {
    const userOrders = memoryStorage.get(userId) || [];
    const existingIndex = userOrders.findIndex(o => o.groupName === groupName);

    if (existingIndex >= 0) {
      userOrders[existingIndex].order = order;
      userOrders[existingIndex].updatedAt = new Date();
    } else {
      userOrders.push({
        id: `${userId}-${groupName}`,
        userId,
        groupName,
        order,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    memoryStorage.set(userId, userOrders);
    return true;
  } catch (error) {
    console.error('Error setting group order:', error)
    return false
  }
}

/**
 * 获取分组的排序值，如果不存在则返回默认值
 */
export async function getGroupOrder(
  userId: string,
  groupName: string,
  defaultOrder: number = 999
): Promise<number> {
  try {
    const userOrders = memoryStorage.get(userId) || [];
    const groupOrder = userOrders.find(o => o.groupName === groupName);
    return groupOrder?.order ?? defaultOrder;
  } catch (error) {
    console.error('Error getting group order:', error)
    return defaultOrder
  }
}

/**
 * 删除用户的所有分组排序配置
 */
export async function deleteUserModelGroupOrders(userId: string): Promise<boolean> {
  try {
    memoryStorage.delete(userId);
    return true;
  } catch (error) {
    console.error('Error deleting user model group orders:', error)
    return false
  }
}

/**
 * 初始化用户的默认分组排序
 */
export async function initializeDefaultGroupOrders(userId: string): Promise<boolean> {
  try {
    // 检查用户是否已有分组排序配置
    const existingOrders = memoryStorage.get(userId);

    if (existingOrders && existingOrders.length > 0) {
      return true // 已有配置，不需要初始化
    }

    // 默认分组排序（与 getCategorySortOrder 保持一致）
    // 按照用户要求的顺序：OpenAI, ChatGPT, Anthropic, DeepSeek, Gemini, Grok, Qwen, GLM, LLAMA 剩下的字母排序，最后Other
    const defaultGroups = [
      'OpenAI', 'ChatGPT', 'Anthropic', 'DeepSeek', 'Gemini', 'Grok', 'Qwen', 'GLM', 'Llama',
      'Baichuan', 'Claude', 'Cohere', 'ComfyUI', 'DALL-E', 'DouBao', 'Flux',
      'Gemma', 'HaiLuo', 'HunYuan', 'MiniMax', 'Mistral', 'MoonShot', 'Ollama',
      'Perplexity', 'SenseNova', 'SiliconCloud', 'Spark', 'Stability', 'StepFun',
      'VertexAI', 'VolcEngine', 'WenXin', 'Yi', 'Other'
    ]

    const groupOrders = defaultGroups.map((groupName, index) => ({
      groupName,
      order: index
    }));

    return await updateUserModelGroupOrders(userId, groupOrders);
  } catch (error) {
    console.error('Error initializing default group orders:', error)
    return false
  }
}
