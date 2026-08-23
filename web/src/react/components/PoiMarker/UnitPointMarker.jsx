import { MakiIcon } from "./MakiIcon.jsx";
import { PoiMarkerShell } from "./PoiMarkerShell.jsx";

/**
 * POI 类型 2 — 地点类（markerType: iconWithText）
 *
 * 行政单位、事业单位、经济单位、文旅单位等。
 * 圆形 badge + Maki icon，文本在 icon 右侧；layers.json 的 color 着色 icon 与标签。
 *
 * @param {{
 *   id: string,
 *   layerKey: string,
 *   text: string,
 *   color?: string | null,
 *   icon?: string | null,
 *   highlighted?: boolean,
 *   onClick?: () => void,
 * }} props
 */
export function UnitPointMarker({ id, layerKey, text, color, icon, highlighted, onClick }) {
    const accent = color ?? "var(--weiran-map-poi-accent-fallback)";

    return (
        <PoiMarkerShell
            id={id}
            layerKey={layerKey}
            variant="iconWithText"
            color={color}
            highlighted={highlighted}
            className={`weiran-poi-unit weiran-poi-unit--${layerKey}`}
            onClick={onClick}
        >
            <span className="weiran-poi-unit-badge" aria-hidden="true">
                <MakiIcon icon={icon} color={accent} className="weiran-poi-unit-icon" />
            </span>
            <span className="weiran-poi-unit-label">{text}</span>
        </PoiMarkerShell>
    );
}
