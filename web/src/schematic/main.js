import schematicCatalog from "../../data/weiran-gis/schematic.json";
import instanceCatalog from "../../data/weiran-gis/instances.json";
import { getPoiOrgPath } from "../react/org/orgCatalog.js";
import { getPoiById } from "../react/search/poiCatalog.js";
import { applyUiSkin } from "../react/theme/applyUiSkin.js";
import { SATELLITE_FOCUS_ZOOM, satelliteUrl } from "../shared/mapLinks.js";
import { bindSchematicControls } from "./controls.js";
import { layoutSchematic } from "./layout.js";
import "../react/styles/skins/light.css";
import "../react/styles/skins/gloom.css";
import "../react/styles/skins/minecraft.css";
import "../react/styles/skins/parchment.css";
import "../react/styles/skin-previews.css";
import "./schematic.css";

applyUiSkin();

const MIN_VIEW_WIDTH = 160;
const LABEL_OFFSET_Y = -28;
const PAN_THRESHOLD_PX = 4;
const POPOVER_MARGIN = 12;
const POPOVER_GAP = 10;
const MARKER_RADIUS = 28;
const LINE_STROKE_WIDTH = 5;
const LINE_GLOW_WIDTH = 16;
const LINE_HIT_WIDTH = 26;
const LINE_CORNER_RADIUS = 32;
const STATION_HIT_RADIUS = 22;
const STATION_DOT_RADIUS = 9;
const STATION_GLOW_RADIUS = 15;

/** @type {Map<string, { id: string, text: string, x: number, z: number }>} */
const poiById = new Map(
    (instanceCatalog.instances ?? []).map((instance) => [
        String(instance.id),
        {
            id: String(instance.id),
            text: String(instance.text ?? instance.id),
            x: Number(instance.point?.x),
            z: Number(instance.point?.z),
        },
    ]),
);

/**
 * @returns {string | null}
 */
function getFocusPoiId() {
    return new URLSearchParams(window.location.search).get("poi");
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * @param {Array<{ x: number, y: number }>} path
 * @param {number} radius
 * @param {Iterable<{ x: number, y: number }>} [stationPoints]
 * @returns {string}
 */
function pathToD(path, radius = LINE_CORNER_RADIUS, stationPoints = []) {
    if (path.length === 0) {
        return "";
    }
    if (path.length < 3 || radius <= 0) {
        return path.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    }

    const stationKeys = new Set(
        [...stationPoints].map((point) => `${Number(point.x)},${Number(point.y)}`),
    );
    const parts = [`M ${path[0].x} ${path[0].y}`];
    for (let index = 1; index < path.length - 1; index += 1) {
        const prev = path[index - 1];
        const curr = path[index];
        const next = path[index + 1];
        const inDx = curr.x - prev.x;
        const inDy = curr.y - prev.y;
        const outDx = next.x - curr.x;
        const outDy = next.y - curr.y;
        const inLen = Math.hypot(inDx, inDy);
        const outLen = Math.hypot(outDx, outDy);
        const corner = Math.min(radius, inLen / 2, outLen / 2);
        const isStationCorner = stationKeys.has(`${Number(curr.x)},${Number(curr.y)}`);
        if (corner < 1 || isStationCorner) {
            parts.push(`L ${curr.x} ${curr.y}`);
            continue;
        }
        parts.push(
            `L ${curr.x - (inDx / inLen) * corner} ${curr.y - (inDy / inLen) * corner}`,
            `Q ${curr.x} ${curr.y} ${curr.x + (outDx / outLen) * corner} ${curr.y + (outDy / outLen) * corner}`,
        );
    }
    const last = path[path.length - 1];
    parts.push(`L ${last.x} ${last.y}`);
    return parts.join(" ");
}

/**
 * @param {SVGSVGElement} svg
 * @param {{ x: number, y: number, w: number, h: number }} camera
 */
function applyViewBox(svg, camera) {
    svg.setAttribute("viewBox", `${camera.x} ${camera.y} ${camera.w} ${camera.h}`);
}

/**
 * @param {SVGSVGElement} svg
 * @param {{ x: number, y: number, w: number, h: number }} camera
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{ x: number, y: number }}
 */
function clientToWorld(svg, camera, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const relX = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width;
    const relY = rect.height === 0 ? 0 : (clientY - rect.top) / rect.height;
    return {
        x: camera.x + relX * camera.w,
        y: camera.y + relY * camera.h,
    };
}

/**
 * @param {SVGSVGElement} svg
 * @param {{ x: number, y: number, w: number, h: number }} camera
 * @param {number} schematicX
 * @param {number} schematicY
 * @returns {{ x: number, y: number }}
 */
function projectSchematicPoint(svg, camera, schematicX, schematicY) {
    const rect = svg.getBoundingClientRect();
    return {
        x: rect.left + ((schematicX - camera.x) / camera.w) * rect.width,
        y: rect.top + ((schematicY - camera.y) / camera.h) * rect.height,
    };
}

/**
 * @param {{ x: number, y: number }} anchor
 * @param {{ width: number, height: number }} size
 * @returns {{ left: number, top: number }}
 */
function computePopoverLayout(anchor, size) {
    const clampTop = (top) =>
        Math.min(window.innerHeight - POPOVER_MARGIN - size.height, Math.max(POPOVER_MARGIN, top));

    const rightLeft = anchor.x + MARKER_RADIUS + POPOVER_GAP;
    if (rightLeft + size.width <= window.innerWidth - POPOVER_MARGIN) {
        return { left: rightLeft, top: clampTop(anchor.y - size.height / 2) };
    }

    const leftLeft = anchor.x - MARKER_RADIUS - POPOVER_GAP - size.width;
    if (leftLeft >= POPOVER_MARGIN) {
        return { left: leftLeft, top: clampTop(anchor.y - size.height / 2) };
    }

    const topTop = anchor.y - MARKER_RADIUS - POPOVER_GAP - size.height;
    const centeredLeft = anchor.x - size.width / 2;
    return {
        left: Math.min(window.innerWidth - POPOVER_MARGIN - size.width, Math.max(POPOVER_MARGIN, centeredLeft)),
        top: clampTop(topTop),
    };
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @returns {string | null}
 */
function lineIdFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!(el instanceof Element)) {
        return null;
    }
    const hit = el.closest(".schematic-line-hit");
    if (hit instanceof SVGPathElement) {
        return hit.dataset.lineId ?? null;
    }
    const label = el.closest(".schematic-line-label");
    if (label instanceof HTMLElement) {
        return label.dataset.lineId ?? null;
    }
    return null;
}

/**
 * @param {Array<{ x: number, y: number }>} path
 * @param {Iterable<{ x: number, y: number }>} stations
 * @returns {{ x: number, y: number, horizontal: boolean } | null}
 */
function pickLineLabelAnchor(path, stations) {
    if (path.length < 2) {
        return null;
    }
    let best = null;
    for (let index = 0; index < path.length - 1; index += 1) {
        const start = path[index];
        const end = path[index + 1];
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        if (best == null || length > best.length) {
            best = { start, end, length };
        }
    }
    if (best == null || best.length < 1) {
        return null;
    }
    const horizontal = best.start.y === best.end.y;
    let t = 0.5;
    const stationList = [...stations];
    for (let step = 0; step < 4; step += 1) {
        const x = best.start.x + (best.end.x - best.start.x) * t;
        const y = best.start.y + (best.end.y - best.start.y) * t;
        const tooClose = stationList.some((station) => Math.hypot(station.x - x, station.y - y) < 48);
        if (!tooClose) {
            return { x, y, horizontal };
        }
        t = t < 0.5 ? Math.min(0.82, t + 0.16) : Math.max(0.18, t - 0.16);
    }
    return {
        x: best.start.x + (best.end.x - best.start.x) * t,
        y: best.start.y + (best.end.y - best.start.y) * t,
        horizontal,
    };
}

function stationFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!(el instanceof Element)) {
        return null;
    }
    const station = el.closest(".schematic-station");
    return station instanceof SVGGElement ? station : null;
}

function renderSchematic() {
    const root = document.getElementById("schematic-root");
    const detailEl = document.getElementById("schematic-detail");
    const scrimEl = document.getElementById("schematic-detail-scrim");
    const titleEl = detailEl?.querySelector(".schematic-detail-title");
    const orgPathEl = detailEl?.querySelector(".schematic-detail-org-path");
    const layerEl = detailEl?.querySelector(".schematic-detail-layer");
    const coordsEl = detailEl?.querySelector(".schematic-detail-coords");
    const linkEl = detailEl?.querySelector(".schematic-detail-link");
    const closeEl = detailEl?.querySelector(".schematic-detail-close");
    if (
        root == null ||
        detailEl == null ||
        scrimEl == null ||
        titleEl == null ||
        orgPathEl == null ||
        layerEl == null ||
        coordsEl == null ||
        linkEl == null ||
        closeEl == null
    ) {
        return;
    }
    if (!(linkEl instanceof HTMLAnchorElement)) {
        return;
    }

    const laidOut = layoutSchematic(instanceCatalog.instances ?? [], schematicCatalog);
    const viewWidth = laidOut.view.width;
    const viewHeight = laidOut.view.height;
    const focusPoiId = getFocusPoiId();
    const lines = laidOut.lines;
    /** @type {Map<string, { poiId: string, x: number, y: number }>} */
    const stationByPoiId = new Map(
        laidOut.stations.map((station) => [station.poiId, station]),
    );

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "schematic-svg");
    svg.setAttribute("role", "application");
    svg.setAttribute("aria-label", "轨道交通示意图");

    const camera = { x: 0, y: 0, w: viewWidth, h: viewHeight };
    const maxViewWidth = viewWidth * 2;
    applyViewBox(svg, camera);

    const focusStationPos = focusPoiId != null ? stationByPoiId.get(focusPoiId) : null;
    if (focusStationPos != null) {
        camera.w = viewWidth * 0.55;
        camera.h = viewHeight * 0.55;
        camera.x = focusStationPos.x - camera.w / 2;
        camera.y = focusStationPos.y - camera.h / 2;
        applyViewBox(svg, camera);
    }

    /**
     * @returns {number}
     */
    const screenSizeScale = () => camera.w / viewWidth;

    /** @type {SVGPathElement[]} */
    const lineEls = [];
    /** @type {SVGPathElement[]} */
    const lineGlowEls = [];
    /** @type {SVGPathElement[]} */
    const lineHitEls = [];

    const syncFixedSizes = () => {
        const scale = screenSizeScale();
        for (const lineEl of lineEls) {
            lineEl.setAttribute("stroke-width", String(LINE_STROKE_WIDTH * scale));
        }
        for (const glowEl of lineGlowEls) {
            glowEl.setAttribute("stroke-width", String(LINE_GLOW_WIDTH * scale));
        }
        for (const hitEl of lineHitEls) {
            hitEl.setAttribute("stroke-width", String(LINE_HIT_WIDTH * scale));
        }
        for (const group of stationEls.values()) {
            group.setAttribute(
                "transform",
                `translate(${group.dataset.schematicX} ${group.dataset.schematicY}) scale(${scale})`,
            );
        }
    };

    let syncLineLabels = () => {};

    const applyCamera = () => {
        applyViewBox(svg, camera);
        syncFixedSizes();
        syncLineLabels();
    };

    /** @type {Map<string, SVGGElement>} */
    const stationEls = new Map();

    /** @type {{ poiId: string, schematicX: number, schematicY: number } | null} */
    let openAnchor = null;

    const layoutDetail = () => {
        if (openAnchor == null || detailEl.hidden) {
            return;
        }
        const size = { width: detailEl.offsetWidth, height: detailEl.offsetHeight };
        const anchor = projectSchematicPoint(svg, camera, openAnchor.schematicX, openAnchor.schematicY);
        const layout = computePopoverLayout(anchor, size);
        detailEl.style.left = `${layout.left}px`;
        detailEl.style.top = `${layout.top}px`;
    };

    /**
     * @param {{ id: string, text: string, x: number, z: number } | null} poi
     * @param {{ schematicX: number, schematicY: number } | null} [anchor]
     */
    const openDetail = (poi, anchor = null) => {
        for (const el of stationEls.values()) {
            el.classList.toggle("is-highlighted", poi != null && el.dataset.poiId === poi.id);
        }
        if (poi == null) {
            openAnchor = null;
            detailEl.hidden = true;
            scrimEl.hidden = true;
            return;
        }

        const catalog = getPoiById(poi.id);
        const orgPath = getPoiOrgPath(poi.id);
        titleEl.textContent = poi.text;
        if (orgPath.length > 0) {
            orgPathEl.replaceChildren(
                ...orgPath.flatMap((name, index) => {
                    const nodes = [];
                    if (index > 0) {
                        const sep = document.createElement("span");
                        sep.className = "schematic-detail-org-sep";
                        sep.setAttribute("aria-hidden", "true");
                        sep.textContent = "›";
                        nodes.push(sep);
                    }
                    nodes.push(document.createTextNode(name));
                    return nodes;
                }),
            );
            orgPathEl.hidden = false;
        } else {
            orgPathEl.replaceChildren();
            orgPathEl.hidden = true;
        }
        layerEl.textContent = catalog?.layerName ?? "";
        coordsEl.textContent = `${poi.x}, ${poi.z}`;
        linkEl.href = satelliteUrl({
            x: poi.x,
            z: poi.z,
            zoom: SATELLITE_FOCUS_ZOOM,
            poi: poi.id,
        });

        const stationEl = stationEls.get(poi.id);
        openAnchor = {
            poiId: poi.id,
            schematicX: anchor?.schematicX ?? Number(stationEl?.dataset.schematicX),
            schematicY: anchor?.schematicY ?? Number(stationEl?.dataset.schematicY),
        };
        detailEl.hidden = false;
        scrimEl.hidden = false;
        window.requestAnimationFrame(layoutDetail);
    };

    /** @type {Map<string, string>} */
    const stationColorByPoiId = new Map();
    /** @type {Map<string, string[]>} */
    const stationLineIds = new Map();
    /** @type {Map<string, string>} */
    const lineColorById = new Map();
    let highlightedLineId = null;

    const setHighlightedLine = (lineId) => {
        highlightedLineId = lineId;
        const highlightColor = lineId != null ? lineColorById.get(lineId) : null;
        for (const glowEl of lineGlowEls) {
            glowEl.classList.toggle("is-highlighted", glowEl.dataset.lineId === lineId);
        }
        for (const label of lineLabels) {
            const selected = label.lineId === lineId;
            label.el.classList.toggle("is-highlighted", selected);
            label.el.setAttribute("aria-pressed", selected ? "true" : "false");
        }
        for (const [poiId, group] of stationEls) {
            const onLine = lineId != null && (stationLineIds.get(poiId) ?? []).includes(lineId);
            group.classList.toggle("is-line-highlighted", onLine);
            if (onLine && highlightColor != null) {
                group.style.setProperty("--highlight-fill", highlightColor);
            } else {
                group.style.removeProperty("--highlight-fill");
            }
        }
    };

    for (const line of lines) {
        const color = String(line.color ?? "");
        const lineId = String(line.id ?? "");
        if (lineId !== "" && color !== "") {
            lineColorById.set(lineId, color);
        }
        const path = line.path ?? [];
        const route = [];
        for (const entry of line.stations ?? []) {
            const poiId = typeof entry === "string" ? entry : String(entry.poiId);
            const pos = stationByPoiId.get(poiId);
            if (pos == null) {
                continue;
            }
            route.push(pos);
            const ids = stationLineIds.get(poiId) ?? [];
            ids.push(lineId);
            stationLineIds.set(poiId, ids);
            if (color !== "") {
                stationColorByPoiId.set(poiId, color);
            }
        }
        const linePath = path.length >= 2 ? path : route;
        if (linePath.length < 2) {
            continue;
        }
        const d = pathToD(linePath, LINE_CORNER_RADIUS, stationByPoiId.values());
        const stroke = color !== "" ? color : "currentColor";

        const glowEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        glowEl.setAttribute("class", "schematic-line-glow");
        glowEl.dataset.lineId = lineId;
        glowEl.setAttribute("d", d);
        glowEl.setAttribute("stroke", stroke);
        glowEl.setAttribute("stroke-width", String(LINE_GLOW_WIDTH));
        svg.appendChild(glowEl);
        lineGlowEls.push(glowEl);

        const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        lineEl.setAttribute("class", "schematic-line");
        lineEl.setAttribute("d", d);
        lineEl.setAttribute("stroke", stroke);
        lineEl.setAttribute("stroke-width", String(LINE_STROKE_WIDTH));
        svg.appendChild(lineEl);
        lineEls.push(lineEl);

        const hitEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hitEl.setAttribute("class", "schematic-line-hit");
        hitEl.dataset.lineId = lineId;
        hitEl.setAttribute("d", d);
        hitEl.setAttribute("stroke", "transparent");
        hitEl.setAttribute("stroke-width", String(LINE_HIT_WIDTH));
        svg.appendChild(hitEl);
        lineHitEls.push(hitEl);
    }

    const labelLayer = document.createElement("div");
    labelLayer.className = "schematic-line-labels";
    /** @type {Array<{ el: HTMLElement, lineId: string, x: number, y: number, horizontal: boolean }>} */
    const lineLabels = [];
    for (const line of lines) {
        const name = String(line.name ?? "").trim();
        const lineId = String(line.id ?? "");
        const linePath = line.path ?? [];
        if (name === "" || linePath.length < 2) {
            continue;
        }
        const anchor = pickLineLabelAnchor(linePath, stationByPoiId.values());
        if (anchor == null) {
            continue;
        }
        const color = String(line.color ?? "#1565c0");
        const labelEl = document.createElement("button");
        labelEl.type = "button";
        labelEl.className = "schematic-line-label";
        labelEl.dataset.lineId = lineId;
        labelEl.textContent = name;
        labelEl.style.setProperty("--line-fill", color);
        labelEl.setAttribute("aria-pressed", "false");
        labelEl.setAttribute("aria-label", `高亮${name}`);
        labelEl.addEventListener("click", () => {
            setHighlightedLine(highlightedLineId === lineId ? null : lineId);
        });
        labelLayer.appendChild(labelEl);
        lineLabels.push({
            el: labelEl,
            lineId,
            x: anchor.x,
            y: anchor.y,
            horizontal: anchor.horizontal,
        });
    }

    syncLineLabels = () => {
        const offset = 28;
        for (const label of lineLabels) {
            const point = projectSchematicPoint(svg, camera, label.x, label.y);
            const left = label.horizontal ? point.x : point.x - offset;
            const top = label.horizontal ? point.y - offset : point.y;
            label.el.style.left = `${left}px`;
            label.el.style.top = `${top}px`;
            label.el.style.transform = label.horizontal ? "translate(-50%, -100%)" : "translate(-100%, -50%)";
        }
    };

    for (const station of stationByPoiId.values()) {
        const poi = poiById.get(station.poiId);
        if (poi == null) {
            continue;
        }

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "schematic-station");
        group.dataset.poiId = poi.id;
        group.dataset.schematicX = String(station.x);
        group.dataset.schematicY = String(station.y);
        const lineColor = stationColorByPoiId.get(station.poiId);
        if (lineColor != null) {
            group.style.color = lineColor;
        }
        group.setAttribute("tabindex", "0");
        group.setAttribute("role", "button");
        group.setAttribute("aria-label", `${poi.text}详情`);

        const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        glow.setAttribute("class", "schematic-station-glow");
        glow.setAttribute("cx", "0");
        glow.setAttribute("cy", "0");
        glow.setAttribute("r", String(STATION_GLOW_RADIUS));

        const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hit.setAttribute("class", "schematic-station-hit");
        hit.setAttribute("cx", "0");
        hit.setAttribute("cy", "0");
        hit.setAttribute("r", String(STATION_HIT_RADIUS));

        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("class", "schematic-station-dot");
        dot.setAttribute("cx", "0");
        dot.setAttribute("cy", "0");
        dot.setAttribute("r", String(STATION_DOT_RADIUS));

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("class", "schematic-station-label");
        label.setAttribute("x", "0");
        label.setAttribute("y", String(LABEL_OFFSET_Y));
        label.textContent = poi.text;

        group.appendChild(glow);
        group.appendChild(hit);
        group.appendChild(dot);
        group.appendChild(label);

        group.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail(poi, { schematicX: station.x, schematicY: station.y });
            }
        });

        stationEls.set(poi.id, group);
        svg.appendChild(group);
    }

    syncFixedSizes();

    let pointerId = null;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let panning = false;

    svg.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
            return;
        }
        pointerId = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        startX = event.clientX;
        startY = event.clientY;
        panning = false;
    });

    svg.addEventListener("pointermove", (event) => {
        if (event.pointerId !== pointerId) {
            return;
        }
        const travel = Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY);
        if (!panning && travel > PAN_THRESHOLD_PX) {
            panning = true;
            svg.classList.add("is-panning");
            svg.setPointerCapture(event.pointerId);
        }
        if (!panning) {
            return;
        }
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return;
        }
        const dx = ((event.clientX - lastX) / rect.width) * camera.w;
        const dy = ((event.clientY - lastY) / rect.height) * camera.h;
        lastX = event.clientX;
        lastY = event.clientY;
        camera.x -= dx;
        camera.y -= dy;
        applyViewBox(svg, camera);
        syncLineLabels();
        layoutDetail();
    });

    const endPan = (event) => {
        if (event.pointerId !== pointerId) {
            return;
        }
        const didPan = panning;
        if (panning && svg.hasPointerCapture(event.pointerId)) {
            svg.releasePointerCapture(event.pointerId);
        }
        panning = false;
        pointerId = null;
        svg.classList.remove("is-panning");
        if (didPan) {
            return;
        }
        const station = stationFromPoint(event.clientX, event.clientY);
        const poiId = station?.dataset.poiId;
        if (poiId != null) {
            station.blur();
            openDetail(poiById.get(poiId) ?? null, {
                schematicX: Number(station.dataset.schematicX),
                schematicY: Number(station.dataset.schematicY),
            });
            return;
        }
        const lineId = lineIdFromPoint(event.clientX, event.clientY);
        if (lineId != null) {
            setHighlightedLine(highlightedLineId === lineId ? null : lineId);
            openDetail(null);
            return;
        }
        setHighlightedLine(null);
        openDetail(null);
    };

    svg.addEventListener("pointerup", endPan);
    svg.addEventListener("pointercancel", endPan);

    svg.addEventListener(
        "wheel",
        (event) => {
            event.preventDefault();
            const factor = event.deltaY > 0 ? 1.12 : 1 / 1.12;
            const nextW = clamp(camera.w * factor, MIN_VIEW_WIDTH, maxViewWidth);
            const scale = nextW / camera.w;
            const nextH = camera.h * scale;
            const focus = clientToWorld(svg, camera, event.clientX, event.clientY);
            camera.x = focus.x - (focus.x - camera.x) * scale;
            camera.y = focus.y - (focus.y - camera.y) * scale;
            camera.w = nextW;
            camera.h = nextH;
            applyCamera();
            layoutDetail();
        },
        { passive: false },
    );

    /**
     * @param {number} factor
     */
    const zoomBy = (factor) => {
        const rect = svg.getBoundingClientRect();
        const nextW = clamp(camera.w * factor, MIN_VIEW_WIDTH, maxViewWidth);
        const scale = nextW / camera.w;
        const nextH = camera.h * scale;
        const focus = clientToWorld(svg, camera, rect.left + rect.width / 2, rect.top + rect.height / 2);
        camera.x = focus.x - (focus.x - camera.x) * scale;
        camera.y = focus.y - (focus.y - camera.y) * scale;
        camera.w = nextW;
        camera.h = nextH;
        applyCamera();
        layoutDetail();
    };

    /**
     * @param {string} poiId
     */
    const focusStation = (poiId) => {
        const poi = poiById.get(poiId);
        const stationEl = stationEls.get(poiId);
        if (poi == null || stationEl == null) {
            return;
        }
        const schematicX = Number(stationEl.dataset.schematicX);
        const schematicY = Number(stationEl.dataset.schematicY);
        camera.w = viewWidth * 0.55;
        camera.h = viewHeight * 0.55;
        camera.x = schematicX - camera.w / 2;
        camera.y = schematicY - camera.h / 2;
        applyCamera();
        openDetail(poi, { schematicX, schematicY });
    };

    const closeDetail = () => openDetail(null);
    closeEl.addEventListener("click", closeDetail);
    scrimEl.addEventListener("click", closeDetail);
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }
        const searchPanel = document.getElementById("schematic-search");
        const settingsPanel = document.getElementById("schematic-settings");
        if (searchPanel != null && !searchPanel.hidden) {
            return;
        }
        if (settingsPanel != null && !settingsPanel.hidden) {
            return;
        }
        closeDetail();
    });
    window.addEventListener("resize", () => {
        syncLineLabels();
        layoutDetail();
    });

    root.replaceChildren(svg, labelLayer);
    window.requestAnimationFrame(syncLineLabels);

    bindSchematicControls({
        zoomBy,
        focusStation,
        stationIds: new Set(stationEls.keys()),
    });

    if (focusPoiId != null) {
        openDetail(poiById.get(focusPoiId) ?? null);
    }
}

renderSchematic();
