export const MAP_SATELLITE = "satellite";
export const MAP_SCHEMATIC = "schematic";

/**
 * @param {{ maps?: unknown }} [layerDef]
 * @returns {string[]}
 */
export function getLayerMaps(layerDef) {
    if (Array.isArray(layerDef?.maps) && layerDef.maps.length > 0) {
        return layerDef.maps.map(String);
    }
    return [MAP_SATELLITE];
}

/**
 * @param {{ maps?: unknown }} [layerDef]
 * @param {string} mapId
 * @returns {boolean}
 */
export function layerAppearsOn(layerDef, mapId) {
    return getLayerMaps(layerDef).includes(mapId);
}
