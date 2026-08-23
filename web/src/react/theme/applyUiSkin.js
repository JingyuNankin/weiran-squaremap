/** @typedef {{ id: string, label: string }} UiSkinDefinition */

/** @type {readonly UiSkinDefinition[]} */
export const UI_SKINS = [
    { id: "light", label: "Light 光昼" },
    { id: "gloom", label: "Gloom 静夜" },
    { id: "minecraft", label: "Minecraft 方块" },
    { id: "parchment", label: "Parchment 羊皮纸" },
];

/** @type {string} */
export const DEFAULT_UI_SKIN = "light";

const SKIN_STORAGE_KEY = "weiran-ui-skin";

/**
 * @param {string} skinId
 * @returns {UiSkinDefinition | undefined}
 */
export function getUiSkinDefinition(skinId) {
    return UI_SKINS.find((skin) => skin.id === skinId);
}

/**
 * @returns {string}
 */
export function getStoredUiSkin() {
    try {
        return getUiSkinDefinition(localStorage.getItem(SKIN_STORAGE_KEY) ?? "")?.id ?? DEFAULT_UI_SKIN;
    } catch {
        return DEFAULT_UI_SKIN;
    }
}

/**
 * @param {string} [skinId]
 */
export function applyUiSkin(skinId) {
    const resolvedSkinId = getUiSkinDefinition(skinId ?? getStoredUiSkin())?.id ?? DEFAULT_UI_SKIN;

    document.documentElement.dataset.uiSkin = resolvedSkinId;

    const root = document.getElementById("react-root");
    if (root != null) {
        root.dataset.uiSkin = resolvedSkinId;
    }

    const map = document.getElementById("map");
    if (map != null) {
        map.dataset.uiSkin = resolvedSkinId;
    }

    try {
        localStorage.setItem(SKIN_STORAGE_KEY, resolvedSkinId);
    } catch {
        /* ignore quota / private mode */
    }
}

/**
 * @returns {string}
 */
export function getCurrentUiSkin() {
    return (
        document.documentElement.dataset.uiSkin ??
        document.getElementById("react-root")?.dataset.uiSkin ??
        DEFAULT_UI_SKIN
    );
}
