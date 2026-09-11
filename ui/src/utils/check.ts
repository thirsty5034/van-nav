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

export const DEFAULT_LOGO_SRC = "/logo-fallback.png";
export const LOGO_MAX_BYTES = 200 * 1024;
const LOGO_FILE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"]);

export const handleLogoImgError = (e: { currentTarget: HTMLImageElement }) => {
  const el = e.currentTarget;
  if (el.dataset.fallback === "1") return;
  el.dataset.fallback = "1";
  el.src = DEFAULT_LOGO_SRC;
};

export const fileToLogoDataURI = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > LOGO_MAX_BYTES) {
      reject(new Error("too-large"));
      return;
    }
    if (file.type && !LOGO_FILE_MIME.has(file.type) && file.type !== "image/jpg") {
      reject(new Error("bad-type"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result.startsWith("data:image/")) {
        reject(new Error("bad-type"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}; 