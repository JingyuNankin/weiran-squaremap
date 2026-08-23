/**
 * 地图图层栈（自下而上）：
 * 1. 瓦片图像层 — tilePane、overlayPane（施加 filter）
 * 2. 滤镜层 — 同上 pane 的 CSS filter（非独立 DOM）
 * 3. POI 层 — poiLayer（全部 GIS POI，不受滤镜影响）
 * 4. 交互层 — markerPane、tooltipPane、popupPane、nameplate 等
 */

export const BRIGHTNESS_LEVEL_MIN = -3;
export const BRIGHTNESS_LEVEL_MAX = 3;

export const SATURATION_LEVEL_MIN = 0;
export const SATURATION_LEVEL_MAX = 6;

/** 亮度 CSS 倍率：档位 0 = 1.0，每档 ±0.14 */
export const BRIGHTNESS_STEP = 0.14;

/** Leaflet pane 名 */
export const POI_LAYER_PANE = "poiLayer";

/** @type {readonly string[]} 瓦片图像层（含 squaremap 矢量底图） */
const FILTERED_PANES = ["tilePane", "overlayPane"];

/** @type {readonly string[]} 滤镜之上：POI + 交互 */
const CLEAR_PANES = [
    POI_LAYER_PANE,
    "shadowPane",
    "markerPane",
    "tooltipPane",
    "popupPane",
    "nameplate",
];

/** @type {L.Map | null} */
let mapRef = null;

/**
 * @param {number} level
 * @returns {number}
 */
export function clampBrightnessLevel(level) {
    const parsed = Math.round(Number(level));
    if (!Number.isFinite(parsed)) {
        return 0;
    }
    return Math.min(BRIGHTNESS_LEVEL_MAX, Math.max(BRIGHTNESS_LEVEL_MIN, parsed));
}

/**
 * @param {number} level
 * @returns {number}
 */
export function clampSaturationLevel(level) {
    const parsed = Math.round(Number(level));
    if (!Number.isFinite(parsed)) {
        return SATURATION_LEVEL_MAX;
    }
    return Math.min(SATURATION_LEVEL_MAX, Math.max(SATURATION_LEVEL_MIN, parsed));
}

/**
 * @param {number} level -3…3
 * @returns {number}
 */
export function brightnessLevelToCss(level) {
    return 1 + clampBrightnessLevel(level) * BRIGHTNESS_STEP;
}

/**
 * @param {number} level 0（黑白）…6（正常）
 * @returns {number}
 */
export function saturationLevelToCss(level) {
    return clampSaturationLevel(level) / SATURATION_LEVEL_MAX;
}

/**
 * @param {number} brightnessLevel
 * @param {number} saturationLevel
 * @returns {string}
 */
function buildFilterStyle(brightnessLevel, saturationLevel) {
    /** @type {string[]} */
    const parts = [];
    const brightness = brightnessLevelToCss(brightnessLevel);
    const saturate = saturationLevelToCss(saturationLevel);

    if (brightness !== 1) {
        parts.push(`brightness(${brightness})`);
    }
    if (saturate !== 1) {
        parts.push(`saturate(${saturate})`);
    }

    return parts.length > 0 ? parts.join(" ") : "none";
}

/**
 * @param {L.Map} map
 */
export function initMapFilterPanes(map) {
    mapRef = map;

    if (map.getPane(POI_LAYER_PANE) == null) {
        map.createPane(POI_LAYER_PANE).style.zIndex = "550";
    }
}

/**
 * @param {{ brightnessLevel?: number, saturationLevel?: number }} levels
 */
export function applyMapFilter(levels) {
    if (mapRef == null) {
        return;
    }

    const filter = buildFilterStyle(levels.brightnessLevel ?? 0, levels.saturationLevel ?? 6);

    for (const name of FILTERED_PANES) {
        const pane = mapRef.getPane(name);
        if (pane instanceof HTMLElement) {
            pane.style.filter = filter;
        }
    }

    for (const name of CLEAR_PANES) {
        const pane = mapRef.getPane(name);
        if (pane instanceof HTMLElement) {
            pane.style.filter = "none";
        }
    }
}
