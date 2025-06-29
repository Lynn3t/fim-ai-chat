import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          {/* 主标题 */}
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            FimAI Chat
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            基于 OpenAI API 的智能聊天助手，支持多种AI模型，提供流畅的对话体验
          </p>

          {/* 功能特点 */}
          <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                多模型支持
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                支持 GPT-3.5、GPT-4、GPT-4o 等多种AI模型
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                流式响应
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                实时显示AI回复，提供流畅的对话体验
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                隐私安全
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                配置信息本地存储，保护您的隐私安全
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/chat"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              开始聊天
            </Link>
            <Link
              href="/config"
              className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-lg"
            >
              配置设置
            </Link>
          </div>

          {/* 使用说明 */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              快速开始
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="flex items-center mb-3">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">
                    1
                  </span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    配置API
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  在配置页面输入您的 OpenAI API Key 和相关设置
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="flex items-center mb-3">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">
                    2
                  </span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    测试连接
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  使用测试功能确保API配置正确无误
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="flex items-center mb-3">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">
                    3
                  </span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    开始对话
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  进入聊天页面，享受与AI的智能对话
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
