import { Tag } from "antd";
import { MakiIcon } from "../PoiMarker/MakiIcon.jsx";
import { getOrgLayerLegend } from "../../org/orgLayerLegend.js";

/**
 * @param {{ node: import("../../org/orgCatalog.js").OrgTreeDataNode }} props
 */
export function OrgTreeNodeTitle({ node }) {
    const layerKey = String(node.layerKey ?? "");
    const legend = getOrgLayerLegend(layerKey);
    const showTag = layerKey !== "nation" && node.layerName != null;

    return (
        <span className="org-tree-node-title">
            {legend != null ? (
                <MakiIcon
                    icon={legend.icon}
                    color={legend.iconColor}
                    size={14}
                    className="org-tree-node-icon"
                />
            ) : null}
            <span className="org-tree-node-name">{node.title}</span>
            {showTag ? (
                <Tag bordered={false} className="org-tree-node-tag">
                    {node.layerName}
                </Tag>
            ) : null}
        </span>
    );
}
