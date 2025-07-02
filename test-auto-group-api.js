// 测试自动分组API的脚本
const BASE_URL = 'http://localhost:3001';

// 模拟管理员用户ID（需要根据实际数据库中的用户ID调整）
const ADMIN_USER_ID = 'admin-user-id';

async function testAutoGroupAPI() {
  console.log('🧪 开始测试自动分组API...\n');

  try {
    // 1. 测试获取所有模型
    console.log('1. 获取所有模型...');
    const modelsResponse = await fetch(`${BASE_URL}/api/admin/models?adminUserId=${ADMIN_USER_ID}`);
    
    if (!modelsResponse.ok) {
      console.error('❌ 获取模型失败:', await modelsResponse.text());
      return;
    }
    
    const models = await modelsResponse.json();
    console.log(`✅ 成功获取 ${models.length} 个模型`);
    
    if (models.length === 0) {
      console.log('⚠️ 没有模型可以测试，请先添加一些模型');
      return;
    }

    // 2. 测试按提供商自动分组
    const firstProvider = models[0]?.provider;
    if (firstProvider) {
      console.log(`\n2. 测试为提供商 "${firstProvider.displayName}" 自动分组...`);
      
      const autoGroupResponse = await fetch(`${BASE_URL}/api/admin/models/auto-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: ADMIN_USER_ID,
          providerId: firstProvider.id,
        }),
      });

      if (autoGroupResponse.ok) {
        const result = await autoGroupResponse.json();
        console.log('✅ 自动分组成功:', result.message);
      } else {
        const error = await autoGroupResponse.json();
        console.error('❌ 自动分组失败:', error.error);
      }
    }

    // 3. 测试自定义分组
    const testModelIds = models.slice(0, 2).map(m => m.id);
    if (testModelIds.length > 0) {
      console.log(`\n3. 测试为 ${testModelIds.length} 个模型设置自定义分组...`);
      
      const customGroupResponse = await fetch(`${BASE_URL}/api/admin/models/auto-group`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: ADMIN_USER_ID,
          modelIds: testModelIds,
          groupName: '测试分组',
        }),
      });

      if (customGroupResponse.ok) {
        const result = await customGroupResponse.json();
        console.log('✅ 自定义分组成功:', result.message);
      } else {
        const error = await customGroupResponse.json();
        console.error('❌ 自定义分组失败:', error.error);
      }
    }

    // 4. 测试清除分组
    if (testModelIds.length > 0) {
      console.log(`\n4. 测试清除 ${testModelIds.length} 个模型的分组...`);
      
      const clearGroupResponse = await fetch(`${BASE_URL}/api/admin/models/auto-group`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: ADMIN_USER_ID,
          modelIds: testModelIds,
        }),
      });

      if (clearGroupResponse.ok) {
        const result = await clearGroupResponse.json();
        console.log('✅ 清除分组成功:', result.message);
      } else {
        const error = await clearGroupResponse.json();
        console.error('❌ 清除分组失败:', error.error);
      }
    }

    console.log('\n🎉 API测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testAutoGroupAPI();
