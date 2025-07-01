import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始数据库种子...')

  // 创建 OpenAI 提供商
  const openaiProvider = await prisma.provider.upsert({
    where: { name: 'openai' },
    update: {},
    create: {
      name: 'openai',
      displayName: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      isEnabled: true,
      order: 1,
      icon: 'openai',
      description: 'OpenAI GPT 模型',
    },
  })

  // 创建 Anthropic 提供商
  const anthropicProvider = await prisma.provider.upsert({
    where: { name: 'anthropic' },
    update: {},
    create: {
      name: 'anthropic',
      displayName: 'Anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      isEnabled: true,
      order: 2,
      icon: 'anthropic',
      description: 'Anthropic Claude 模型',
    },
  })

  // 创建 OpenAI 模型
  const openaiModels = [
    {
      modelId: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: '最新的 GPT-4o mini 模型，性价比高',
      group: 'GPT-4',
      order: 1,
      maxTokens: 128000,
      temperature: 0.7,
    },
    {
      modelId: 'gpt-4o',
      name: 'GPT-4o',
      description: '最新的 GPT-4o 模型，多模态能力强',
      group: 'GPT-4',
      order: 2,
      maxTokens: 128000,
      temperature: 0.7,
    },
    {
      modelId: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: 'GPT-4 Turbo 模型，速度更快',
      group: 'GPT-4',
      order: 3,
      maxTokens: 128000,
      temperature: 0.7,
    },
    {
      modelId: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'GPT-3.5 Turbo 模型，经济实用',
      group: 'GPT-3.5',
      order: 4,
      maxTokens: 16385,
      temperature: 0.7,
    },
  ]

  for (const model of openaiModels) {
    await prisma.model.upsert({
      where: {
        providerId_modelId: {
          providerId: openaiProvider.id,
          modelId: model.modelId,
        },
      },
      update: {},
      create: {
        ...model,
        providerId: openaiProvider.id,
      },
    })
  }

  // 创建 Anthropic 模型
  const anthropicModels = [
    {
      modelId: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Claude 3.5 Sonnet 模型，平衡性能和速度',
      group: 'Claude-3.5',
      order: 1,
      maxTokens: 200000,
      temperature: 0.7,
    },
    {
      modelId: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      description: 'Claude 3.5 Haiku 模型，快速响应',
      group: 'Claude-3.5',
      order: 2,
      maxTokens: 200000,
      temperature: 0.7,
    },
    {
      modelId: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      description: 'Claude 3 Opus 模型，最强性能',
      group: 'Claude-3',
      order: 3,
      maxTokens: 200000,
      temperature: 0.7,
    },
  ]

  for (const model of anthropicModels) {
    await prisma.model.upsert({
      where: {
        providerId_modelId: {
          providerId: anthropicProvider.id,
          modelId: model.modelId,
        },
      },
      update: {},
      create: {
        ...model,
        providerId: anthropicProvider.id,
      },
    })
  }

  // 创建示例普通用户
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      username: 'demo',
      avatar: null,
      role: 'USER',
    },
  })

  // 创建用户设置
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      theme: 'light',
      language: 'zh-CN',
      enableMarkdown: true,
      enableLatex: true,
      enableCodeHighlight: true,
      messagePageSize: 50,
    },
  })

  // 创建用户权限配置
  await prisma.userPermission.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      allowedModelIds: null, // null表示可以使用所有模型
      tokenLimit: null, // null表示无限制
      canShareAccess: true,
      isActive: true,
    },
  })

  console.log('✅ 数据库种子完成!')
  console.log(`📊 创建了 ${openaiModels.length + anthropicModels.length} 个模型`)
  console.log(`👤 创建了示例用户: ${user.email}`)
  console.log(`🔑 管理员邀请码: fimai_ADMIN_MASTER_KEY`)
  console.log(`💡 使用管理员邀请码注册第一个管理员账户`)
}

main()
  .catch((e) => {
    console.error('❌ 数据库种子失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
