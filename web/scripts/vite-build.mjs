import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(webRoot, "../common/build/web");

/**
 * @param {string} dir
 * @returns {number}
 */
function dirSizeBytes(dir) {
    let total = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const next = join(dir, entry.name);
        if (entry.isDirectory()) {
            total += dirSizeBytes(next);
        } else {
            total += statSync(next).size;
        }
    }
    return total;
}

/**
 * @param {number} bytes
 */
function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 ** 2) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 ** 3) {
        return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
    }
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * @param {number} ms
 */
function formatDuration(ms) {
    const seconds = ms / 1000;
    if (seconds < 60) {
        return `${seconds.toFixed(1)} 秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const rest = (seconds % 60).toFixed(1);
    return `${minutes} 分 ${rest} 秒`;
}

/**
 * @param {Date} date
 */
function formatDateTime(date) {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

const startedAt = Date.now();
const viteBin = join(webRoot, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");
const result = spawnSync(viteBin, ["build", "--emptyOutDir"], {
    cwd: webRoot,
    stdio: "inherit",
});

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

const finishedAt = new Date();
const sizeBytes = dirSizeBytes(outDir);
const lines = [
    "打包完成",
    `结束时间  ${formatDateTime(finishedAt)}`,
    `耗时      ${formatDuration(finishedAt.getTime() - startedAt)}`,
    `产物体积  ${formatBytes(sizeBytes)}`,
    `产物路径  ${outDir}`,
];

process.stdout.write(`\x1b[32m\n${lines.join("\n")}\n\x1b[0m`);
