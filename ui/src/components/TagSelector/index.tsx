import "./index.css";
import { useCallback, useRef } from "react";
interface TagSelectorProps {
  tags: any;
  onTagChange: (newTag: string) => void;
  currTag: string;
}
const TagSelector = (props: TagSelectorProps) => {
  const { tags = ["all"], onTagChange, currTag } = props;
  const lastWheelTime = useRef(0);

  // 滚轮切换分类：在分类栏区域内滚动时阻止页面滚动，切换分类
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      // 节流：防止快速滚动时过于频繁触发，150ms 内只处理一次
      const now = Date.now();
      if (now - lastWheelTime.current < 150) return;
      lastWheelTime.current = now;

      const currentIndex = tags.indexOf(currTag);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (e.deltaY < 0) {
        // 向上滚动 → 上一个分类
        newIndex = Math.max(0, currentIndex - 1);
      } else if (e.deltaY > 0) {
        // 向下滚动 → 下一个分类
        newIndex = Math.min(tags.length - 1, currentIndex + 1);
      }

      if (newIndex !== currentIndex) {
        onTagChange(tags[newIndex]);
      }
    },
    [tags, currTag, onTagChange]
  );

  const renderTags = useCallback(() => {
    const originTags =  tags.map((each) => {
      // 处理空分类，显示为"未分类"
      const displayText = each === null || each === undefined || each === "" || (typeof each === 'string' && each.trim() === "") 
        ? "未分类" 
        : each;
      
      return (
        <span
          className={`select-tag ${
            currTag === each ? "select-tag-active" : ""
          }`}
          key={`${each}-select-tag`}
          onClick={() => {
            onTagChange(each);
          }}
        >
          {displayText}
        </span>
      );
    });
    return originTags;
  }, [tags, onTagChange, currTag]);
  return (
    <div className="tag-selector span-3" onWheel={handleWheel}>
      <div className="tag-selector-wrapper">
        {renderTags()}
      </div>
    </div>
  );
};

export default TagSelector;
