export const isLogin = () => {
  return localStorage.getItem('_token') ? true : false
}

export const getLogoUrl = (url: string) => {
  // HTTP/dataURI/已经是/开头的直接返回
  // 其他（如 baidu.ico）加 / 前缀做根相对路径
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/')) {
    return url;
  }
  return '/' + url;
} 