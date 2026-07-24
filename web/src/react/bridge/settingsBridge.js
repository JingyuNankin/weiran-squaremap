import { applyUiSkin, getCurrentUiSkin, UI_SKINS } from "../theme/applyUiSkin.js";
import {
    getBrightnessLevel,
    getBrightnessLevelMax,
    getBrightnessLevelMin,
    getSaturationLevel,
    getSaturationLevelMax,
    getSaturationLevelMin,
    loadFilterForSkin,
    setBrightnessLevel,
    setSaturationLevel,
} from "./mapFilterBridge.js";
import { getPanelBridge, SIDE_PANEL } from "./panelBridge.js";

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
    for (const listener of listeners) {
        listener();
    }
}

export function getSettingsBridge() {
    return {
        isSettingsPanelOpen() {
            return getPanelBridge().isOpen(SIDE_PANEL.SETTINGS);
        },
        toggleSettingsPanel() {
            getPanelBridge().toggle(SIDE_PANEL.SETTINGS);
        },
        collapseSettingsPanel() {
            getPanelBridge().collapse(SIDE_PANEL.SETTINGS);
        },
        /**
         * @returns {typeof UI_SKINS}
         */
        getAvailableSkins() {
            return UI_SKINS;
        },
        getCurrentSkin() {
            return getCurrentUiSkin();
        },
        /**
         * @param {string} skinId
         */
        setSkin(skinId) {
            applyUiSkin(skinId);
            loadFilterForSkin(skinId);
            notify();
        },
        getBrightnessLevelMin() {
            return getBrightnessLevelMin();
        },
        getBrightnessLevelMax() {
            return getBrightnessLevelMax();
        },
        getSaturationLevelMin() {
            return getSaturationLevelMin();
        },
        getSaturationLevelMax() {
            return getSaturationLevelMax();
        },
        getBrightnessLevel() {
            return getBrightnessLevel();
        },
        getSaturationLevel() {
            return getSaturationLevel();
        },
        setBrightnessLevel(level) {
            setBrightnessLevel(level);
            notify();
        },
        setSaturationLevel(level) {
            setSaturationLevel(level);
            notify();
        },
        /**
         * @param {() => void} listener
         * @returns {() => void}
         */
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
