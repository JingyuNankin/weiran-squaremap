/** @type {string | null} */
let highlightedPoiId = null;

/** @type {string | null} */
let detailPoiId = null;

/** @type {Set<() => void>} */
const highlightListeners = new Set();

/** @type {Set<() => void>} */
const detailListeners = new Set();

/**
 * @param {string | null} id
 */
export function highlightPoi(id) {
    highlightedPoiId = id;
    for (const listener of highlightListeners) {
        listener();
    }
}

/** @returns {string | null} */
export function getHighlightedPoiId() {
    return highlightedPoiId;
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeHighlight(listener) {
    highlightListeners.add(listener);
    return () => highlightListeners.delete(listener);
}

/**
 * @param {string | null} id
 */
export function openPoiDetail(id) {
    detailPoiId = id;
    if (id != null) {
        highlightedPoiId = id;
        for (const listener of highlightListeners) {
            listener();
        }
    }
    for (const listener of detailListeners) {
        listener();
    }
}

export function closePoiDetail() {
    detailPoiId = null;
    highlightedPoiId = null;
    for (const listener of highlightListeners) {
        listener();
    }
    for (const listener of detailListeners) {
        listener();
    }
}

/** @returns {string | null} */
export function getPoiDetailId() {
    return detailPoiId;
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribePoiDetail(listener) {
    detailListeners.add(listener);
    return () => detailListeners.delete(listener);
}
