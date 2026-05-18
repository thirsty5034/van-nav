import "./index.css";
import CardV2 from "../CardV2";
import SearchBar from "../SearchBar";
import { Loading } from "../Loading";
import { Helmet } from "react-helmet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FetchList } from "../../utils/api";
import TagSelector from "../TagSelector";
import pinyin from "pinyin-match";
import GithubLink from "../GithubLink";
import DarkSwitch from "../DarkSwitch";
import { isLogin } from "../../utils/check";
import { generateSearchEngineCard } from "../../utils/serachEngine";
import { toggleJumpTarget, syncJumpTargetFromServer } from "../../utils/setting";

const mutiSearch = (s, t) => {
  const source = (s as string).toLowerCase();
  const target = t.toLowerCase();
  const rawInclude = source.includes(target);
  const pinYinInlcude = Boolean(pinyin.match(source, target));
  return rawInclude || pinYinInlcude;
};

const Content = (props: any) => {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [currTag, setCurrTag] = useState("全部工具");
  const [searchString, setSearchString] = useState("");
  const [val, setVal] = useState("");
  const [searchEngineCards, setSearchEngineCards] = useState<any[]>([]);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1060 : true);

  const filteredDataRef = useRef<any>([]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1060);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showGithub = useMemo(() => {
    const hide = data?.setting?.hideGithub === true
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
  
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const r = await FetchList();
      setData(r);
      // 同步服务器跳转设置到 localStorage（仅当用户未手动设置时）
      syncJumpTargetFromServer(r?.setting?.jumpTargetBlank);
      // 成功时缓存到 localStorage，断网时可恢复
      try {
        window.localStorage.setItem("van-nav-cache", JSON.stringify(r));
      } catch (e) {
        // localStorage 满或不可用时忽略
      }
      const tagInLocalStorage = window.localStorage.getItem("tag");
      if (tagInLocalStorage && tagInLocalStorage !== "") {
        if (r?.catelogs && r?.catelogs.includes(tagInLocalStorage)) {
          setCurrTag(tagInLocalStorage);
        }
      }
    } catch (e) {
      console.log("网络请求失败，尝试从本地缓存恢复", e);
      try {
        const cached = window.localStorage.getItem("van-nav-cache");
        if (cached) {
          const r = JSON.parse(cached);
          setData(r);
          console.log("已从本地缓存恢复工具数据");
        }
      } catch (cacheErr) {
        console.log("本地缓存恢复失败", cacheErr);
      }
    } finally {
      setLoading(false);
    }
  }, [setData, setLoading, setCurrTag]);
  
  useEffect(() => {
    loadData();
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
    if (tag !== "管理后台") {
      window.localStorage.setItem("tag", tag);
    }
    resetSearch(true);
  };

  const resetSearch = (notSetTag?: boolean) => {
    setVal("");
    setSearchString("");
    const tagInLocalStorage = window.localStorage.getItem("tag");
    if (!notSetTag && tagInLocalStorage && tagInLocalStorage !== "" && tagInLocalStorage !== "管理后台") {
      setCurrTag(tagInLocalStorage);
    }
  };

  const handleSetSearch = (val: string) => {
    if (val !== "" && val) {
      setCurrTag("全部工具");
      setSearchString(val.trim());
    } else {
      resetSearch();
    }
  }

  const filteredData = useMemo(() => {
    if (data.tools) {
      const localResult = data.tools
        .filter((item: any) => {
          if (currTag === "全部工具") {
            return true;
          }
          return item.catelog === currTag;
        })
        .filter((item: any) => {
          if (searchString === "") {
            return true;
          }
          return (
            mutiSearch(item.name, searchString) ||
            mutiSearch(item.desc, searchString) ||
            mutiSearch(item.url, searchString)
          );
        });
      return [...localResult, ...searchEngineCards]
    } else {
      return [...searchEngineCards];
    }
  }, [data, currTag, searchString, searchEngineCards]);

  useEffect(() => {
    filteredDataRef.current = filteredData
  }, [filteredData])

  useEffect(() => {
    if (searchString.trim() === "") {
      document.removeEventListener("keydown", onKeyEnter);
    } else {
      document.addEventListener("keydown", onKeyEnter);
    }
    return () => {
      document.removeEventListener("keydown", onKeyEnter);
    }
    // eslint-disable-next-line
  }, [searchString])

  const renderCardsV2 = useCallback(() => {
    return filteredData.map((item, index) => {
      return (
        <CardV2
          title={item.name}
          url={item.url}
          des={item.desc}
          logo={item.logo}
          key={item.id}
          catelog={item.catelog}
          index={index}
          isSearching={searchString.trim() !== ""}
          noImageMode={data?.siteConfig?.noImageMode || false}
          compactMode={data?.siteConfig?.compactMode || false}
          jumpTargetBlank={data?.setting?.jumpTargetBlank}
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
  }, [filteredData, searchString, data?.siteConfig?.noImageMode, data?.siteConfig?.compactMode]);

  const onKeyEnter = (ev: KeyboardEvent) => {
    const cards = filteredDataRef.current;
    // 使用 keyCode 防止与中文输入冲突
    if (ev.keyCode === 13) {
      if (cards && cards.length) {
        window.open(cards[0]?.url, "_blank");
        resetSearch();
      }
    }
    // 如果按了数字键 + ctrl/meta，打开对应的卡片
    if (ev.ctrlKey || ev.metaKey) {
      const num = Number(ev.key);
      if (isNaN(num)) return;
      ev.preventDefault()
      const index = Number(ev.key) - 1;
      if (index >= 0 && index < cards.length) {
        window.open(cards[index]?.url, "_blank");
        resetSearch();
      }
    }

  };

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
      <div className="topbar">
        <div className="content">
          <SearchBar
            searchString={val}
            setSearchText={(t) => {
              setVal(t);
              handleSetSearch(t);
            }}
          />
          <TagSelector
            tags={data?.catelogs ?? ["全部工具"]}
            currTag={currTag}
            onTagChange={handleSetCurrTag}
          />
        </div>
      </div>
      <div className="content-wraper">
        <div className={`content cards ${data?.siteConfig?.compactMode ? 'compact-grid' : ''}`} style={gridStyle}>
          {loading ? <Loading></Loading> : renderCardsV2()}
        </div>
      </div>
      <div className="record-wraper">
        <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer">{data?.setting?.govRecord ?? ""}</a>
      </div>
      {showGithub && <GithubLink />}
      <DarkSwitch showGithub={showGithub} />
    </>
  );
};

export default Content;
