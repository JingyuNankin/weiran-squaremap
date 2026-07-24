import { buildColoredMakiIconSvg, resolveMakiIcon } from "../../../js/util/makiIcons.js";

/**
 * @param {{
 *   icon: string | null | undefined,
 *   color: string,
 *   size?: number,
 *   className?: string,
 * }} props
 */
export function MakiIcon({ icon, color, size = 12, className }) {
    if (icon == null || icon === "") {
        return null;
    }

    const svgHtml = buildColoredMakiIconSvg(icon, color, size);
    if (svgHtml != null) {
        return (
            <span
                className={["weiran-maki-icon", className].filter(Boolean).join(" ")}
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
        );
    }

    const url = resolveMakiIcon(icon);
    if (url == null || url === "") {
        return null;
    }

    return (
        <img
            className={className}
            src={url}
            alt=""
            width={size}
            height={size}
            draggable={false}
        />
    );
}
