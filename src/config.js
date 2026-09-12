import { Account } from "warthog-js";

function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing required env var: ${name}`);
  return String(v).trim();
}

function intOr(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function numOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

let cached;

export function getConfig() {
  if (cached) return cached;

  const hexPrivKey = required("FAUCET_HEX_PRIVKEY").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hexPrivKey)) {
    throw new Error("FAUCET_HEX_PRIVKEY must be 64 hex characters.");
  }

  const account = Account.fromPrivateKeyHex(hexPrivKey);
  const FALLBACK_NODES = [
    process.env.NODE_URL,
    "https://warthognode.duckdns.org",
    "http://65.87.7.86:3001",
    "http://217.182.64.43:3001",
    "http://185.209.228.16:3001",
  ].filter(Boolean);

  cached = Object.freeze({
    account,
    faucetAddress: account.address.hex,
    network: (process.env.NETWORK || "mainnet").toLowerCase(),
    nodes: [...new Set(FALLBACK_NODES.map((u) => String(u).replace(/\/$/, "")))],
    port: intOr(process.env.PORT, 3000),
    dripAmount: String(process.env.DRIP_AMOUNT || "2"),
    weeklyBudget: numOr(process.env.WEEKLY_BUDGET, 10),
    minReserve: numOr(process.env.MIN_RESERVE, 1),
    walletWindowMs: intOr(process.env.WALLET_WINDOW_HOURS, 876000) * 3600 * 1000,
    ipRateLimit: intOr(process.env.IP_RATE_LIMIT, 1),
    ipWindowMs: intOr(process.env.IP_WINDOW_HOURS, 24) * 3600 * 1000,
    claimsFile: process.env.CLAIMS_FILE || "./data/claims.json",
    trustProxy: process.env.TRUST_PROXY || "true",
    explorerTx: (id) => `https://wartscan.io/tx/${id}`,
    explorerAddr: (a) => `https://wartscan.io/account/${a}`,
  });
  return cached;
}

export function hasFaucetKey() {
  return Boolean(process.env.FAUCET_HEX_PRIVKEY && String(process.env.FAUCET_HEX_PRIVKEY).trim());
}
