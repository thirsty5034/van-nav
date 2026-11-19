import "./index.css";
import CardV2 from "../CardV2";
import SearchBar from "../SearchBar";
import { Loading } from "../Loading";
import { Helmet } from "react-helmet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FetchList } from "../../utils/api";
import TagSelector from "../TagSelector";
import GithubLink from "../GithubLink";
import AdminLink from "../AdminLink";
import DarkSwitch from "../DarkSwitch";
import { getLogoUrl } from "../../utils/check";
import { generateSearchEngineCard } from "../../utils/serachEngine";
import { toggleJumpTarget, syncJumpTargetFromServer } from "../../utils/setting";
import { useTranslation } from "../../i18n";
import { batchGetTotalScores } from "../../utils/clickTracker";
import { buildSearchOrderedList } from "../../utils/searchOrder";
import { getCurrentThemeConfig } from "../../utils/theme";

// 订阅主题配置（参考 useAntdTheme）：配置加载完成/主题切换/跨标签页时刷新，
// 让首页与主题预览读到同一份配置（search/tag/cardExtra 新字段）
const useThemeConfig = () => {
  const [config, setConfig] = useState(getCurrentThemeConfig());
  useEffect(() => {
    const refresh = () => setConfig(getCurrentThemeConfig());
    window.addEventListener("theme-change", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("theme-config-loaded", refresh);
    return () => {
      window.removeEventListener("theme-change", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("theme-config-loaded", refresh);
    };
  }, []);
  return config;
};

// 系统内置工具名称翻译映射（仅限前端硬编码的系统工具，不翻译用户数据）
const systemToolTranslations: Record<string, Record<string, string>> = {
  'zh-CN': {
    '原地跳转': '原地跳转',
    '新建窗口': '新建窗口',
    '本站管理后台': '本站管理后台',
    '管理后台': '管理后台',
    '偏好设置': '偏好设置',
    '点击切换跳转方式': '点击切换跳转方式',
    '本导航站的管理后台哦': '本导航站的管理后台哦',
  },
  'en-US': {
    '原地跳转': 'Same Tab',
    '新建窗口': 'New Tab',
    '本站管理后台': 'Admin Panel',
    '管理后台': 'Admin',
    '偏好设置': 'Settings',
    '点击切换跳转方式': 'Click to toggle jump target',
    '本导航站的管理后台哦': 'Admin panel for this navigation site',
  },
};

const Content = (props: any) => {
  const { t, language } = useTranslation();

  // 翻译系统工具名称
  const translateSystemTool = (name: string) => {
    const map = systemToolTranslations[language] || systemToolTranslations['zh-CN'];
    return map[name] || name;
  };
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [currTag, setCurrTag] = useState('全部工具');
  const [searchString, setSearchString] = useState("");
  const [val, setVal] = useState("");
  const [searchEngineCards, setSearchEngineCards] = useState<any[]>([]);
  const [isDesktop, setIsDesktop] = useState(true);

  const filteredDataRef = useRef<any>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 供 keydown / composition 同步读取，避免闭包陈旧与 150ms 防抖竞态
  const valRef = useRef<string>("");
  const dataRef = useRef<any>({});
  const searchEngineCardsRef = useRef<any[]>([]);
  const composingRef = useRef<boolean>(false);
  // 搜索防抖：兼顾连续键入合并与汉字上屏体感（原 300ms 过长）
  const SEARCH_DEBOUNCE_MS = 150;
  // 步进批次；首屏数量由视口估算，避免「装不满却不滚动」导致永远不触发 load-more
  const VISIBLE_BATCH = 30;
  const [visibleCount, setVisibleCount] = useState(VISIBLE_BATCH);
  const fillRafRef = useRef<number | null>(null);
  const logoPreheatDoneRef = useRef<string | null>(null);

  // 按视口/列数估算首屏至少应渲染多少张，保证内容可滚动或一次铺满
  const estimateInitialVisible = useCallback((total: number, compact: boolean, pcCols?: number) => {
    if (total <= 0) return 0;
    if (typeof window === 'undefined') return Math.min(total, VISIBLE_BATCH);
    const w = window.innerWidth || 1060;
    const h = window.innerHeight || 800;
    let cols = 3;
    if (w < 500) {
      cols = compact ? 2 : 3;
    } else if (w < 700) {
      cols = 3;
    } else if (w < 1060) {
      cols = compact ? 4 : 3;
    } else {
      cols = (pcCols && pcCols > 0) ? pcCols : (compact ? 6 : 3);
    }
    // 普通模式行高约 90px，精简模式约 52px；多铺 1 行确保可滚动
    const rowH = compact ? 52 : 90;
    const rows = Math.ceil(h / rowH) + 1;
    return Math.min(total, Math.max(VISIBLE_BATCH, cols * rows));
  }, []);

  // 监听窗口大小变化
  // P3: 使用 matchMedia 替代 resize 事件，零 Forcing
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1060px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const showGithub = useMemo(() => {
    const hide = data?.setting?.hideGithub === true
    return !hide;
  }, [data])

  // ===== 主题新配置：搜索框/标签栏位置与卡片展示开关（空值=回退现默认） =====
  const themeConfig = useThemeConfig();
  const searchCfg = themeConfig?.search;
  const tagCfg = themeConfig?.tag;
  const cardCfg = themeConfig?.cardExtra;
  const footerCfg = themeConfig?.footer;
  // 页脚文案：主题配置的 footer.text 优先，空则回退站点设置的备案文案
  const footerText = footerCfg?.text || data?.setting?.govRecord || '';

  const searchHidden = searchCfg?.hidden === true;
  const tagHidden = tagCfg?.hidden === true;
  // 搜索框摆放：顶部（现状）/底部（渲染顺序调整，放到卡片列表之后）
  const searchAtBottom = !searchHidden && searchCfg?.vertical === 'bottom';
  // 分类标签栏：顶部（现状）/底部（渲染顺序）/左侧/右侧贴屏（fixed 侧边竖排）
  const tagPosition = tagCfg?.position;
  const tagAtBottom = !tagHidden && tagPosition === 'bottom';
  const tagSide = !tagHidden && (tagPosition === 'left' || tagPosition === 'right') ? tagPosition : null;
  // 卡片透明无框：底色透明度为 0 时去掉底色/边框/阴影（ghost 类）
  const cardGhost = parseFloat(cardCfg?.bgOpacity ?? '') === 0;

  const searchTop = !searchHidden && !searchAtBottom;
  const tagTop = !tagHidden && !tagAtBottom && !tagSide;
  // 搜索框插槽：水平位置（左/中/右）+ 透明无框类；宽度由 --van-nav-search-width 控制
  const searchSlotClass = `search-slot${searchCfg?.position ? ` search-pos-${searchCfg.position}` : ''}${searchCfg?.transparent ? ' search-transparent' : ''}`;
  const tagTransparentClass = tagCfg?.transparent ? ' tag-transparent' : '';

  const showAdmin = useMemo(() => {
    const hide = data?.setting?.hideAdmin === true;
    return !hide;
  }, [data])

  // 动态计算 PC 端网格列数
  // 保持卡片大小不变，通过扩大容器 max-width 来容纳更多列
  // 原版基准: repeat(3, minmax(299.67px, 350px)), gap=20px
  const gridStyle = useMemo(() => {
    const pcCols = data?.setting?.pcColumnCount;
    if (isDesktop && pcCols && pcCols > 0 && pcCols !== 3) {
      const gap = 20;
      // 容器最大宽度 = N * 350 + (N-1) * 20
      const containerMax = pcCols * 350 + (pcCols - 1) * gap;
      return {
        gridTemplateColumns: `repeat(${pcCols}, minmax(299.67px, 350px))`,
        maxWidth: `${containerMax}px`,
        margin: '0 auto',
        justifyContent: 'center',
      } as React.CSSProperties;
    }
    return {};
  }, [isDesktop, data?.setting?.pcColumnCount]);
  
  const applyListData = useCallback((r: any) => {
    setData(r);
    // 同步服务器跳转设置到 localStorage（仅当用户未手动设置时）
    syncJumpTargetFromServer(r?.setting?.jumpTargetBlank);
    const tagInLocalStorage = window.localStorage.getItem("tag");
    if (tagInLocalStorage && tagInLocalStorage !== "") {
      if (r?.catelogs && r?.catelogs.includes(tagInLocalStorage)) {
        setCurrTag(tagInLocalStorage);
      }
    }
  }, []);

  // 在线成功后静默预热 logo，写入 SW van-nav-img 缓存，供离线命中
  const preheatLogos = useCallback((tools: any[] | undefined) => {
    if (!tools || !tools.length || typeof window === 'undefined') return;
    // 用工具数量+首个 id 做简易签名，避免重复全量预热
    const sig = `${tools.length}:${tools[0]?.id ?? ''}:${tools[tools.length - 1]?.id ?? ''}`;
    if (logoPreheatDoneRef.current === sig) return;
    logoPreheatDoneRef.current = sig;
    // 限制并发，不阻塞主线程
    const urls = tools
      .map((item) => item?.logo)
      .filter((logo: string) => logo && typeof logo === 'string' && logo.startsWith('http'))
      .slice(0, 200)
      .map((logo: string) => getLogoUrl(logo));
    let i = 0;
    const pump = () => {
      const batch = urls.slice(i, i + 6);
      i += 6;
      batch.forEach((src) => {
        try {
          const img = new Image();
          img.decoding = 'async';
          img.src = src;
        } catch (_) { /* ignore */ }
      });
      if (i < urls.length) {
        window.setTimeout(pump, 50);
      }
    };
    // 等一帧再开始，优先让卡片渲染
    requestAnimationFrame(() => setTimeout(pump, 0));
  }, []);

  const loadData = useCallback(async () => {
    // 1) 先读本地缓存，有则立刻出首屏（SWR：stale-while-revalidate）
    let hadCache = false;
    try {
      const cached = window.localStorage.getItem("van-nav-cache");
      if (cached) {
        const r = JSON.parse(cached);
        if (r && typeof r === 'object') {
          applyListData(r);
          hadCache = true;
          setLoading(false);
        }
      }
    } catch (cacheErr) {
      console.log(t('home.cache.failed'), cacheErr);
    }

    if (!hadCache) {
      setLoading(true);
    }

    // 2) 并行拉网；4s 超时后走 catch
    try {
      const r = await FetchList();
      applyListData(r);
      try {
        window.localStorage.setItem("van-nav-cache", JSON.stringify(r));
      } catch (e) {
        // localStorage 满或不可用时忽略
      }
      // 在线成功后预热 logo 进 SW 缓存
      preheatLogos(r?.tools);
    } catch (e) {
      console.log(t('home.cache.networkError'), e);
      if (!hadCache) {
        // 无缓存时再尝试一次读（防御性）
        try {
          const cached = window.localStorage.getItem("van-nav-cache");
          if (cached) {
            applyListData(JSON.parse(cached));
            console.log(t('home.cache.restored'));
          }
        } catch (cacheErr) {
          console.log(t('home.cache.failed'), cacheErr);
        }
      } else {
        // 已有缓存展示，网络失败静默保留
        console.log(t('home.cache.restored'));
      }
    } finally {
      setLoading(false);
    }
    // t 仅用于日志文案；不列入依赖，避免 i18n 引用抖动导致重复拉网
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyListData, preheatLogos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 网络恢复时静默刷新一次
  useEffect(() => {
    const onOnline = () => {
      loadData();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [loadData]);

  // 异步加载搜索引擎卡片
  useEffect(() => {
    const loadSearchEngineCards = async () => {
      // 如果管理员关闭了搜索引擎显示，清空搜索引擎卡片
      if (data?.setting?.showSearchEngine === false) {
        setSearchEngineCards([]);
        return;
      }
      try {
        const cards = await generateSearchEngineCard(searchString);
        setSearchEngineCards(cards);
      } catch (error) {
        console.error('加载搜索引擎卡片失败:', error);
        setSearchEngineCards([]);
      }
    };

    loadSearchEngineCards();
  }, [searchString, data?.setting?.showSearchEngine]);

  const handleSetCurrTag = (tag: string) => {
    setCurrTag(tag);
    // 管理后台不记录了
    if (tag !== '管理后台') {
      window.localStorage.setItem("tag", tag);
    }
    resetSearch(true);
  };

  const resetSearch = (notSetTag?: boolean) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    valRef.current = "";
    setVal("");
    setSearchString("");
    const tagInLocalStorage = window.localStorage.getItem("tag");
    if (!notSetTag && tagInLocalStorage && tagInLocalStorage !== "" && tagInLocalStorage !== '管理后台') {
      setCurrTag(tagInLocalStorage);
    }
  };

  // 镜像关键态到 ref，供 Enter / composition 同步读取
  useEffect(() => {
    valRef.current = val;
  }, [val]);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    searchEngineCardsRef.current = searchEngineCards;
  }, [searchEngineCards]);

  // 立即把输入框当前值冲刷进搜索态（取消待定防抖）
  const flushSearch = useCallback((raw?: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const text = (raw !== undefined ? raw : valRef.current);
    valRef.current = text;
    setVal(text);
    const q = text.trim();
    if (q !== "") {
      setSearchString(q);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    } else {
      setSearchString("");
    }
    return q;
  }, []);

  // 与 filteredData 搜索分支同构（共用 buildSearchOrderedList）：取首条可打开结果
  // 注意：搜索引擎卡片依赖异步 generateSearchEngineCard，Enter 瞬时可能尚未就绪；
  // 工具无命中时仅回退 filteredDataRef 中的引擎卡（id 段 8800880000+），
  // 并把 query 参数重写为当前词；不再兜底任意 cards[0]，
  // 杜绝把「上一轮搜索/非搜索态」的无关工具当作回车目标。
  const pickFirstMatchUrl = useCallback((q: string): string | null => {
    if (!q) return null;
    const tools: any[] = dataRef.current?.tools || [];
    const sortByClicks = dataRef.current?.siteConfig?.sortByClicks;
    const ordered = buildSearchOrderedList(tools, q, sortByClicks);
    if (ordered[0]?.url) return ordered[0].url;

    // 工具无命中：仅回退引擎卡，query 重写为当前 q
    const cards = filteredDataRef.current || [];
    for (const c of cards) {
      if (c?.url && typeof c.id === 'number' && c.id >= 8800880000) {
        try {
          const u = new URL(c.url);
          if (u.searchParams.has('wd')) u.searchParams.set('wd', q);
          else if (u.searchParams.has('q')) u.searchParams.set('q', q);
          else if (u.searchParams.has('query')) u.searchParams.set('query', q);
          return u.toString();
        } catch {
          return c.url;
        }
      }
    }
    return null;
  }, []);

  // P1: 防抖搜索 — 150ms；输入框即时响应；IME 上屏/Enter 走 flush 旁路
  const handleSetSearchText = useCallback((text: string) => {
    valRef.current = text;
    setVal(text);
    // 组字过程中只更新输入框，不驱动搜索（避免拼音中间态污染结果）
    if (composingRef.current) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (text.trim() !== "") {
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        // 以 ref 最新值为准，防止 timer 闭包拿到过期 text
        const q = valRef.current.trim();
        setSearchString(q);
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      }, SEARCH_DEBOUNCE_MS);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        resetSearch();
      }, SEARCH_DEBOUNCE_MS);
    }
  }, []);

  const handleCompositionStart = useCallback(() => {
    composingRef.current = true;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const handleCompositionEnd = useCallback((value: string) => {
    composingRef.current = false;
    // 汉字上屏：以 DOM 实值为准立刻 flush，消灭「确认后还要等防抖」
    flushSearch(value);
  }, [flushSearch]);

  // 组件卸载时清除防抖计时器，严防内存泄漏
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const filteredData = useMemo(() => {
    if (!data.tools) return [...searchEngineCards];

    // 1. 分类过滤（搜索时跳过分类，搜索全部工具）
    const categoryFiltered = searchString !== ''
      ? data.tools
      : data.tools.filter((item: any) => currTag === '全部工具' || item.catelog === currTag);

    const sortByClicks = data?.siteConfig?.sortByClicks;

    // 2. 搜索状态：统一排序 owner（与 Enter / Ctrl+N 打开选择共用同一规则，
    //    保证「回车打开的」就是「页面显示的第一张」）
    if (searchString !== '') {
      const orderedTools = buildSearchOrderedList(categoryFiltered, searchString, sortByClicks);
      return [...orderedTools, ...searchEngineCards];
    }

    // 3. 非搜索 + 全部工具 + 智能排序开启 → 按综合得分
    if (currTag === '全部工具' && sortByClicks) {
      // P2: 批量计算一次，sort 中零 localStorage 开销
      const scoreMap = batchGetTotalScores(categoryFiltered);
      const sorted = [...categoryFiltered].sort((a: any, b: any) =>
        (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0)
      );
      return [...sorted, ...searchEngineCards];
    }

    // 4. 其他 → 保持后端原始排序
    return [...categoryFiltered, ...searchEngineCards];
  }, [data, currTag, searchString, searchEngineCards]);

  useEffect(() => {
    filteredDataRef.current = filteredData
  }, [filteredData])

  // 有输入框内容或已生效搜索词时都监听：避免「汉字已上屏但 searchString 仍空」时 Enter 无响应
  useEffect(() => {
    const hasInput = val.trim() !== "" || searchString.trim() !== "";
    if (!hasInput) {
      document.removeEventListener("keydown", onKeyEnter);
    } else {
      document.addEventListener("keydown", onKeyEnter);
    }
    return () => {
      document.removeEventListener("keydown", onKeyEnter);
    }
    // eslint-disable-next-line
  }, [searchString, val])

  const renderCardsV2 = useCallback(() => {
    // P4: 懒加载 — 只渲染 visibleCount 个卡片
    const visibleItems = filteredData.slice(0, visibleCount);
    return visibleItems.map((item: any, index: number) => {
      return (
        <CardV2
          id={item.id}
          title={translateSystemTool(item.name)}
          url={item.url}
          des={translateSystemTool(item.desc)}
          logo={item.logo}
          key={item.id}
          catelog={translateSystemTool(item.catelog)}
          index={index}
          isSearching={searchString.trim() !== ""}
          noImageMode={data?.siteConfig?.noImageMode || false}
          compactMode={data?.siteConfig?.compactMode || false}
          jumpTargetBlank={data?.setting?.jumpTargetBlank}
          showLogo={cardCfg?.showLogo}
          showTitle={cardCfg?.showTitle}
          showDesc={cardCfg?.showDesc}
          showTag={cardCfg?.showTag}
          ghost={cardGhost}
          onClick={() => {
            resetSearch();
            if (item.url === "toggleJumpTarget") {
              toggleJumpTarget(data?.setting?.jumpTargetBlank);
              loadData();
            }
          }}
        />
      );
    });
    // eslint-disable-next-line
  // eslint-disable-next-line
  }, [filteredData, visibleCount, searchString, data?.siteConfig?.noImageMode, data?.siteConfig?.compactMode, cardCfg?.showLogo, cardCfg?.showTitle, cardCfg?.showDesc, cardCfg?.showTag, cardGhost]);

  // 标签/搜索变化：按视口重置首屏可见数
  useEffect(() => {
    const compact = !!data?.siteConfig?.compactMode;
    const total = filteredData.length;
    setVisibleCount(estimateInitialVisible(total, compact, data?.setting?.pcColumnCount));
  }, [currTag, searchString, filteredData.length, data?.siteConfig?.compactMode, data?.setting?.pcColumnCount, estimateInitialVisible]);

  // 若内容高度仍 ≤ 视口（装不满无法滚动），自动追加批次直到可滚动或全量
  useEffect(() => {
    if (fillRafRef.current != null) {
      cancelAnimationFrame(fillRafRef.current);
      fillRafRef.current = null;
    }
    const tick = () => {
      fillRafRef.current = null;
      if (typeof window === 'undefined') return;
      if (visibleCount >= filteredData.length) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      // 内容几乎撑不满视口 → 继续补一批
      if (scrollHeight <= clientHeight + 50) {
        setVisibleCount((prev) => Math.min(prev + VISIBLE_BATCH, filteredData.length));
      }
    };
    fillRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (fillRafRef.current != null) {
        cancelAnimationFrame(fillRafRef.current);
        fillRafRef.current = null;
      }
    };
  }, [visibleCount, filteredData.length, data?.siteConfig?.compactMode, data?.setting?.pcColumnCount]);

  // 窗口尺寸变化时重新估算首屏（防抖）
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const compact = !!data?.siteConfig?.compactMode;
        setVisibleCount((prev) => {
          const next = estimateInitialVisible(filteredData.length, compact, data?.setting?.pcColumnCount);
          return Math.max(prev, next);
        });
      }, 150);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      if (timer) clearTimeout(timer);
    };
  }, [filteredData.length, data?.siteConfig?.compactMode, data?.setting?.pcColumnCount, estimateInitialVisible]);

  // 滚动触底自动加载更多卡片（passive 事件，零性能影响）
  useEffect(() => {
    let isThrottled = false;
    const handleScroll = () => {
      if (isThrottled) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        isThrottled = true;
        setVisibleCount((prev) => Math.min(prev + VISIBLE_BATCH, filteredData.length));
        setTimeout(() => { isThrottled = false; }, 200);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredData.length]);

  const onKeyEnter = (ev: KeyboardEvent) => {
    // IME 组字中 / 处理中：把按键交给输入法，绝不抢开链接
    // keyCode 229 = IME Process；isComposing 为现代标准
    if (
      composingRef.current ||
      (ev as any).isComposing ||
      ev.keyCode === 229 ||
      ev.key === 'Process'
    ) {
      return;
    }

    // Enter：以输入框当前值同步 flush 后打开首条，消灭 150ms 防抖竞态
    if (ev.key === 'Enter' || ev.keyCode === 13) {
      const q = flushSearch(valRef.current);
      if (!q) return;
      const url = pickFirstMatchUrl(q);
      if (url) {
        // 阻止 input type=search 的隐式 submit / 浏览器默认行为
        ev.preventDefault();
        window.open(url, "_blank");
        resetSearch();
      }
      return;
    }

    // Ctrl/Meta + 数字：同样先 flush，再按最新过滤结果取第 N 卡
    if (ev.ctrlKey || ev.metaKey) {
      const num = Number(ev.key);
      if (isNaN(num)) return;
      const q = flushSearch(valRef.current);
      if (!q) return;
      ev.preventDefault();
      // 同步重建与 filteredData 搜索分支一致的列表（共用统一排序；引擎卡仍读 ref）
      const tools: any[] = dataRef.current?.tools || [];
      const ordered = buildSearchOrderedList(tools, q, dataRef.current?.siteConfig?.sortByClicks);
      const engineCards = (filteredDataRef.current || []).filter(
        (c: any) => typeof c?.id === 'number' && c.id >= 8800880000
      );
      const cards = [...ordered, ...engineCards];
      const index = Number(ev.key) - 1;
      if (index >= 0 && index < cards.length && cards[index]?.url) {
        window.open(cards[index].url, "_blank");
        resetSearch();
      }
    }
  };

  const searchBar = (
    <SearchBar
      searchString={val}
      setSearchText={handleSetSearchText}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
  const tagSelector = (
    <TagSelector
      tags={data?.catelogs ?? ['全部工具']}
      currTag={currTag}
      onTagChange={handleSetCurrTag}
    />
  );

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <link
          rel="icon"
          href={
            data?.setting?.favicon ?? "favicon.ico"
          }
        />
        <title>{data?.setting?.title ?? "Van Nav"}</title>
      </Helmet>
      {(searchTop || tagTop) && (
        <div className="topbar">
          <div className={`content${tagTransparentClass}`}>
            {searchTop && <div className={searchSlotClass}>{searchBar}</div>}
            {tagTop && tagSelector}
          </div>
        </div>
      )}
      {!tagHidden && tagSide && (
        <div className={`tag-rail tag-rail-${tagSide}${tagTransparentClass}`}>{tagSelector}</div>
      )}
      <div className={`content-wraper${tagSide ? ` tag-rail-spacing-${tagSide}` : ''}`}>
        <div className={`content cards ${data?.siteConfig?.compactMode ? 'compact-grid' : ''}`} style={gridStyle}>
          {loading ? <Loading></Loading> : renderCardsV2()}
        </div>
      </div>
      {(searchAtBottom || tagAtBottom) && (
        <div className={`bottom-controls${tagTransparentClass}`}>
          {searchAtBottom && <div className={searchSlotClass}>{searchBar}</div>}
          {tagAtBottom && tagSelector}
        </div>
      )}
      {footerText && (
        <div className="record-wraper">
          <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer">{footerText}</a>
        </div>
      )}
      <div className="floating-actions">
        {showAdmin && <AdminLink jumpTargetBlank={data?.setting?.jumpTargetBlank} />}
        {showGithub && <GithubLink />}
        <DarkSwitch showGithub={showGithub} />
      </div>
    </>
  );
};

export default Content;
