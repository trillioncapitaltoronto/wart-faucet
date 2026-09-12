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

const BUILTIN_NODES = [
  "https://warthognode.duckdns.org",
  "http://65.87.7.86:3001",
  "http://217.182.64.43:3001",
  "http://185.209.228.16:3001",
  "http://89.117.150.162:3001",
];

let cached;

export function hasFaucetKey() {
  const v = process.env.FAUCET_HEX_PRIVKEY;
  return Boolean(v && String(v).trim());
}

export function publicSettings() {
  return {
    network: (process.env.NETWORK || "mainnet").toLowerCase(),
    dripAmount: String(process.env.DRIP_AMOUNT || "2"),
    weeklyBudget: numOr(process.env.WEEKLY_BUDGET, 10),
    minReserve: numOr(process.env.MIN_RESERVE, 1),
    faucetAddress: process.env.FAUCET_ADDRESS
      ? String(process.env.FAUCET_ADDRESS).trim().toLowerCase()
      : "28dbe185c8c383cb85e7b2b5d32ad03a5f4eda9144e5aa4a",
  };
}

export async function getConfig() {
  if (cached) return cached;

  const hexPrivKey = required("FAUCET_HEX_PRIVKEY").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hexPrivKey)) {
    throw new Error("FAUCET_HEX_PRIVKEY must be 64 hex characters.");
  }

  const { Account } = await import("warthog-js");
  const account = Account.fromPrivateKeyHex(hexPrivKey);

  const extra = (process.env.NODE_URL || "")
    .split(",")
    .map((u) => u.trim().replace(/\/$/, ""))
    .filter(Boolean);

  cached = Object.freeze({
    account,
    faucetAddress: account.address.hex,
    network: (process.env.NETWORK || "mainnet").toLowerCase(),
    nodes: [...new Set([...extra, ...BUILTIN_NODES])],
    port: intOr(process.env.PORT, 3000),
    dripAmount: String(process.env.DRIP_AMOUNT || "2"),
    weeklyBudget: numOr(process.env.WEEKLY_BUDGET, 10),
    minReserve: numOr(process.env.MIN_RESERVE, 1),
    walletWindowMs: intOr(process.env.WALLET_WINDOW_HOURS, 876000) * 3600 * 1000,
    ipRateLimit: intOr(process.env.IP_RATE_LIMIT, 1),
    ipWindowMs: intOr(process.env.IP_WINDOW_HOURS, 24) * 3600 * 1000,
    claimsFile: process.env.CLAIMS_FILE || "./data/claims.json",
    explorerTx: (id) => `https://wartscan.io/tx/${id}`,
    explorerAddr: (a) => `https://wartscan.io/account/${a}`,
  });
  return cached;
}
