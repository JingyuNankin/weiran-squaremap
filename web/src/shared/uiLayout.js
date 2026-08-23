/** @typedef {"compact" | "desktop"} UiLayout */

export const UI_LAYOUT = {
    compact: /** @type {const} */ ("compact"),
    desktop: /** @type {const} */ ("desktop"),
};

/**
 * 手机端判定，不用 UA。
 * - 窄屏：竖屏手机，或把窗口收得很窄
 * - 粗指针且无悬停、短边也窄：横屏手机（宽边会超过 639）
 * Pad 及以上宽屏保持桌面布局。
 * Chrome 设备模式会模拟 width/height 与 hover/pointer，因此能对上。
 */
const COMPACT_LAYOUT_QUERIES = [
    "(max-width: 639px)",
    "(hover: none) and (pointer: coarse) and (max-height: 639px)",
];

/**
 * @returns {boolean}
 */
export function isCompactLayout() {
    if (typeof window === "undefined") {
        return false;
    }
    return COMPACT_LAYOUT_QUERIES.some((query) => window.matchMedia(query).matches);
}

/**
 * @returns {UiLayout}
 */
export function getUiLayout() {
    return isCompactLayout() ? UI_LAYOUT.compact : UI_LAYOUT.desktop;
}

/**
 * @param {(compact: boolean) => void} callback
 * @returns {() => void}
 */
export function subscribeUiLayout(callback) {
    if (typeof window === "undefined") {
        return () => {};
    }
    const medias = COMPACT_LAYOUT_QUERIES.map((query) => window.matchMedia(query));
    const sync = () => callback(isCompactLayout());
    for (const media of medias) {
        media.addEventListener("change", sync);
    }
    sync();
    return () => {
        for (const media of medias) {
            media.removeEventListener("change", sync);
        }
    };
}

let stopApply = /** @type {(() => void) | null} */ (null);

/**
 * 把判定写到 `html[data-ui-layout]`，CSS 左右布局与 JS Drawer 共用。
 */
export function applyUiLayout() {
    const sync = () => {
        document.documentElement.dataset.uiLayout = getUiLayout();
    };
    stopApply?.();
    stopApply = subscribeUiLayout(sync);
    return () => {
        stopApply?.();
        stopApply = null;
    };
}
