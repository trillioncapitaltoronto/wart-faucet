import { config } from "./config.js";

const MAX_KEYS = 2000;
const GC_INTERVAL_MS = 5 * 60_000;
const BUCKETS = new Map();

function bucketKey(ip) {
  if (!ip) return "unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `v6/${parts.slice(0, 3).join(":")}/48`;
  }
  return `v4/${ip}`;
}

function prune(arr, now) {
  const cutoff = now - config.ipWindowMs;
  return arr.filter((ts) => ts > cutoff);
}

function evict() {
  while (BUCKETS.size > MAX_KEYS) {
    const oldest = BUCKETS.keys().next().value;
    if (oldest === undefined) break;
    BUCKETS.delete(oldest);
  }
}

function gc(now = Date.now()) {
  for (const [key, arr] of BUCKETS) {
    if (!arr.length || arr[arr.length - 1] <= now - config.ipWindowMs) BUCKETS.delete(key);
  }
}

export const ratelimit = {
  check(ip, now = Date.now()) {
    const key = bucketKey(ip);
    const arr = prune(BUCKETS.get(key) || [], now);
    BUCKETS.set(key, arr);
    evict();
    return arr.length < config.ipRateLimit;
  },
  record(ip, now = Date.now()) {
    const key = bucketKey(ip);
    const arr = prune(BUCKETS.get(key) || [], now);
    arr.push(now);
    BUCKETS.set(key, arr);
    evict();
  },
  retryAfterSeconds(ip, now = Date.now()) {
    const arr = prune(BUCKETS.get(bucketKey(ip)) || [], now);
    if (arr.length < config.ipRateLimit) return 0;
    return Math.max(1, Math.ceil((arr[0] + config.ipWindowMs - now) / 1000));
  },
  startGc() {
    const t = setInterval(gc, GC_INTERVAL_MS);
    if (typeof t.unref === "function") t.unref();
  },
};
