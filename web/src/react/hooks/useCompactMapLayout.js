import { useEffect, useState } from "react";
import { isCompactLayout, subscribeUiLayout } from "../../shared/uiLayout.js";

/**
 * @returns {boolean}
 */
export function useCompactMapLayout() {
    const [compact, setCompact] = useState(() => isCompactLayout());

    useEffect(() => subscribeUiLayout(setCompact), []);

    return compact;
}
