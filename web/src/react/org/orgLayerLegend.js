import layerCatalog from "../../../data/weiran-gis/layers.json";
import { buildLayerLegend } from "../../js/util/weiranGis.js";

/**
 * 组织树 / 图例用图层 icon 元数据。
 *
 * @param {string} layerKey
 * @returns {{ icon: string, iconColor: string } | null}
 */
export function getOrgLayerLegend(layerKey) {
    /** @type {Record<string, Record<string, unknown>>} */
    const layers = layerCatalog.layers ?? {};
    const layerDef = layers[layerKey];
    if (layerDef == null || layerDef.markerType !== "iconWithText") {
        return null;
    }

    return buildLayerLegend(layerDef);
}
