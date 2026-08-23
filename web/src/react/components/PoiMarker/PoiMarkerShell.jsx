/**
 * POI 标记外壳：统一 data 属性与高亮 class。
 * --weiran-map-poi-accent 仅地点类（iconWithText）使用；地名类走 --weiran-map-poi-geo-*。
 *
 * @param {{
 *   id: string,
 *   layerKey: string,
 *   variant: "label" | "iconWithText",
 *   highlighted?: boolean,
 *   color?: string | null,
 *   className?: string,
 *   onClick?: () => void,
 *   children: import("react").ReactNode,
 * }} props
 */
export function PoiMarkerShell({ id, layerKey, variant, highlighted, color, className, onClick, children }) {
    /** @type {import("react").CSSProperties} */
    const style = color != null && color !== "" ? { "--weiran-map-poi-accent": color } : {};

    return (
        <div
            className={["weiran-poi", className, highlighted ? "weiran-poi--highlighted" : ""]
                .filter(Boolean)
                .join(" ")}
            data-poi-id={id}
            data-layer-key={layerKey}
            data-variant={variant}
            data-highlighted={highlighted ? "true" : "false"}
            style={style}
            onClick={
                onClick != null
                    ? (event) => {
                          event.stopPropagation();
                          onClick();
                      }
                    : undefined
            }
            onKeyDown={
                onClick != null
                    ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              onClick();
                          }
                      }
                    : undefined
            }
            role={onClick != null ? "button" : undefined}
            tabIndex={onClick != null ? 0 : undefined}
        >
            {children}
        </div>
    );
}
