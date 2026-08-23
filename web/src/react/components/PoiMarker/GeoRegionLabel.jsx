import { PoiMarkerShell } from "./PoiMarkerShell.jsx";

/**
 * POI 类型 1 — 地名类（markerType: label）
 *
 * 国名、政区、自然村、办事处等。居中背景文本，无 icon。
 * 颜色与描边由各皮肤 --weiran-map-poi-geo-* 控制（与工具栏默认按钮一致）；
 * layerKey tier 间仅差字号、字重、背景不透明度与内边距。
 *
 * @param {{
 *   id: string,
 *   layerKey: string,
 *   text: string,
 *   highlighted?: boolean,
 *   onClick?: () => void,
 * }} props
 */
export function GeoRegionLabel({ id, layerKey, text, highlighted, onClick }) {
    return (
        <PoiMarkerShell
            id={id}
            layerKey={layerKey}
            variant="label"
            highlighted={highlighted}
            className={`weiran-poi-geo weiran-poi-geo--${layerKey}`}
            onClick={onClick}
        >
            <span className="weiran-poi-geo-text">{text}</span>
        </PoiMarkerShell>
    );
}
