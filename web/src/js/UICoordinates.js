import { S } from "./Squaremap.js";
import { registerUICoordinates } from "../react/bridge/coordinatesBridge.js";

class UICoordinates {
    /** @type {boolean} */
    showCoordinates;

    /** @type {boolean} */
    enabled;

    /** @type {string} */
    html;

    /** @type {{ x: number | string, z: number | string }} */
    coords;

    /** @type {(() => void) | null} */
    _onChange = null;

    /**
     * @param {Settings_UI_Coordinates} json
     * @param {boolean} show
     */
    constructor(json, show) {
        this.showCoordinates = show;
        this.enabled = json.enabled !== false;
        this.html = json.html == null ? "undefined" : json.html;
        this.coords = { x: "---", z: "---" };

        S.map.addEventListener("mousemove", (event) => {
            if (S.worldList.curWorld != null) {
                this.update(S.toPoint(event.latlng));
            }
        });

        S.map.addEventListener("contextmenu", (event) => {
            event.originalEvent?.preventDefault();
            if (!isBlankMapTarget(event.originalEvent?.target) || S.worldList.curWorld == null) {
                return;
            }
            const point = S.toPoint(event.latlng);
            copyCoordinates(Math.floor(point.x), Math.floor(point.y));
        });

        this.update(null);
        registerUICoordinates(this);
    }

    /**
     * @param {() => void} listener
     */
    onChange(listener) {
        this._onChange = listener;
    }

    /**
     * @param {import("leaflet").Point | null} point
     */
    update(point) {
        this.coords.x = point == null ? "---" : Math.floor(point.x);
        this.coords.z = point == null ? "---" : Math.floor(point.y);
        this._onChange?.();
    }

    getFormattedHtml() {
        return this.html.replace(/{x}/g, String(this.coords.x)).replace(/{z}/g, String(this.coords.z));
    }

    isVisible() {
        return this.enabled && this.showCoordinates;
    }
}

const NON_BLANK_SELECTOR = [
    ".weiran-poi",
    ".leaflet-marker-icon",
    ".leaflet-tooltip",
    ".leaflet-popup",
    ".leaflet-control",
    ".nameplate-container",
].join(", ");

/**
 * @param {EventTarget | null | undefined} target
 * @returns {boolean}
 */
function isBlankMapTarget(target) {
    return !(target instanceof Element) || target.closest(NON_BLANK_SELECTOR) == null;
}

/** @type {number} */
let copyToastTimer = 0;

/**
 * @param {number} x
 * @param {number} z
 */
function copyCoordinates(x, z) {
    const text = `${x}, ${z}`;
    const write =
        navigator.clipboard?.writeText != null
            ? navigator.clipboard.writeText(text)
            : Promise.reject(new Error("clipboard unavailable"));
    write
        .catch(() => {
            const input = document.createElement("textarea");
            input.value = text;
            input.setAttribute("readonly", "");
            input.style.position = "fixed";
            input.style.left = "-9999px";
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            input.remove();
        })
        .finally(() => {
            showCopyToast(`已复制 ${text}`);
        });
}

/**
 * @param {string} message
 */
function showCopyToast(message) {
    let toast = document.getElementById("map-copy-toast");
    if (!(toast instanceof HTMLElement)) {
        toast = document.createElement("div");
        toast.id = "map-copy-toast";
        toast.className = "map-copy-toast";
        toast.setAttribute("role", "status");
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(copyToastTimer);
    copyToastTimer = window.setTimeout(() => {
        toast.hidden = true;
    }, 1600);
}

export { UICoordinates };
