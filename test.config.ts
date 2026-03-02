module.exports = {
  // 1. 指定测试环境
  testEnvironment: 'jsdom',
  // 2. 测试文件查找路径（根据你的实际目录调整）
  roots: ['<rootDir>/src/tests'],
  // 3. 测试文件匹配规则
  testMatch: ['<rootDir>/src/tests/**/*.test.(ts|tsx)'],
  // 4. 全局测试配置
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.tsx'],
  // 5. 路径映射（保证 @/ 指向 src）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(less|css)$': 'identity-obj-proxy',
  },
  // 6. 关键：配置 TS 解析器
  preset: 'ts-jest', // 使用 ts-jest 预设
  transform: {
    // 用 ts-jest 处理 TS/TSX 文件
    '^.+\\.(ts|tsx)$': 'ts-jest',
    // 用 babel-jest 处理 JS/JSX 文件（可选）
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  // 7. 模块文件扩展名（优先解析 TS/TSX）
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // 8. 忽略 node_modules 解析（可选）
  transformIgnorePatterns: ['/node_modules/(?!(@ant-design|rc-.*))'],
};
