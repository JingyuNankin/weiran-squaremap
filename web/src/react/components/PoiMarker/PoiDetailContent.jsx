import { AimOutlined } from "@ant-design/icons";
import { getPoiOrgPath } from "../../org/orgCatalog.js";

/**
 * @param {{ poi: import("../../search/poiCatalog.js").SearchPoi }} props
 */
export function PoiDetailContent({ poi }) {
    const orgPath = getPoiOrgPath(poi.id);

    return (
        <div className="poi-detail-body">
            {orgPath.length > 0 ? (
                <p className="poi-detail-org-path" aria-label={`组织路径 ${orgPath.join(" ")}`}>
                    {orgPath.map((name, index) => (
                        <span key={`${name}-${index}`} className="poi-detail-org-segment">
                            {index > 0 ? <span className="poi-detail-org-sep" aria-hidden="true">›</span> : null}
                            {name}
                        </span>
                    ))}
                </p>
            ) : null}

            {poi.remark != null ? <p className="poi-detail-remark">{poi.remark}</p> : null}

            <div className="poi-detail-meta-row">
                <span className="poi-detail-layer">{poi.layerName}</span>
                <span className="poi-detail-coords">
                    <AimOutlined className="poi-detail-coords-icon" aria-hidden="true" />
                    <span className="poi-detail-coords-value">
                        {poi.x}, {poi.z}
                    </span>
                </span>
            </div>
        </div>
    );
}

/**
 * @param {{ poi: import("../../search/poiCatalog.js").SearchPoi }} props
 */
export function PoiDetailTitle({ poi }) {
    return <span className="poi-detail-title">{poi.name}</span>;
}
