import { getAppVersion } from "../react/version/appVersion.js";
import { getSearchablePois, searchPois } from "../react/search/poiCatalog.js";
import { applyUiSkin, getCurrentUiSkin, UI_SKINS } from "../react/theme/applyUiSkin.js";
import { SKIN_PREVIEW_TOKENS } from "../react/theme/skinPreviews.js";
import { satelliteUrl } from "../shared/mapLinks.js";

/**
 * @param {string} name
 */
function schematicStationName(name) {
    return String(name ?? "").replace(/站$/, "");
}

/**
 * @param {{
 *   zoomBy: (factor: number) => void,
 *   focusStation: (id: string) => void,
 *   stationIds: Set<string>,
 * }} api
 */
export function bindSchematicControls(api) {
    const zoomInBtn = document.querySelector('[data-zoom="in"]');
    const zoomOutBtn = document.querySelector('[data-zoom="out"]');
    const searchBtn = document.querySelector('.schematic-tool-btn[data-panel="search"]');
    const settingsBtn = document.querySelector('.schematic-tool-btn[data-panel="settings"]');
    const satelliteLink = document.getElementById("schematic-satellite-link");
    const searchPanel = document.getElementById("schematic-search");
    const searchInput = document.getElementById("schematic-search-input");
    const searchResults = document.getElementById("schematic-search-results");
    const settingsPanel = document.getElementById("schematic-settings");
    const versionEl = document.getElementById("schematic-settings-version");
    const builtEl = document.getElementById("schematic-settings-built");
    const skinList = document.getElementById("schematic-skin-list");

    if (
        !(zoomInBtn instanceof HTMLButtonElement) ||
        !(zoomOutBtn instanceof HTMLButtonElement) ||
        !(searchBtn instanceof HTMLButtonElement) ||
        !(settingsBtn instanceof HTMLButtonElement) ||
        !(satelliteLink instanceof HTMLAnchorElement) ||
        searchPanel == null ||
        !(searchInput instanceof HTMLInputElement) ||
        searchResults == null ||
        settingsPanel == null ||
        versionEl == null ||
        builtEl == null ||
        skinList == null
    ) {
        return;
    }

    satelliteLink.href = satelliteUrl();

    const syncSkinSelection = () => {
        const current = getCurrentUiSkin();
        for (const card of skinList.querySelectorAll(".skin-preview-card")) {
            if (!(card instanceof HTMLButtonElement)) {
                continue;
            }
            const selected = card.dataset.preview === current;
            card.classList.toggle("is-selected", selected);
            card.setAttribute("aria-pressed", selected ? "true" : "false");
        }
    };

    const fragment = document.createDocumentFragment();
    for (const skin of UI_SKINS) {
        const tokens = SKIN_PREVIEW_TOKENS[skin.id];
        if (tokens == null) {
            continue;
        }
        const card = document.createElement("button");
        card.type = "button";
        card.className = "skin-preview-card";
        card.dataset.preview = skin.id;
        card.setAttribute("aria-label", `主题：${skin.label}`);
        card.style.setProperty("--skin-preview-bg", tokens.bg);
        card.style.setProperty("--skin-preview-border", tokens.border);
        card.style.setProperty("--skin-preview-text", tokens.text);
        card.style.setProperty("--skin-preview-text-muted", tokens.textMuted);
        card.style.setProperty("--skin-preview-primary", tokens.primary);
        card.style.setProperty("--skin-preview-shadow", tokens.shadow);
        card.innerHTML =
            '<span class="skin-preview-mock" aria-hidden="true">' +
            '<span class="skin-preview-mock-toolbar">' +
            '<span class="skin-preview-mock-btn"></span>' +
            '<span class="skin-preview-mock-btn skin-preview-mock-btn-primary"></span>' +
            "</span>" +
            '<span class="skin-preview-mock-panel">' +
            '<span class="skin-preview-mock-line skin-preview-mock-line-short"></span>' +
            '<span class="skin-preview-mock-line"></span>' +
            "</span></span>" +
            `<span class="skin-preview-label">${skin.label}</span>`;
        card.addEventListener("click", () => {
            applyUiSkin(skin.id);
            syncSkinSelection();
        });
        fragment.appendChild(card);
    }
    skinList.replaceChildren(fragment);
    syncSkinSelection();

    const version = getAppVersion();
    versionEl.textContent = version.label;
    versionEl.setAttribute("aria-label", `版本 ${version.label}`);
    if (version.builtAt != null) {
        builtEl.textContent = `构建于 ${version.builtAt}`;
        builtEl.hidden = false;
    }

    const schematicPois = getSearchablePois().filter(
        (poi) => poi.onSchematic && api.stationIds.has(poi.id),
    );

    /** @type {'search' | 'settings' | null} */
    let activePanel = null;

    /**
     * @param {'search' | 'settings' | null} panel
     */
    const setPanel = (panel) => {
        activePanel = panel;
        searchBtn.classList.toggle("is-active", panel === "search");
        searchBtn.setAttribute("aria-expanded", panel === "search" ? "true" : "false");
        settingsBtn.classList.toggle("is-active", panel === "settings");
        settingsBtn.setAttribute("aria-expanded", panel === "settings" ? "true" : "false");
        searchPanel.hidden = panel !== "search";
        settingsPanel.hidden = panel !== "settings";
        if (panel !== "search") {
            searchInput.value = "";
            searchResults.replaceChildren();
            searchResults.hidden = true;
        } else {
            window.requestAnimationFrame(() => searchInput.focus());
        }
    };

    /**
     * @param {'search' | 'settings'} panel
     */
    const togglePanel = (panel) => {
        setPanel(activePanel === panel ? null : panel);
    };

    const renderResults = () => {
        const query = searchInput.value;
        const matched = searchPois(query, schematicPois);
        const hasQuery = query.trim() !== "";
        searchResults.hidden = !hasQuery;
        searchPanel.classList.toggle("has-results", hasQuery);
        if (!hasQuery) {
            searchResults.replaceChildren();
            return;
        }
        if (matched.length === 0) {
            const empty = document.createElement("p");
            empty.className = "schematic-search-empty";
            empty.textContent = "未找到匹配结果";
            searchResults.replaceChildren(empty);
            return;
        }
        const fragment = document.createDocumentFragment();
        for (const poi of matched) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "schematic-search-item";
            button.setAttribute("role", "option");
            const name = document.createElement("span");
            name.className = "schematic-search-item-name";
            name.textContent = schematicStationName(poi.name);
            const meta = document.createElement("span");
            meta.className = "schematic-search-item-meta";
            meta.textContent = poi.layerName;
            button.append(name, meta);
            button.addEventListener("click", () => {
                setPanel(null);
                api.focusStation(poi.id);
            });
            fragment.appendChild(button);
        }
        searchResults.replaceChildren(fragment);
    };

    zoomInBtn.addEventListener("click", () => api.zoomBy(1 / 1.12));
    zoomOutBtn.addEventListener("click", () => api.zoomBy(1.12));
    searchBtn.addEventListener("click", () => togglePanel("search"));
    settingsBtn.addEventListener("click", () => togglePanel("settings"));
    searchInput.addEventListener("input", renderResults);

    searchPanel.addEventListener("click", (event) => {
        if (event.target === searchPanel) {
            setPanel(null);
        }
    });
    searchPanel.querySelector(".schematic-search-shell")?.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }
        if (activePanel != null) {
            setPanel(null);
            event.stopPropagation();
        }
    });
}
