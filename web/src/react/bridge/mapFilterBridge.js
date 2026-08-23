import { getCurrentUiSkin } from "../theme/applyUiSkin.js";
import {
    applyMapFilter,
    BRIGHTNESS_LEVEL_MAX,
    BRIGHTNESS_LEVEL_MIN,
    clampBrightnessLevel,
    clampSaturationLevel,
    initMapFilterPanes,
    SATURATION_LEVEL_MAX,
    SATURATION_LEVEL_MIN,
} from "../../js/util/mapFilterPane.js";

/** @type {Record<string, { brightness: number, saturation: number }>} */
export const SKIN_FILTER_DEFAULTS = {
    light: { brightness: 3, saturation: 5 },
    gloom: { brightness: -3, saturation: 3 },
    minecraft: { brightness: 0, saturation: 3 },
    /** 略压暗、较高饱和：暖色纸面下保留地形色但突出 POI */
    parchment: { brightness: -1, saturation: 5 },
};

/** @type {Set<() => void>} */
const listeners = new Set();

/** @type {string} */
let activeSkinId = getCurrentUiSkin();

/** @type {number} */
let brightnessLevel = loadStoredBrightness(activeSkinId);

/** @type {number} */
let saturationLevel = loadStoredSaturation(activeSkinId);

/**
 * @param {string} skinId
 * @param {"brightness" | "saturation"} axis
 * @returns {string}
 */
function storageKey(skinId, axis) {
    return `weiran_map_filter_${skinId}_${axis}`;
}

/**
 * @param {string} skinId
 * @returns {{ brightness: number, saturation: number }}
 */
function getSkinDefaults(skinId) {
    return SKIN_FILTER_DEFAULTS[skinId] ?? SKIN_FILTER_DEFAULTS.light;
}

/**
 * @param {string} skinId
 * @returns {number}
 */
function loadStoredBrightness(skinId) {
    const fallback = getSkinDefaults(skinId).brightness;
    try {
        const raw = localStorage.getItem(storageKey(skinId, "brightness"));
        if (raw == null) {
            return fallback;
        }
        return clampBrightnessLevel(Number(raw));
    } catch {
        return fallback;
    }
}

/**
 * @param {string} skinId
 * @returns {number}
 */
function loadStoredSaturation(skinId) {
    const fallback = getSkinDefaults(skinId).saturation;
    try {
        const raw = localStorage.getItem(storageKey(skinId, "saturation"));
        if (raw == null) {
            return fallback;
        }
        return clampSaturationLevel(Number(raw));
    } catch {
        return fallback;
    }
}

/**
 * @param {string} skinId
 * @param {"brightness" | "saturation"} axis
 * @param {number} level
 */
function writeStoredLevel(skinId, axis, level) {
    try {
        localStorage.setItem(storageKey(skinId, axis), String(level));
    } catch {
        // ignore quota / private mode
    }
}

function notify() {
    for (const listener of listeners) {
        listener();
    }
}

function syncFilterToMap() {
    applyMapFilter({ brightnessLevel, saturationLevel });
}

/**
 * @param {string} skinId
 */
export function loadFilterForSkin(skinId) {
    activeSkinId = skinId;
    brightnessLevel = loadStoredBrightness(skinId);
    saturationLevel = loadStoredSaturation(skinId);
    syncFilterToMap();
    notify();
}

/**
 * @param {L.Map} map
 */
export function initMapFilter(map) {
    initMapFilterPanes(map);
    activeSkinId = getCurrentUiSkin();
    brightnessLevel = loadStoredBrightness(activeSkinId);
    saturationLevel = loadStoredSaturation(activeSkinId);
    syncFilterToMap();
}

export function getBrightnessLevelMin() {
    return BRIGHTNESS_LEVEL_MIN;
}

export function getBrightnessLevelMax() {
    return BRIGHTNESS_LEVEL_MAX;
}

export function getSaturationLevelMin() {
    return SATURATION_LEVEL_MIN;
}

export function getSaturationLevelMax() {
    return SATURATION_LEVEL_MAX;
}

export function getBrightnessLevel() {
    return brightnessLevel;
}

export function getSaturationLevel() {
    return saturationLevel;
}

/**
 * @param {number} level
 */
export function setBrightnessLevel(level) {
    const next = clampBrightnessLevel(level);
    if (next === brightnessLevel) {
        return;
    }
    brightnessLevel = next;
    writeStoredLevel(activeSkinId, "brightness", next);
    syncFilterToMap();
    notify();
}

/**
 * @param {number} level
 */
export function setSaturationLevel(level) {
    const next = clampSaturationLevel(level);
    if (next === saturationLevel) {
        return;
    }
    saturationLevel = next;
    writeStoredLevel(activeSkinId, "saturation", next);
    syncFilterToMap();
    notify();
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeMapFilter(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
