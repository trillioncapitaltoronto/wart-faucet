// Boot-time config. Same contract as warthog-network/testnet-faucet:
// address is derived from FAUCET_HEX_PRIVKEY and never hard-coded.

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

function listOr(value, fallback) {
  if (!value) return fallback;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const hexPrivKey = required("FAUCET_HEX_PRIVKEY").toLowerCase();
if (!/^[0-9a-f]{64}$/.test(hexPrivKey)) {
  throw new Error("FAUCET_HEX_PRIVKEY must be 64 hex characters (32-byte secp256k1 key).");
}

const network = (process.env.NETWORK || "mainnet").toLowerCase();
if (network !== "mainnet") {
  throw new Error(`This faucet is mainnet-only. Refusing NETWORK=${network}.`);
}

const nodeUrl = (process.env.NODE_URL || "https://warthognode.duckdns.org").trim().replace(/\/$/, "");
if (!/^https?:\/\//i.test(nodeUrl)) {
  throw new Error("NODE_URL must be http(s)://");
}

const wartscanApi = (process.env.WARTSCAN_API || "https://wartscan.io/api").trim().replace(/\/$/, "");
if (!/^https?:\/\//i.test(wartscanApi)) {
  throw new Error("WARTSCAN_API must be http(s)://");
}

const dripAmount = process.env.DRIP_AMOUNT || "2";
const weeklyBudget = numOr(process.env.WEEKLY_BUDGET, 100);
const minReserve = numOr(process.env.MIN_RESERVE, 1);
if (!/^\d+(\.\d{1,8})?$/.test(String(dripAmount))) {
  throw new Error("DRIP_AMOUNT must be a decimal WART amount");
}
if (Number(dripAmount) <= 0 || Number(dripAmount) > weeklyBudget) {
  throw new Error("DRIP_AMOUNT must be > 0 and <= WEEKLY_BUDGET");
}

const account = Account.fromPrivateKeyHex(hexPrivKey);

export const config = Object.freeze({
  account,
  faucetAddress: account.address.hex,
  network,
  nodeUrl,
  wartscanApi,
  port: intOr(process.env.PORT, 3000),
  dripAmount,
  weeklyBudget,
  minReserve,
  walletWindowMs: intOr(process.env.WALLET_WINDOW_HOURS, 876000) * 3600 * 1000,
  ipRateLimit: intOr(process.env.IP_RATE_LIMIT, 1),
  ipWindowMs: intOr(process.env.IP_WINDOW_HOURS, 24) * 3600 * 1000,
  balancePollMs: intOr(process.env.BALANCE_POLL_MS, 60_000),
  claimsFile: process.env.CLAIMS_FILE || "./data/claims.json",
  trustProxy: (process.env.TRUST_PROXY || (process.env.RENDER || process.env.FLY_APP_NAME ? "true" : "loopback")).trim(),
  corsOrigins: listOr(process.env.CORS_ORIGIN, [
    "https://warthog.network",
    "https://www.warthog.network",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ]),
  explorerTx: (id) => `https://wartscan.io/tx/${id}`,
  explorerAddr: (a) => `https://wartscan.io/account/${a}`,
});
