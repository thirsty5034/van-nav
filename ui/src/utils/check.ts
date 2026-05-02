export const isLogin = () => {
  return localStorage.getItem('_token') ? true : false
}

export const getLogoUrl = (url: string) => {
  // 直接返回原始URL，浏览器可以处理：
  // - 相对路径（如 baidu.ico）→ 从静态资源目录加载
  // - HTTP链接 → 直接从远程加载
  // 不再通过 /api/img 代理，避免搜索引擎图标找不到的问题
  return url;
} 