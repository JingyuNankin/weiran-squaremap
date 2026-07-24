import { Card, Divider, Slider, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { SIDE_PANEL } from "../../bridge/panelBridge.js";
import { getSettingsBridge } from "../../bridge/settingsBridge.js";
import { useSidePanelOpen } from "../../hooks/useSidePanelOpen.js";
import { getAppVersion } from "../../version/appVersion.js";
import { SkinPreviewCard } from "./SkinPreviewCard.jsx";
import "../../styles/skin-previews.css";
import "../../styles/settings-panel.css";

const SQUAREMAP_REPO_URL = "https://github.com/jpenilla/squaremap";

/**
 * @param {number} min
 * @param {number} max
 * @param {{ [key: number]: string }} [labels]
 */
function buildRangeMarks(min, max, labels) {
    /** @type {Record<number, string>} */
    const marks = {};
    for (let i = min; i <= max; i++) {
        marks[i] = labels?.[i] ?? String(i);
    }
    return marks;
}

export function SettingPanel() {
    const settingsBridge = getSettingsBridge();
    const open = useSidePanelOpen(SIDE_PANEL.SETTINGS);
    const [currentSkin, setCurrentSkin] = useState(settingsBridge.getCurrentSkin());
    const [brightnessLevel, setBrightnessLevel] = useState(settingsBridge.getBrightnessLevel());
    const [saturationLevel, setSaturationLevel] = useState(settingsBridge.getSaturationLevel());
    const skins = settingsBridge.getAvailableSkins();
    const appVersion = getAppVersion();

    const brightnessMin = settingsBridge.getBrightnessLevelMin();
    const brightnessMax = settingsBridge.getBrightnessLevelMax();
    const saturationMin = settingsBridge.getSaturationLevelMin();
    const saturationMax = settingsBridge.getSaturationLevelMax();

    const brightnessMarks = useMemo(
        () =>
            buildRangeMarks(brightnessMin, brightnessMax, {
                [brightnessMin]: String(brightnessMin),
                0: "0",
                [brightnessMax]: String(brightnessMax),
            }),
        [brightnessMin, brightnessMax],
    );

    const saturationMarks = useMemo(
        () =>
            buildRangeMarks(saturationMin, saturationMax, {
                0: "0",
                [saturationMax]: "6",
            }),
        [saturationMin, saturationMax],
    );

    useEffect(() => {
        return settingsBridge.subscribe(() => {
            setCurrentSkin(settingsBridge.getCurrentSkin());
            setBrightnessLevel(settingsBridge.getBrightnessLevel());
            setSaturationLevel(settingsBridge.getSaturationLevel());
        });
    }, [settingsBridge]);

    if (!open) {
        return null;
    }

    return (
        <Card className="settings-panel map-side-panel" size="small">
            <Typography.Text className="map-side-panel-section-title">主题</Typography.Text>
            <div className="settings-panel-skin-list" role="radiogroup" aria-label="主题">
                {skins.map((skin) => (
                    <SkinPreviewCard
                        key={skin.id}
                        skin={skin}
                        selected={currentSkin === skin.id}
                        onSelect={() => settingsBridge.setSkin(skin.id)}
                    />
                ))}
            </div>

            <Typography.Text className="map-side-panel-section-title settings-panel-filter-heading">
                地图滤镜
            </Typography.Text>
            <div className="settings-panel-filter">
                <div className="settings-panel-filter-row">
                    <Typography.Text className="settings-panel-filter-label">亮度</Typography.Text>
                    <Slider
                        className="settings-panel-filter-slider"
                        min={brightnessMin}
                        max={brightnessMax}
                        step={1}
                        marks={brightnessMarks}
                        value={brightnessLevel}
                        tooltip={{ formatter: (value) => String(value ?? 0) }}
                        onChange={(value) => settingsBridge.setBrightnessLevel(value)}
                    />
                </div>
                <div className="settings-panel-filter-row">
                    <Typography.Text className="settings-panel-filter-label">饱和度</Typography.Text>
                    <Slider
                        className="settings-panel-filter-slider"
                        min={saturationMin}
                        max={saturationMax}
                        step={1}
                        marks={saturationMarks}
                        value={saturationLevel}
                        tooltip={{
                            formatter: (value) => {
                                if (value === saturationMin) {
                                    return "黑白";
                                }
                                if (value === saturationMax) {
                                    return "正常";
                                }
                                return String(value ?? 0);
                            },
                        }}
                        onChange={(value) => settingsBridge.setSaturationLevel(value)}
                    />
                </div>
            </div>

            <Divider className="settings-panel-divider" />

            <section className="settings-panel-about" aria-label="关于">
                <Typography.Text className="map-side-panel-section-title">关于</Typography.Text>
                <div className="settings-panel-about-body">
                    <p className="settings-panel-about-name">蔚然GIS</p>
                    <p className="settings-panel-about-version" aria-label={`版本 ${appVersion.label}`}>
                        {appVersion.label}
                    </p>
                    {appVersion.builtAt != null && (
                        <p className="settings-panel-about-meta">构建于 {appVersion.builtAt}</p>
                    )}
                    <p className="settings-panel-about-meta">
                        基于{" "}
                        <a
                            className="settings-panel-about-link"
                            href={SQUAREMAP_REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Squaremap
                        </a>{" "}
                        开发
                    </p>
                    <p className="settings-panel-about-meta settings-panel-about-license">MIT License</p>
                </div>
            </section>
        </Card>
    );
}
