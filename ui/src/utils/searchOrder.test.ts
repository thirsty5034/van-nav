import { buildSearchOrderedList } from "./searchOrder";

const mk = (id: number, name: string, url: string, desc = "") => ({
  id,
  name,
  url,
  desc,
});

const setClicks = (map: Record<number, number>) => {
  const now = Date.now();
  const store: Record<string, { score: number; lastClick: number }> = {};
  for (const [id, score] of Object.entries(map)) {
    store[String(id)] = { score, lastClick: now };
  }
  window.localStorage.setItem("van_nav_clicks", JSON.stringify(store));
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("buildSearchOrderedList", () => {
  it("空搜索词返回空数组", () => {
    expect(buildSearchOrderedList([mk(1, "GitHub", "https://github.com")], "", true)).toEqual([]);
    expect(buildSearchOrderedList([], "git", true)).toEqual([]);
  });

  it("0 分工具被淘汰（AND 语义）", () => {
    const tools = [
      mk(1, "GitHub", "https://github.com"),
      mk(2, "百度", "https://baidu.com"),
    ];
    const out = buildSearchOrderedList(tools, "git", false);
    expect(out.map((t) => t.id)).toEqual([1]);
  });

  it("sortByClicks=false：仅过滤，保持原始顺序（页面显示顺序）", () => {
    // 原始顺序中低分者在前；页面第一张 = 低分者，而不是最高分者
    const tools = [
      mk(1, "Code", "https://code.com", "git 工具集合"), // desc 命中 1000 + 亲密 2000 = 3000
      mk(2, "GitHub", "https://github.com"),             // name 命中 5000 + 亲密 2000 = 7000
    ];
    const out = buildSearchOrderedList(tools, "git", false);
    expect(out.map((t) => t.id)).toEqual([1, 2]);
  });

  it("sortByClicks=true：相关性降序", () => {
    const tools = [
      mk(1, "Code", "https://code.com", "git 工具集合"),
      mk(2, "GitHub", "https://github.com"),
    ];
    const out = buildSearchOrderedList(tools, "git", true);
    expect(out.map((t) => t.id)).toEqual([2, 1]);
  });

  it("sortByClicks=true：同分按点击数降序（与页面同分决胜一致）", () => {
    const tools = [
      mk(1, "GitHub A", "https://a.com"),
      mk(2, "GitHub B", "https://b.com"),
    ];
    setClicks({ 1: 1, 2: 99 });
    const out = buildSearchOrderedList(tools, "github", true);
    expect(out.map((t) => t.id)).toEqual([2, 1]);
  });

  it("回车打开目标必须等于页面第一张（回归：sortByClicks=false 场景）", () => {
    const tools = [
      mk(1, "Code", "https://code.com", "git 工具集合"),
      mk(2, "GitHub", "https://github.com"),
    ];
    const pageFirst = buildSearchOrderedList(tools, "git", false)[0];
    const enterTarget = buildSearchOrderedList(tools, "git", false)[0];
    expect(enterTarget.id).toBe(pageFirst.id);
    expect(enterTarget.id).toBe(1); // 页面第一张，而不是最高分的 2
  });
});
