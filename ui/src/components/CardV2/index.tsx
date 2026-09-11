import { memo, useMemo } from "react";
import "./index.css";
import { getLogoUrl, handleLogoImgError } from "../../utils/check";
import { getJumpTarget } from "../../utils/setting";
import { recordClick } from "../../utils/clickTracker";
import { useTranslation } from "../../i18n";

const Card = memo(({ id, title, url, des, logo, catelog, onClick, index, isSearching, noImageMode, compactMode, jumpTargetBlank }: any) => {
  const { t } = useTranslation();

  const imageSrc = useMemo(() => {
    return url === "admin" ? logo : getLogoUrl(logo);
  }, [logo, url]);

  const displayCatelog = useMemo(() => {
    return catelog === null || catelog === undefined || catelog === "" || (typeof catelog === 'string' && catelog.trim() === "") 
      ? t('home.tag.uncategorized') 
      : catelog;
  }, [catelog, t]);

  const showNumIndex = index < 10 && isSearching;

  return (
    <a
      href={url === "toggleJumpTarget" ? undefined : url}
      onClick={() => {
        if (id && url !== "toggleJumpTarget" && url !== "admin") {
          recordClick(id);
        }
        onClick();
      }}
      target={getJumpTarget(jumpTargetBlank) === "blank" ? "_blank" : "_self"}
      rel="noreferrer"
      className="card-box"
    >
      {showNumIndex && <span className="card-index">{index + 1}</span>}
      <div className={`card-content ${compactMode ? 'compact-mode' : ''}`}>
        {!noImageMode && (
          <div className="card-left">
            <img 
              src={imageSrc}
              alt={title}
              loading="lazy"
              decoding="async"
              onError={handleLogoImgError}
            />
          </div>
        )}
        <div className="card-right">
          <div className="card-right-top">
            <span className="card-right-title" title={title}>{title}</span>
            {!compactMode && <span className="card-tag" title={displayCatelog}>{displayCatelog}</span>}
          </div>
          {!compactMode && <div className="card-right-bottom" title={des}>{des}</div>}
        </div>
      </div>
    </a>
  );
});

export default Card;
