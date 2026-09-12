import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

function empty() {
  return { wallets: {}, ips: {}, weekStart: weekKey(Date.now()), weekSpent: 0 };
}

function weekKey(ms) {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(config.claimsFile, "utf8"));
    return {
      wallets: raw.wallets && typeof raw.wallets === "object" ? raw.wallets : {},
      ips: raw.ips && typeof raw.ips === "object" ? raw.ips : {},
      weekStart: raw.weekStart || weekKey(Date.now()),
      weekSpent: Number(raw.weekSpent) || 0,
    };
  } catch {
    return empty();
  }
}

function save(state) {
  fs.mkdirSync(path.dirname(config.claimsFile), { recursive: true });
  fs.writeFileSync(config.claimsFile, JSON.stringify(state, null, 2));
}

let state = load();

function rollWeek(now = Date.now()) {
  const key = weekKey(now);
  if (state.weekStart !== key) {
    state.weekStart = key;
    state.weekSpent = 0;
  }
}

function prune(map, windowMs, now) {
  const cutoff = now - windowMs;
  for (const [k, ts] of Object.entries(map)) {
    if (Number(ts) < cutoff) delete map[k];
  }
}

export const store = {
  canWallet(address, now = Date.now()) {
    const ts = Number(state.wallets[address] || 0);
    return !ts || now - ts >= config.walletWindowMs;
  },
  canIp(ip, now = Date.now()) {
    prune(state.ips, config.ipWindowMs, now);
    const hits = Object.entries(state.ips).filter(([k]) => k.startsWith(`${ip}#`) || k === ip);
    return hits.length < config.ipRateLimit;
  },
  remainingWeek(now = Date.now()) {
    rollWeek(now);
    return Math.max(0, config.weeklyBudget - state.weekSpent);
  },
  record({ address, ip, amount, now = Date.now() }) {
    rollWeek(now);
    state.wallets[address] = now;
    state.ips[`${ip}#${now}`] = now;
    state.weekSpent += Number(amount) || 0;
    prune(state.ips, config.ipWindowMs, now);
    save(state);
  },
  snapshot(now = Date.now()) {
    rollWeek(now);
    return {
      claimedWallets: Object.keys(state.wallets).length,
      weekStart: state.weekStart,
      weekSpent: state.weekSpent,
      remainingThisWeek: store.remainingWeek(now),
    };
  },
};
