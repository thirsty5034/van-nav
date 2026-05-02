import { fetchGetEnabledSearchEngines } from './api';

// 搜索引擎缓存
let searchEnginesCache: any[] = [];
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 获取启用的搜索引擎
const getEnabledSearchEngines = async () => {
  const now = Date.now();
  
  if (searchEnginesCache.length > 0 && now < cacheExpiry) {
    return searchEnginesCache;
  }
  
  try {
    searchEnginesCache = await fetchGetEnabledSearchEngines();
    cacheExpiry = now + CACHE_DURATION;
    return searchEnginesCache;
  } catch (error) {
    console.error('获取搜索引擎失败，使用默认配置:', error);
    
    const defaultEngines = [
      {
        id: 1,
        name: "百度",
        urlTemplate: "https://www.baidu.com/s?wd={query}",
        logo: "baidu.ico",
        sort: 1,
        enabled: true,
        description: "百度搜索"
      },
      {
        id: 2,
        name: "Bing",
        urlTemplate: "https://cn.bing.com/search?q={query}",
        logo: "bing.ico",
        sort: 2,
        enabled: true,
        description: "微软必应搜索"
      },
      {
        id: 3,
        name: "Google",
        urlTemplate: "https://www.google.com/search?q={query}",
        logo: "google.ico",
        sort: 3,
        enabled: true,
        description: "Google 搜索"
      }
    ];
    
    searchEnginesCache = defaultEngines;
    cacheExpiry = now + CACHE_DURATION;
    return defaultEngines;
  }
};

export const generateSearchEngineCard = async (searchString: string) => {
  if (!searchString.trim()) return [];
  
  try {
    const engines = await getEnabledSearchEngines();
    
    return engines
      .filter((engine: any) => engine.enabled)
      .sort((a: any, b: any) => a.sort - b.sort)
      .map((engine: any, index: number) => ({
        name: `使用 ${engine.name} 搜索`,
        url: generateSearchUrl(engine.urlTemplate, searchString),
        desc: `在 ${engine.name} 中搜索 「${searchString}」`,
        id: 8800880000 + engine.id,
        logo: engine.logo,
        hide: false
      }));
  } catch (error) {
    console.error('生成搜索引擎卡片失败:', error);
    return [];
  }
};

const generateSearchUrl = (urlTemplate: string, searchString: string) => {
  return urlTemplate.replace(/{query}/g, encodeURIComponent(searchString));
};

export const clearSearchEngineCache = () => {
  searchEnginesCache = [];
  cacheExpiry = 0;
};
