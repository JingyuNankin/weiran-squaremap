import { EnvironmentOutlined } from "@ant-design/icons";
import { Descriptions, Drawer, Typography } from "antd";
import { useEffect, useState } from "react";
import { closePoiDetail, getPoiDetailId, subscribePoiDetail } from "../../bridge/poiBridge.js";
import { getPoiById } from "../../search/poiCatalog.js";

export function PoiDetailDrawer() {
    const [detailId, setDetailId] = useState(() => getPoiDetailId());
    const poi = detailId != null ? getPoiById(detailId) : null;

    useEffect(() => subscribePoiDetail(() => setDetailId(getPoiDetailId())), []);

    return (
        <Drawer
            className="poi-detail-drawer"
            title={
                <span className="poi-detail-drawer-title">
                    <EnvironmentOutlined aria-hidden="true" />
                    {poi?.name ?? "地点详情"}
                </span>
            }
            placement="bottom"
            height="auto"
            open={detailId != null && poi != null}
            onClose={() => closePoiDetail()}
            mask={false}
            styles={{
                wrapper: { pointerEvents: "auto" },
            }}
        >
            {poi != null ? (
                <>
                    <Typography.Text type="secondary" className="poi-detail-drawer-category">
                        {poi.layerName}
                    </Typography.Text>
                    <Descriptions column={1} size="small" className="poi-detail-drawer-meta">
                        <Descriptions.Item label="坐标">
                            X {poi.x} · Z {poi.z}
                        </Descriptions.Item>
                        <Descriptions.Item label="标识">{poi.id}</Descriptions.Item>
                    </Descriptions>
                </>
            ) : null}
        </Drawer>
    );
}
