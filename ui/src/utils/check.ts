export const isLogin = () => {
  return localStorage.getItem('_token') ? true : false
}

export const getLogoUrl = (url: string) => {
  // 空值直接返回
  if (!url) return url;
  // HTTP URL 走后端代理（解决 Referer 403 问题）
  if (url.startsWith('http')) {
    return `/api/img?url=${encodeURIComponent(url)}`;
  }
  // dataURI/已经是/开头的直接返回
  if (url.startsWith('data:') || url.startsWith('/')) {
    return url;
  }
  // 其他（如 baidu.ico）加 / 前缀做根相对路径
  return '/' + url;
} 