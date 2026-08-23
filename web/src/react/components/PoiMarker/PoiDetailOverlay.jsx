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
import { useCompactMapLayout } from "../../hooks/useCompactMapLayout.js";
import { getPoiById } from "../../search/poiCatalog.js";
import { PoiDetailContent, PoiDetailTitle } from "./PoiDetailContent.jsx";
import "../../styles/poi-detail.css";

/**
 * POI 详情：桌面端锚点气泡，手机端底部 Drawer。
 */
export function PoiDetailOverlay() {
    const compactLayout = useCompactMapLayout();
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

    useEffect(() => {
        if (!compactLayout || !open || popoverRef.current == null) {
            return;
        }
        const el = popoverRef.current;
        /** @type {{ pointerId: number, startY: number } | null} */
        let drag = null;

        const onPointerDown = (event) => {
            if (event.button !== 0) {
                return;
            }
            const target = event.target;
            if (!(target instanceof Element) || target.closest("a, button") != null) {
                return;
            }
            if (target.closest(".poi-detail-handle, .poi-detail-popover-header") == null) {
                return;
            }
            drag = { pointerId: event.pointerId, startY: event.clientY };
            el.style.transition = "none";
            el.setPointerCapture(event.pointerId);
        };

        const onPointerMove = (event) => {
            if (drag == null || event.pointerId !== drag.pointerId) {
                return;
            }
            el.style.transform = `translateY(${Math.max(0, event.clientY - drag.startY)}px)`;
        };

        const onPointerEnd = (event) => {
            if (drag == null || event.pointerId !== drag.pointerId) {
                return;
            }
            const dy = Math.max(0, event.clientY - drag.startY);
            drag = null;
            el.style.transition = "";
            el.style.transform = "";
            if (dy > 72) {
                closePoiDetail();
            }
        };

        el.addEventListener("pointerdown", onPointerDown);
        el.addEventListener("pointermove", onPointerMove);
        el.addEventListener("pointerup", onPointerEnd);
        el.addEventListener("pointercancel", onPointerEnd);
        return () => {
            el.removeEventListener("pointerdown", onPointerDown);
            el.removeEventListener("pointermove", onPointerMove);
            el.removeEventListener("pointerup", onPointerEnd);
            el.removeEventListener("pointercancel", onPointerEnd);
            el.style.transition = "";
            el.style.transform = "";
        };
    }, [compactLayout, open, detailId]);

    if (!open || poi == null) {
        return null;
    }
    if (!compactLayout && popoverLayout == null) {
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
                aria-modal="true"
                aria-label={`${poi.name} 详情`}
                style={
                    compactLayout || popoverLayout == null
                        ? undefined
                        : {
                              left: popoverLayout.left,
                              top: popoverLayout.top,
                          }
                }
            >
                <div className="poi-detail-handle" aria-hidden="true" />
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
