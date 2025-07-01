import { prisma } from '@/lib/prisma'
import type { Provider, Model } from '@prisma/client'

export interface CreateProviderData {
  name: string
  displayName: string
  baseUrl?: string
  apiKey?: string
  isEnabled?: boolean
  order?: number
  icon?: string
  description?: string
}

export interface UpdateProviderData {
  displayName?: string
  baseUrl?: string
  apiKey?: string
  isEnabled?: boolean
  order?: number
  icon?: string
  description?: string
}

export interface CreateModelData {
  providerId: string
  modelId: string
  name: string
  description?: string
  isEnabled?: boolean
  order?: number
  group?: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export interface UpdateModelData {
  name?: string
  description?: string
  isEnabled?: boolean
  order?: number
  group?: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

/**
 * 创建 AI 服务提供商
 */
export async function createProvider(data: CreateProviderData): Promise<Provider> {
  return prisma.provider.create({
    data,
  })
}

/**
 * 获取所有提供商
 */
export async function getProviders(includeModels = false): Promise<Provider[]> {
  return prisma.provider.findMany({
    where: { isEnabled: true },
    include: {
      models: includeModels ? {
        where: { isEnabled: true },
        orderBy: { order: 'asc' },
      } : false,
    },
    orderBy: { order: 'asc' },
  })
}

/**
 * 根据 ID 获取提供商
 */
export async function getProviderById(id: string): Promise<Provider | null> {
  return prisma.provider.findUnique({
    where: { id },
    include: {
      models: {
        where: { isEnabled: true },
        orderBy: { order: 'asc' },
      },
    },
  })
}

/**
 * 更新提供商
 */
export async function updateProvider(id: string, data: UpdateProviderData): Promise<Provider> {
  return prisma.provider.update({
    where: { id },
    data,
  })
}

/**
 * 删除提供商
 */
export async function deleteProvider(id: string): Promise<Provider> {
  return prisma.provider.delete({
    where: { id },
  })
}

/**
 * 创建 AI 模型
 */
export async function createModel(data: CreateModelData): Promise<Model> {
  return prisma.model.create({
    data,
  })
}

/**
 * 获取所有模型
 */
export async function getModels(providerId?: string): Promise<Model[]> {
  return prisma.model.findMany({
    where: {
      isEnabled: true,
      ...(providerId && { providerId }),
    },
    include: {
      provider: true,
    },
    orderBy: [
      { provider: { order: 'asc' } },
      { order: 'asc' },
    ],
  })
}

/**
 * 根据 ID 获取模型
 */
export async function getModelById(id: string): Promise<Model | null> {
  return prisma.model.findUnique({
    where: { id },
    include: {
      provider: true,
    },
  })
}

/**
 * 更新模型
 */
export async function updateModel(id: string, data: UpdateModelData): Promise<Model> {
  return prisma.model.update({
    where: { id },
    data,
  })
}

/**
 * 删除模型
 */
export async function deleteModel(id: string): Promise<Model> {
  return prisma.model.delete({
    where: { id },
  })
}

/**
 * 批量更新模型排序
 */
export async function updateModelsOrder(updates: { id: string; order: number }[]): Promise<void> {
  await prisma.$transaction(
    updates.map(({ id, order }) =>
      prisma.model.update({
        where: { id },
        data: { order },
      })
    )
  )
}

/**
 * 批量更新提供商排序
 */
export async function updateProvidersOrder(updates: { id: string; order: number }[]): Promise<void> {
  await prisma.$transaction(
    updates.map(({ id, order }) =>
      prisma.provider.update({
        where: { id },
        data: { order },
      })
    )
  )
}
