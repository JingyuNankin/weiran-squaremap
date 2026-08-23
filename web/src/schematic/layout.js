/**
 * @typedef {{ poiId: string, x: number, z: number }} WorldStation
 * @typedef {{ poiId: string, x: number, y: number }} SchematicStation
 * @typedef {{ gx: number, gz: number }} GridCell
 * @typedef {{
 *   worldGrid?: number,
 *   halfGrid?: number,
 *   cell?: number,
 *   padding?: number,
 * }} LayoutOptions
 */

const DEFAULT_LAYOUT = {
    worldGrid: 100,
    halfGrid: 50,
    cell: 80,
    padding: 80,
};

/**
 * @param {number} value
 * @param {number} step
 */
function snap(value, step) {
    return Math.round(value / step) * step;
}

/**
 * @param {number} gx
 * @param {number} gz
 */
function cellKey(gx, gz) {
    return `${gx},${gz}`;
}

/**
 * @param {number} radius
 * @param {number} step
 * @returns {Array<{ dx: number, dz: number }>}
 */
function ringOffsets(radius, step) {
    /** @type {Array<{ dx: number, dz: number }>} */
    const offsets = [];
    for (let ix = -radius; ix <= radius; ix += 1) {
        for (let iz = -radius; iz <= radius; iz += 1) {
            if (Math.max(Math.abs(ix), Math.abs(iz)) !== radius) {
                continue;
            }
            offsets.push({ dx: ix * step, dz: iz * step });
        }
    }
    return offsets;
}

/**
 * @param {GridCell} candidate
 * @param {WorldStation} station
 * @param {Map<string, GridCell>} placed
 * @param {Map<string, WorldStation>} worldById
 */
function orderViolations(candidate, station, placed, worldById) {
    let score = 0;
    for (const [poiId, cell] of placed) {
        const other = worldById.get(poiId);
        if (other == null) {
            continue;
        }
        const worldDx = station.x - other.x;
        const worldDz = station.z - other.z;
        const gridDx = candidate.gx - cell.gx;
        const gridDz = candidate.gz - cell.gz;
        if (worldDx !== 0 && gridDx !== 0 && Math.sign(worldDx) !== Math.sign(gridDx)) {
            score += 1;
        }
        if (worldDz !== 0 && gridDz !== 0 && Math.sign(worldDz) !== Math.sign(gridDz)) {
            score += 1;
        }
    }
    return score;
}

/**
 * @param {WorldStation} station
 * @param {GridCell} origin
 * @param {number} step
 * @param {number} maxRing
 * @param {Set<string>} occupied
 * @param {Map<string, GridCell>} placed
 * @param {Map<string, WorldStation>} worldById
 * @returns {GridCell | null}
 */
function pickCell(station, origin, step, maxRing, occupied, placed, worldById) {
    const tryCell = (gx, gz) => {
        if (occupied.has(cellKey(gx, gz))) {
            return null;
        }
        return { gx, gz };
    };

    const exact = tryCell(origin.gx, origin.gz);
    if (exact != null) {
        return exact;
    }

    for (let radius = 1; radius <= maxRing; radius += 1) {
        /** @type {Array<GridCell & { dist: number, violations: number }>} */
        const ring = [];
        for (const offset of ringOffsets(radius, step)) {
            const gx = origin.gx + offset.dx;
            const gz = origin.gz + offset.dz;
            if (occupied.has(cellKey(gx, gz))) {
                continue;
            }
            const candidate = { gx, gz };
            ring.push({
                ...candidate,
                dist: Math.hypot(station.x - gx, station.z - gz),
                violations: orderViolations(candidate, station, placed, worldById),
            });
        }
        if (ring.length === 0) {
            continue;
        }
        ring.sort((a, b) => a.violations - b.violations || a.dist - b.dist);
        return { gx: ring[0].gx, gz: ring[0].gz };
    }
    return null;
}

/**
 * @param {WorldStation[]} stations
 * @param {Required<LayoutOptions>} options
 * @returns {Map<string, GridCell>}
 */
function assignGridCells(stations, options) {
    /** @type {Map<string, WorldStation>} */
    const worldById = new Map(stations.map((station) => [station.poiId, station]));
    const ranked = stations
        .map((station) => {
            const gx = snap(station.x, options.worldGrid);
            const gz = snap(station.z, options.worldGrid);
            return {
                station,
                ideal: { gx, gz },
                dist: Math.hypot(station.x - gx, station.z - gz),
            };
        })
        .sort((a, b) => a.dist - b.dist || a.station.poiId.localeCompare(b.station.poiId));

    /** @type {Map<string, GridCell>} */
    const placed = new Map();
    const occupied = new Set();

    for (const entry of ranked) {
        const { station, ideal } = entry;
        let cell = pickCell(station, ideal, options.worldGrid, 2, occupied, placed, worldById);
        if (cell == null) {
            const halfOrigin = {
                gx: snap(station.x, options.halfGrid),
                gz: snap(station.z, options.halfGrid),
            };
            cell = pickCell(station, halfOrigin, options.halfGrid, 8, occupied, placed, worldById);
        }
        if (cell == null) {
            throw new Error(`无法为 ${station.poiId} 分配格点`);
        }
        placed.set(station.poiId, cell);
        occupied.add(cellKey(cell.gx, cell.gz));
    }
    return placed;
}

/**
 * @param {WorldStation[]} stations
 * @param {Map<string, GridCell>} placed
 * @param {Required<LayoutOptions>} options
 * @returns {SchematicStation[]}
 */
function compactStations(stations, placed, options) {
    const xs = [...new Set([...placed.values()].map((cell) => cell.gx))].sort((a, b) => a - b);
    const zs = [...new Set([...placed.values()].map((cell) => cell.gz))].sort((a, b) => a - b);
    const xIndex = new Map(xs.map((value, index) => [value, index]));
    const zIndex = new Map(zs.map((value, index) => [value, index]));
    return stations.map((station) => {
        const cell = placed.get(station.poiId);
        if (cell == null) {
            throw new Error(`缺少 ${station.poiId} 的格点`);
        }
        return {
            poiId: station.poiId,
            x: options.padding + (xIndex.get(cell.gx) ?? 0) * options.cell,
            y: options.padding + (zIndex.get(cell.gz) ?? 0) * options.cell,
        };
    });
}

/**
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number }} start
 * @param {{ x: number, y: number }} end
 */
function onOpenSegment(point, start, end) {
    if (start.x === end.x) {
        return (
            point.x === start.x &&
            point.y > Math.min(start.y, end.y) &&
            point.y < Math.max(start.y, end.y)
        );
    }
    if (start.y === end.y) {
        return (
            point.y === start.y &&
            point.x > Math.min(start.x, end.x) &&
            point.x < Math.max(start.x, end.x)
        );
    }
    return false;
}

/**
 * @param {Array<{ x: number, y: number }>} points
 * @param {SchematicStation} from
 * @param {SchematicStation} to
 * @param {SchematicStation[]} stations
 */
function pathStationHits(points, from, to, stations) {
    return stations.reduce((count, station) => {
        if (station.poiId === from.poiId || station.poiId === to.poiId) {
            return count;
        }
        for (let index = 0; index < points.length - 1; index += 1) {
            const start = points[index];
            const end = points[index + 1];
            const atVertex =
                (station.x === start.x && station.y === start.y) ||
                (station.x === end.x && station.y === end.y);
            if (atVertex || onOpenSegment(station, start, end)) {
                return count + 1;
            }
        }
        return count;
    }, 0);
}

/**
 * @param {SchematicStation} from
 * @param {SchematicStation} to
 */
function isAligned(from, to) {
    return from.x === to.x || from.y === to.y;
}

/**
 * @param {SchematicStation} from
 * @param {SchematicStation} to
 * @returns {Array<{ x: number, y: number }>}
 */
function alignedPath(from, to) {
    return [
        { x: from.x, y: from.y },
        { x: to.x, y: to.y },
    ];
}

/**
 * HV：先竖后横，沿行进入终点。
 * VH：先横后竖，沿列进入终点。
 *
 * @param {SchematicStation} from
 * @param {SchematicStation} to
 * @param {'HV' | 'VH'} type
 * @returns {Array<{ x: number, y: number }>}
 */
function lPath(from, to, type) {
    if (type === "HV") {
        return [
            { x: from.x, y: from.y },
            { x: from.x, y: to.y },
            { x: to.x, y: to.y },
        ];
    }
    return [
        { x: from.x, y: from.y },
        { x: to.x, y: from.y },
        { x: to.x, y: to.y },
    ];
}

/**
 * @param {SchematicStation} from
 * @param {SchematicStation} to
 * @param {'HV' | 'VH'} type
 * @returns {{ dx: number, dy: number }}
 */
function arrivalDir(from, to, type) {
    if (type === "HV") {
        return { dx: Math.sign(to.x - from.x), dy: 0 };
    }
    return { dx: 0, dy: Math.sign(to.y - from.y) };
}

/**
 * @param {SchematicStation} from
 * @param {SchematicStation} to
 * @param {'HV' | 'VH'} type
 * @returns {{ dx: number, dy: number }}
 */
function leaveDir(from, to, type) {
    if (type === "HV") {
        return { dx: 0, dy: Math.sign(to.y - from.y) };
    }
    return { dx: Math.sign(to.x - from.x), dy: 0 };
}

/**
 * @param {{ dx: number, dy: number }} incoming
 * @param {{ dx: number, dy: number }} outgoing
 */
function junctionPenalty(incoming, outgoing) {
    const dot = incoming.dx * outgoing.dx + incoming.dy * outgoing.dy;
    if (dot < 0) {
        return 100;
    }
    if (dot > 0) {
        return 0;
    }
    return 1;
}

/**
 * @param {SchematicStation} from
 * @param {SchematicStation} to
 * @param {SchematicStation[]} stations
 * @returns {Array<{ x: number, y: number }>}
 */
function bestLPath(from, to, stations) {
    const hv = lPath(from, to, "HV");
    const vh = lPath(from, to, "VH");
    return pathStationHits(hv, from, to, stations) <= pathStationHits(vh, from, to, stations)
        ? hv
        : vh;
}

/**
 * @param {SchematicStation} from
 * @param {SchematicStation} to
 * @param {SchematicStation[]} stations
 * @returns {Array<{ x: number, y: number }>}
 */
function sPath(from, to, stations) {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const candidates = [
        [
            { x: from.x, y: from.y },
            { x: midX, y: from.y },
            { x: midX, y: to.y },
            { x: to.x, y: to.y },
        ],
        [
            { x: from.x, y: from.y },
            { x: from.x, y: midY },
            { x: to.x, y: midY },
            { x: to.x, y: to.y },
        ],
    ];
    return candidates.reduce((best, candidate) =>
        pathStationHits(candidate, from, to, stations) < pathStationHits(best, from, to, stations)
            ? candidate
            : best,
    );
}

/**
 * @param {string} fromId
 * @param {string} toId
 */
function pairBendKey(fromId, toId) {
    return `${fromId}|${toId}`;
}

/**
 * @param {string} fromId
 * @param {string} toId
 * @param {Record<string, string> | undefined} bends
 * @returns {string | null}
 */
function pairBend(fromId, toId, bends) {
    if (bends == null) {
        return null;
    }
    return bends[pairBendKey(fromId, toId)] ?? bends[pairBendKey(toId, fromId)] ?? null;
}

/**
 * @param {SchematicStation[]} run
 * @param {SchematicStation[]} stations
 * @param {string | null} [bend]
 * @returns {Array<{ x: number, y: number }>}
 */
function routeSkewRun(run, stations, bend = null) {
    if (run.length < 2) {
        return [];
    }
    if (run.length === 2) {
        return bend === "L" ? bestLPath(run[0], run[1], stations) : sPath(run[0], run[1], stations);
    }

    /** @type {Array<'HV' | 'VH'>} */
    const phases = ["HV", "VH"];
    /** @type {{ score: number, path: Array<{ x: number, y: number }> } | null} */
    let best = null;
    for (const start of phases) {
        /** @type {Array<'HV' | 'VH'>} */
        const types = [];
        /** @type {Array<{ x: number, y: number }>} */
        const path = [];
        let score = 0;
        for (let index = 0; index < run.length - 1; index += 1) {
            const type = (index % 2 === 0) === (start === "HV") ? "HV" : "VH";
            types.push(type);
            const from = run[index];
            const to = run[index + 1];
            const segment = lPath(from, to, type);
            score += pathStationHits(segment, from, to, stations);
            if (path.length === 0) {
                path.push(...segment);
            } else {
                path.push(...segment.slice(1));
            }
        }
        for (let index = 1; index < run.length - 1; index += 1) {
            score += junctionPenalty(
                arrivalDir(run[index - 1], run[index], types[index - 1]),
                leaveDir(run[index], run[index + 1], types[index]),
            );
        }
        if (best == null || score < best.score) {
            best = { score, path };
        }
    }
    return best?.path ?? sPath(run[0], run[1], stations);
}

/**
 * @param {{ x: number, y: number }} curr
 * @param {{ x: number, y: number }} prev
 * @param {{ x: number, y: number }} next
 */
function isStrictlyBetween(curr, prev, next) {
    if (prev.x === curr.x && curr.x === next.x) {
        return curr.y > Math.min(prev.y, next.y) && curr.y < Math.max(prev.y, next.y);
    }
    if (prev.y === curr.y && curr.y === next.y) {
        return curr.x > Math.min(prev.x, next.x) && curr.x < Math.max(prev.x, next.x);
    }
    return false;
}

/**
 * @param {Array<{ x: number, y: number }>} path
 * @param {Iterable<{ x: number, y: number }>} [keepPoints]
 * @returns {Array<{ x: number, y: number }>}
 */
function simplifyOrthogonal(path, keepPoints = []) {
    if (path.length < 3) {
        return path;
    }
    const keep = new Set([...keepPoints].map((point) => `${point.x},${point.y}`));
    /** @type {Array<{ x: number, y: number }>} */
    const simplified = [path[0]];
    for (let index = 1; index < path.length - 1; index += 1) {
        const prev = simplified[simplified.length - 1];
        const curr = path[index];
        const next = path[index + 1];
        const mustKeep = keep.has(`${curr.x},${curr.y}`);
        if (!mustKeep && isStrictlyBetween(curr, prev, next)) {
            continue;
        }
        simplified.push(curr);
    }
    simplified.push(path[path.length - 1]);
    return simplified;
}

/**
 * @param {string[]} poiIds
 * @param {Map<string, SchematicStation>} stationByPoiId
 * @param {SchematicStation[]} stations
 * @param {Record<string, string> | undefined} [bends]
 * @returns {Array<{ x: number, y: number }>}
 */
function buildLinePath(poiIds, stationByPoiId, stations, bends) {
    const stops = poiIds
        .map((poiId) => stationByPoiId.get(poiId))
        .filter((station) => station != null);
    /** @type {Array<{ x: number, y: number }>} */
    const path = [];
    const append = (segment) => {
        if (segment.length === 0) {
            return;
        }
        if (path.length === 0) {
            path.push(...segment);
            return;
        }
        path.push(...segment.slice(1));
    };

    let index = 0;
    while (index < stops.length - 1) {
        const from = stops[index];
        const to = stops[index + 1];
        if (isAligned(from, to)) {
            append(alignedPath(from, to));
            index += 1;
            continue;
        }
        let end = index + 1;
        while (end < stops.length - 1 && !isAligned(stops[end], stops[end + 1])) {
            end += 1;
        }
        append(
            routeSkewRun(
                stops.slice(index, end + 1),
                stations,
                pairBend(from.poiId, stops[end].poiId, bends),
            ),
        );
        index = end;
    }
    return simplifyOrthogonal(path, stops);
}

/**
 * @param {unknown} entry
 */
function routePoiId(entry) {
    return typeof entry === "string" ? entry : String(entry?.poiId ?? "");
}

/**
 * @param {unknown} entries
 * @returns {string[]}
 */
function routePoiIds(entries) {
    if (!Array.isArray(entries)) {
        return [];
    }
    return entries.map(routePoiId).filter((id) => id !== "");
}

/**
 * @param {string[][]} routes
 * @returns {string[]}
 */
function uniqueRoutePoiIds(routes) {
    /** @type {string[]} */
    const ids = [];
    const seen = new Set();
    for (const route of routes) {
        for (const id of route) {
            if (seen.has(id)) {
                continue;
            }
            seen.add(id);
            ids.push(id);
        }
    }
    return ids;
}

/**
 * @param {{ stations?: unknown, branches?: unknown }} line
 * @returns {string[][]}
 */
function lineRoutes(line) {
    const main = routePoiIds(line.stations);
    const branches = Array.isArray(line.branches) ? line.branches.map(routePoiIds) : [];
    return main.length > 0 ? [main, ...branches.filter((route) => route.length >= 2)] : branches;
}

/**
 * @param {SchematicStation[]} stations
 * @param {Map<string, SchematicStation>} stationByPoiId
 * @param {Record<string, { row?: string, col?: string, rowShift?: number, colShift?: number }> | undefined} overrides
 * @param {number} cell
 */
function applyPositionOverrides(stations, stationByPoiId, overrides, cell) {
    if (overrides == null) {
        return;
    }
    const occupied = new Set(stations.map((station) => `${station.x},${station.y}`));
    for (const [poiId, rule] of Object.entries(overrides)) {
        const station = stationByPoiId.get(poiId);
        if (station == null || rule == null || typeof rule !== "object") {
            continue;
        }
        let nextX = station.x;
        let nextY = station.y;
        if (typeof rule.row === "string") {
            const ref = stationByPoiId.get(rule.row);
            if (ref != null) {
                nextY = ref.y;
            }
        }
        if (typeof rule.col === "string") {
            const ref = stationByPoiId.get(rule.col);
            if (ref != null) {
                nextX = ref.x;
            }
        }
        const rowShift = Number(rule.rowShift);
        const colShift = Number(rule.colShift);
        if (Number.isFinite(rowShift) && rowShift !== 0) {
            nextY += rowShift * cell;
        }
        if (Number.isFinite(colShift) && colShift !== 0) {
            nextX += colShift * cell;
        }
        const nextKey = `${nextX},${nextY}`;
        const prevKey = `${station.x},${station.y}`;
        if (nextKey !== prevKey && occupied.has(nextKey)) {
            continue;
        }
        occupied.delete(prevKey);
        occupied.add(nextKey);
        station.x = nextX;
        station.y = nextY;
    }
}

/**
 * @param {unknown} value
 * @returns {Required<LayoutOptions>}
 */
function resolveLayoutOptions(value) {
    const raw = value != null && typeof value === "object" ? /** @type {LayoutOptions} */ (value) : {};
    return {
        worldGrid: Number(raw.worldGrid) > 0 ? Number(raw.worldGrid) : DEFAULT_LAYOUT.worldGrid,
        halfGrid: Number(raw.halfGrid) > 0 ? Number(raw.halfGrid) : DEFAULT_LAYOUT.halfGrid,
        cell: Number(raw.cell) > 0 ? Number(raw.cell) : DEFAULT_LAYOUT.cell,
        padding: Number(raw.padding) >= 0 ? Number(raw.padding) : DEFAULT_LAYOUT.padding,
    };
}

/**
 * @param {'h' | 'v'} axis
 * @param {number} pos
 * @param {number} along
 * @param {number} offset
 */
function offsetPoint(axis, pos, along, offset) {
    if (axis === "v") {
        return { x: pos + offset, y: along };
    }
    return { x: along, y: pos + offset };
}

/**
 * @param {Array<{ x: number, y: number }>} path
 * @param {{ x: number, y: number }} point
 */
function pushUniquePoint(path, point) {
    const last = path[path.length - 1];
    if (last != null && last.x === point.x && last.y === point.y) {
        return;
    }
    path.push(point);
}

/**
 * @param {Array<{ x: number, y: number }>} path
 * @param {Array<{ axis: 'h' | 'v', pos: number, lo: number, hi: number, offset: number }>} atoms
 * @returns {Array<{ x: number, y: number }>}
 */
function offsetSinglePath(path, atoms) {
    if (path.length < 2) {
        return path.map((point) => ({ x: point.x, y: point.y }));
    }
    /** @type {Array<{ x: number, y: number }>} */
    const nextPath = [];
    for (let segIndex = 0; segIndex < path.length - 1; segIndex += 1) {
        const start = path[segIndex];
        const end = path[segIndex + 1];
        const axis = start.x === end.x && start.y !== end.y ? "v" : start.y === end.y && start.x !== end.x ? "h" : null;
        const pos = axis === "v" ? start.x : start.y;
        const from = axis === "v" ? start.y : start.x;
        const to = axis === "v" ? end.y : end.x;
        const segAtoms =
            axis == null
                ? []
                : atoms.filter((atom) => {
                      if (atom.axis !== axis || atom.pos !== pos) {
                          return false;
                      }
                      return atom.hi > Math.min(from, to) && atom.lo < Math.max(from, to);
                  });
        if (axis == null || segAtoms.length === 0) {
            pushUniquePoint(nextPath, { x: start.x, y: start.y });
            pushUniquePoint(nextPath, { x: end.x, y: end.y });
            continue;
        }
        const direction = Math.sign(to - from) || 1;
        const alongCuts = [...new Set([from, to, ...segAtoms.flatMap((atom) => [atom.lo, atom.hi])])]
            .filter((value) => value >= Math.min(from, to) && value <= Math.max(from, to))
            .sort((left, right) => direction * (left - right));
        for (let cutIndex = 0; cutIndex < alongCuts.length - 1; cutIndex += 1) {
            const alongStart = alongCuts[cutIndex];
            const alongEnd = alongCuts[cutIndex + 1];
            if (alongStart === alongEnd) {
                continue;
            }
            const mid = (alongStart + alongEnd) / 2;
            const atom = segAtoms.find((entry) => entry.lo < mid && mid < entry.hi);
            const offset = atom?.offset ?? 0;
            pushUniquePoint(nextPath, offsetPoint(axis, pos, alongStart, offset));
            pushUniquePoint(nextPath, offsetPoint(axis, pos, alongEnd, offset));
        }
    }
    return nextPath;
}

/**
 * @param {{
 *   path?: Array<{ x: number, y: number }>,
 *   paths?: Array<Array<{ x: number, y: number }>>,
 *   stops?: Array<{ x: number, y: number }>,
 *   routes?: Array<Array<{ x: number, y: number }>>,
 * }} line
 * @returns {Array<Array<{ x: number, y: number }>>}
 */
function lineStopRoutes(line) {
    if (Array.isArray(line.routes) && line.routes.length > 0) {
        return line.routes;
    }
    if (Array.isArray(line.stops) && line.stops.length > 0) {
        return [line.stops];
    }
    return [];
}

/**
 * @param {{
 *   path?: Array<{ x: number, y: number }>,
 *   paths?: Array<Array<{ x: number, y: number }>>,
 * }} line
 * @returns {Array<Array<{ x: number, y: number }>>}
 */
function lineDrawPaths(line) {
    if (Array.isArray(line.paths) && line.paths.length > 0) {
        return line.paths;
    }
    return [line.path ?? []];
}

/**
 * 仅对「相邻两站直连且重叠」的区间错开，折线拐角蹭过他线不算复线。
 *
 * @param {Array<{
 *   id?: string,
 *   path?: Array<{ x: number, y: number }>,
 *   paths?: Array<Array<{ x: number, y: number }>>,
 *   stops?: Array<{ x: number, y: number }>,
 *   routes?: Array<Array<{ x: number, y: number }>>,
 * }>} lines
 * @param {number} spacing
 * @returns {Array<{
 *   id?: string,
 *   path: Array<{ x: number, y: number }>,
 *   paths: Array<Array<{ x: number, y: number }>>,
 * }>}
 */
export function offsetDuplicateLinePaths(lines, spacing) {
    /** @type {Array<{ lineIndex: number, axis: 'h' | 'v', pos: number, from: number, to: number }>} */
    const segments = [];
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        for (const stops of lineStopRoutes(lines[lineIndex])) {
            for (let index = 0; index < stops.length - 1; index += 1) {
                const start = stops[index];
                const end = stops[index + 1];
                if (start.x === end.x && start.y !== end.y) {
                    segments.push({
                        lineIndex,
                        axis: "v",
                        pos: start.x,
                        from: start.y,
                        to: end.y,
                    });
                } else if (start.y === end.y && start.x !== end.x) {
                    segments.push({
                        lineIndex,
                        axis: "h",
                        pos: start.y,
                        from: start.x,
                        to: end.x,
                    });
                }
            }
        }
    }

    /** @type {Map<string, typeof segments>} */
    const groups = new Map();
    for (const segment of segments) {
        const key = `${segment.axis}:${segment.pos}`;
        const group = groups.get(key) ?? [];
        group.push(segment);
        groups.set(key, group);
    }

    /** @type {Array<Array<{ axis: 'h' | 'v', pos: number, lo: number, hi: number, offset: number }>>} */
    const lookups = lines.map(() => []);

    for (const group of groups.values()) {
        const cuts = [...new Set(group.flatMap((segment) => [segment.from, segment.to]))].sort(
            (left, right) => left - right,
        );
        for (let index = 0; index < cuts.length - 1; index += 1) {
            const lo = cuts[index];
            const hi = cuts[index + 1];
            if (hi <= lo) {
                continue;
            }
            const covered = group.filter((segment) => {
                const start = Math.min(segment.from, segment.to);
                const end = Math.max(segment.from, segment.to);
                return start <= lo && hi <= end;
            });
            const uniqueLines = [...new Set(covered.map((segment) => segment.lineIndex))].sort(
                (left, right) => left - right,
            );
            if (uniqueLines.length < 2) {
                continue;
            }
            for (const lineIndex of uniqueLines) {
                const rank = uniqueLines.indexOf(lineIndex);
                lookups[lineIndex].push({
                    axis: group[0].axis,
                    pos: group[0].pos,
                    lo,
                    hi,
                    offset: (rank - (uniqueLines.length - 1) / 2) * spacing,
                });
            }
        }
    }

    return lines.map((line, lineIndex) => {
        const atoms = lookups[lineIndex];
        const nextPaths = lineDrawPaths(line).map((path) => offsetSinglePath(path, atoms));
        return {
            ...line,
            path: nextPaths[0] ?? [],
            paths: nextPaths,
        };
    });
}

/**
 * @param {Array<{ layer?: string, id?: string, point?: { x?: number, z?: number } }>} instances
 * @param {{
 *   layout?: LayoutOptions,
 *   overrides?: Record<string, { row?: string, col?: string, rowShift?: number, colShift?: number }>,
 *   bends?: Record<string, string>,
 *   lines?: Array<{ id?: string, name?: string, color?: string, style?: string, stations?: string[], branches?: string[][] }>,
 * }} catalog
 */
export function layoutSchematic(instances, catalog) {
    const options = resolveLayoutOptions(catalog.layout);
    /** @type {WorldStation[]} */
    const worldStations = [];
    for (const instance of instances) {
        if (instance.layer !== "railway-station" || instance.id == null) {
            continue;
        }
        worldStations.push({
            poiId: String(instance.id),
            x: Number(instance.point?.x),
            z: Number(instance.point?.z),
        });
    }

    const placed = assignGridCells(worldStations, options);
    const stations = compactStations(worldStations, placed, options);
    /** @type {Map<string, SchematicStation>} */
    const stationByPoiId = new Map(stations.map((station) => [station.poiId, station]));
    applyPositionOverrides(stations, stationByPoiId, catalog.overrides, options.cell);

    const lines = (catalog.lines ?? []).map((line) => {
        const routes = lineRoutes(line);
        const paths = routes
            .map((poiIds) => buildLinePath(poiIds, stationByPoiId, stations, catalog.bends))
            .filter((path) => path.length >= 2);
        return {
            id: String(line.id ?? ""),
            name: String(line.name ?? ""),
            color: String(line.color ?? ""),
            style: String(line.style ?? "rail"),
            stations: uniqueRoutePoiIds(routes),
            routes,
            path: paths[0] ?? [],
            paths,
        };
    });

    const maxX = stations.reduce((max, station) => Math.max(max, station.x), options.padding);
    const maxY = stations.reduce((max, station) => Math.max(max, station.y), options.padding);
    return {
        stations,
        lines,
        view: {
            width: maxX + options.padding,
            height: maxY + options.padding,
        },
    };
}
