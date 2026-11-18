/**
 * 搜索结果统一排序 — 唯一 owner
 *
 * 页面渲染（Content filteredData）与键盘快捷打开（Enter / Ctrl+N）必须共用
 * 同一套排序，否则会出现「回车打开的不是页面第一张」的错位。
 *
 * 规则（与原 filteredData 搜索分支严格一致）：
 *   1. getSearchRelevanceScore 打分，0 分淘汰（AND 语义：任一 token 未命中即淘汰）
 *   2. sortByClicks 开启：相关性降序，同分按点击综合分降序
 *   3. sortByClicks 关闭：仅过滤，保持后端原始顺序（即「页面显示顺序」）
 */
import { getSearchRelevanceScore } from "./searchScore";
import { batchGetTotalScores } from "./clickTracker";

export function buildSearchOrderedList(
  tools: any[],
  q: string,
  sortByClicks?: boolean
): any[] {
  const scoredList = (tools || [])
    .map((item: any) => ({ item, relevanceScore: getSearchRelevanceScore(item, q) }))
    .filter((node: any) => node.relevanceScore > 0);

  if (sortByClicks) {
    // P2: 一次性批量计算点击分，避免 sort 中 N·log(N) 次 localStorage 读取
    const scoreMap = batchGetTotalScores(scoredList.map((n: any) => n.item));
    scoredList.sort((a: any, b: any) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return (scoreMap.get(b.item.id) || 0) - (scoreMap.get(a.item.id) || 0);
    });
  }

  return scoredList.map((node: any) => node.item);
}
