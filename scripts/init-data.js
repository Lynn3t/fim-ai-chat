const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initData() {
  try {
    // 检查是否已有提供商
    const existingProvider = await prisma.provider.findFirst();
    if (existingProvider) {
      console.log('基础数据已存在，跳过初始化');
      return;
    }

    // 创建基础提供商
    const openaiProvider = await prisma.provider.create({
      data: {
        name: 'openai',
        displayName: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        isEnabled: true,
        order: 1,
        description: 'OpenAI官方API',
      }
    });

    // 创建基础模型
    await prisma.model.create({
      data: {
        providerId: openaiProvider.id,
        modelId: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'OpenAI最新的小型模型',
        isEnabled: true,
        order: 1,
        maxTokens: 128000,
        temperature: 0.7,
      }
    });

    await prisma.model.create({
      data: {
        providerId: openaiProvider.id,
        modelId: 'gpt-4o',
        name: 'GPT-4o',
        description: 'OpenAI最新的大型模型',
        isEnabled: true,
        order: 2,
        maxTokens: 128000,
        temperature: 0.7,
      }
    });

    console.log('✅ 基础提供商和模型创建成功!');
    console.log('');
    console.log('📝 管理员注册说明:');
    console.log('1. 访问 /register 页面');
    console.log('2. 使用管理员邀请码: fimai_ADMIN_MASTER_KEY');
    console.log('3. 填写用户名、密码和邮箱（可选）');
    console.log('4. 完成注册后即可获得管理员权限');

  } catch (error) {
    console.error('初始化数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initData();
