import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    getHighlightedPoiId,
    highlightPoi,
    openPoiDetail,
    subscribeHighlight,
} from "../bridge/poiBridge.js";
import { GeoRegionLabel } from "../components/PoiMarker/GeoRegionLabel.jsx";
import { UnitPointMarker } from "../components/PoiMarker/UnitPointMarker.jsx";

/**
 * @typedef {{
 *   variant: "label" | "iconWithText",
 *   id: string,
 *   layerKey: string,
 *   text: string,
 *   color?: string | null,
 *   icon?: string | null,
 *   x: number,
 *   z: number,
 * }} PoiMarkerProps
 */

/**
 * Leaflet divIcon 容器内挂载 POI React 组件。
 *
 * variant 对应两类 POI：
 * - label → GeoRegionLabel（地名类）
 * - iconWithText → UnitPointMarker（地点类）
 */

/** @type {Map<HTMLElement, import("react-dom/client").Root>} */
const roots = new Map();

/**
 * @param {PoiMarkerProps} props
 */
function PoiMarkerHost(props) {
    const [highlightedId, setHighlightedId] = useState(() => getHighlightedPoiId());

    useEffect(() => subscribeHighlight(() => setHighlightedId(getHighlightedPoiId())), []);

    const highlighted = props.id === highlightedId;

    const handleClick = () => {
        highlightPoi(props.id);
        openPoiDetail(props.id, { x: props.x, z: props.z });
    };

    if (props.variant === "label") {
        return (
            <GeoRegionLabel
                id={props.id}
                layerKey={props.layerKey}
                text={props.text}
                highlighted={highlighted}
                onClick={handleClick}
            />
        );
    }

    return (
        <UnitPointMarker
            id={props.id}
            layerKey={props.layerKey}
            text={props.text}
            color={props.color}
            icon={props.icon}
            highlighted={highlighted}
            onClick={handleClick}
        />
    );
}

/**
 * @param {HTMLElement} container
 * @param {PoiMarkerProps} props
 */
export function mountPoiMarker(container, props) {
    let root = roots.get(container);
    if (root == null) {
        root = createRoot(container);
        roots.set(container, root);
    }
    root.render(<PoiMarkerHost {...props} />);
}

/**
 * @param {HTMLElement} container
 */
export function unmountPoiMarker(container) {
    const root = roots.get(container);
    if (root != null) {
        root.unmount();
        roots.delete(container);
    }
}
