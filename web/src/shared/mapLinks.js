/** 从轨道交通示意图跳到卫星图时的默认缩放 */
export const SATELLITE_FOCUS_ZOOM = 5;

const DEFAULT_WORLD = "world";

/**
 * @param {{
 *   world?: string | null,
 *   x?: number | string | null,
 *   z?: number | string | null,
 *   zoom?: number | string | null,
 *   poi?: string | null,
 * }} [opts]
 * @returns {string}
 */
export function satelliteUrl(opts = {}) {
    const params = new URLSearchParams();
    params.set("world", opts.world == null || opts.world === "" ? DEFAULT_WORLD : String(opts.world));
    if (opts.zoom != null && opts.zoom !== "") {
        params.set("zoom", String(opts.zoom));
    } else {
        params.set("zoom", String(SATELLITE_FOCUS_ZOOM));
    }
    if (opts.x != null && opts.x !== "") {
        params.set("x", String(opts.x));
    }
    if (opts.z != null && opts.z !== "") {
        params.set("z", String(opts.z));
    }
    if (opts.poi != null && opts.poi !== "") {
        params.set("poi", String(opts.poi));
    }
    return `./index.html?${params.toString()}`;
}

/**
 * @param {{ poi?: string | null }} [opts]
 * @returns {string}
 */
export function schematicUrl(opts = {}) {
    if (opts.poi == null || opts.poi === "") {
        return "./schematic.html";
    }
    const params = new URLSearchParams();
    params.set("poi", String(opts.poi));
    return `./schematic.html?${params.toString()}`;
}
