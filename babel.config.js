module.exports = {
  presets: [
    // 处理 ES6+ 语法
    ['@babel/preset-env', { targets: { node: 'current' } }],
    // 处理 React 语法
    '@babel/preset-react',
    // 处理 TypeScript 语法
    '@babel/preset-typescript',
  ],
};
