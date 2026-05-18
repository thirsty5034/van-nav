type JumpTarget = 'blank' | 'self';

const USER_JUMP_TARGET_KEY = 'userJumpTarget';  // 用户手动设置的跳转方式
const SERVER_DEFAULT_KEY = 'serverJumpTargetDefault';  // 服务器默认值缓存

// 将后端返回的值（布尔值或字符串 "true"/"false"）转换为布尔值
const parseJumpTargetBlank = (value: any): boolean => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return true;  // 默认值
};

// 获取用户手动设置的跳转方式
const getUserJumpTarget = (): JumpTarget | null => {
  const stored = window.localStorage.getItem(USER_JUMP_TARGET_KEY) as JumpTarget;
  return stored || null;
};

// 获取缓存的服务器默认值
const getCachedServerDefault = (): JumpTarget | null => {
  const stored = window.localStorage.getItem(SERVER_DEFAULT_KEY) as JumpTarget;
  return stored || null;
};

// 从服务器设置获取默认跳转方式
const getServerDefaultJumpTarget = (jumpTargetBlank: any): JumpTarget => {
  const boolValue = parseJumpTargetBlank(jumpTargetBlank);
  return boolValue === false ? 'self' : 'blank';
};

// 同步服务器默认值到 localStorage
// 如果缓存的服务器默认值与实际不同，说明后台修改了，需要更新
export const syncJumpTargetFromServer = (jumpTargetBlank: any): void => {
  const currentServerDefault = getServerDefaultJumpTarget(jumpTargetBlank);
  const cachedDefault = getCachedServerDefault();
  
  // 有缓存且值变了：如果用户设置等于旧的默认值（冗余），清除
  if (cachedDefault && cachedDefault !== currentServerDefault) {
    const userTarget = getUserJumpTarget();
    if (userTarget === cachedDefault) {
      window.localStorage.removeItem(USER_JUMP_TARGET_KEY);
    }
  }
  
  // 更新缓存的服务器默认值
  window.localStorage.setItem(SERVER_DEFAULT_KEY, currentServerDefault);
};

// 获取有效的跳转方式
export const getJumpTarget = (jumpTargetBlank: any): JumpTarget => {
  // 首先同步服务器默认值（检查是否有变化）
  syncJumpTargetFromServer(jumpTargetBlank);
  
  // 优先返回用户手动设置
  const userTarget = getUserJumpTarget();
  if (userTarget) {
    return userTarget;
  }
  
  // 没有用户设置，返回服务器默认值
  return getServerDefaultJumpTarget(jumpTargetBlank);
};

// 用户手动设置跳转方式
const setUserJumpTarget = (target: JumpTarget) => {
  window.localStorage.setItem(USER_JUMP_TARGET_KEY, target);
};

// 用户手动切换跳转方式（只保存到 localStorage，服务器默认值由管理员在后台设置）
export const toggleJumpTarget = (jumpTargetBlank: any) => {
  const current = getJumpTarget(jumpTargetBlank);
  const newTarget = current === 'blank' ? 'self' : 'blank';
  setUserJumpTarget(newTarget);
};
