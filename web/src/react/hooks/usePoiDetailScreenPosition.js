import { useEffect, useState } from "react";
import { getMapBridge } from "../bridge/mapBridge.js";

/**
 * 将 POI 世界坐标投影为视口 fixed 定位（随地图平移/缩放更新）。
 *
 * @param {number | null | undefined} x
 * @param {number | null | undefined} z
 * @param {boolean} active
 */
export function usePoiDetailScreenPosition(x, z, active) {
    const mapBridge = getMapBridge();
    const [position, setPosition] = useState(/** @type {{ x: number, y: number } | null} */ (null));

    useEffect(() => {
        if (!active || x == null || z == null) {
            setPosition(null);
            return;
        }

        const map = mapBridge.getMap();
        if (map == null) {
            return;
        }

        const update = () => {
            const next = mapBridge.projectMapPoint(x, z);
            setPosition(next);
        };

        update();
        map.on("move zoom zoomend moveend resize", update);
        window.addEventListener("resize", update);

        return () => {
            map.off("move zoom zoomend moveend resize", update);
            window.removeEventListener("resize", update);
        };
    }, [active, mapBridge, x, z]);

    return position;
}

/** @typedef {'right' | 'left' | 'top'} PoiDetailPopoverPlacement */

/**
 * 气泡贴 POI 侧边/上方放置，避免遮挡标记本体。
 *
 * @param {{ x: number, y: number } | null} anchor
 * @param {{ width: number, height: number }} size
 * @returns {{ left: number, top: number, placement: PoiDetailPopoverPlacement } | null}
 */
export function computePopoverLayout(anchor, size) {
    if (anchor == null) {
        return null;
    }

    const margin = 12;
    const markerRadius = 28;
    const gap = 10;

    const clampTop = (top) =>
        Math.min(window.innerHeight - margin - size.height, Math.max(margin, top));

    // 优先：锚点右侧，气泡整体不覆盖锚点周围区域
    const rightLeft = anchor.x + markerRadius + gap;
    if (rightLeft + size.width <= window.innerWidth - margin) {
        return {
            left: rightLeft,
            top: clampTop(anchor.y - size.height / 2),
            placement: "right",
        };
    }

    // 其次：锚点左侧
    const leftLeft = anchor.x - markerRadius - gap - size.width;
    if (leftLeft >= margin) {
        return {
            left: leftLeft,
            top: clampTop(anchor.y - size.height / 2),
            placement: "left",
        };
    }

    // 最后：锚点上方（留出标记高度）
    const topTop = anchor.y - markerRadius - gap - size.height;
    const centeredLeft = anchor.x - size.width / 2;
    return {
        left: Math.min(window.innerWidth - margin - size.width, Math.max(margin, centeredLeft)),
        top: clampTop(topTop),
        placement: "top",
    };
}
