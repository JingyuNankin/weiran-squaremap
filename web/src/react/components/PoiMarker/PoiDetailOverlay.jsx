import { CloseOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    closePoiDetail,
    getPoiDetailAnchor,
    getPoiDetailId,
    subscribePoiDetail,
} from "../../bridge/poiBridge.js";
import {
    computePopoverLayout,
    usePoiDetailScreenPosition,
} from "../../hooks/usePoiDetailScreenPosition.js";
import { getPoiById } from "../../search/poiCatalog.js";
import { PoiDetailContent, PoiDetailTitle } from "./PoiDetailContent.jsx";
import "../../styles/poi-detail.css";

/**
 * POI 详情锚点气泡（全端统一）。样式由 #react-root 皮肤变量驱动。
 */
export function PoiDetailOverlay() {
    const [detailId, setDetailId] = useState(() => getPoiDetailId());
    const [anchor, setAnchor] = useState(() => getPoiDetailAnchor());
    const popoverRef = useRef(/** @type {HTMLDivElement | null} */ (null));
    const [popoverSize, setPopoverSize] = useState({ width: 240, height: 120 });

    const poi = detailId != null ? getPoiById(detailId) : null;
    const open = poi != null;

    const anchorX = anchor?.x ?? poi?.x;
    const anchorZ = anchor?.z ?? poi?.z;
    const rawPosition = usePoiDetailScreenPosition(anchorX, anchorZ, open);
    const popoverLayout = computePopoverLayout(rawPosition, popoverSize);

    useEffect(() => subscribePoiDetail(() => {
        setDetailId(getPoiDetailId());
        setAnchor(getPoiDetailAnchor());
    }), []);

    useLayoutEffect(() => {
        if (!open || popoverRef.current == null) {
            return;
        }
        const el = popoverRef.current;
        const sync = () => {
            setPopoverSize({ width: el.offsetWidth, height: el.offsetHeight });
        };
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(el);
        return () => observer.disconnect();
    }, [open, detailId]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                closePoiDetail();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    if (!open || poi == null || popoverLayout == null) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                className="poi-detail-scrim"
                aria-label="关闭详情"
                onClick={() => closePoiDetail()}
            />
            <div
                ref={popoverRef}
                className="poi-detail-popover"
                role="dialog"
                aria-label={`${poi.name} 详情`}
                style={{
                    left: popoverLayout.left,
                    top: popoverLayout.top,
                }}
            >
                <div className="poi-detail-popover-header">
                    <PoiDetailTitle poi={poi} />
                    <Button
                        type="text"
                        size="small"
                        className="poi-detail-close-btn"
                        icon={<CloseOutlined aria-hidden="true" />}
                        aria-label="关闭"
                        onClick={() => closePoiDetail()}
                    />
                </div>
                <PoiDetailContent poi={poi} />
            </div>
        </>
    );
}
