import {
  Address,
  NonceId,
  RoundedFee,
  WarthogApi,
  Wart,
} from "warthog-js";
import { getConfig } from "./config.js";
import { balance, pickNode } from "./balance.js";
import { store } from "./store.js";

const inflight = new Set();

function toNum(s) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function cleanAddress(input) {
  let raw = String(input || "").trim().toLowerCase();
  if (raw.startsWith("0x")) raw = raw.slice(2);
  raw = raw.replace(/[^0-9a-f]/g, "");
  return raw;
}

function parseRecipient(input) {
  const raw = cleanAddress(input);
  if (raw.length !== 48) return null;
  try {
    return Address.fromHex(raw) || null;
  } catch {
    return null;
  }
}

async function broadcast(nodeUrl, tx) {
  const res = await fetch(`${nodeUrl}/transaction/add`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(tx, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
    signal: AbortSignal.timeout(8000),
  });
  const json = await res.json();
  if (json?.code !== 0) {
    return { success: false, error: json?.error || `node code ${json?.code}` };
  }
  return { success: true, txHash: json.txHash || json.data?.txHash || null };
}

export async function sendDrip({ address, ip }) {
  const config = getConfig();
  const recipient = parseRecipient(address);
  if (!recipient) return { status: 400, ok: false, error: "invalid address" };

  const wallet = recipient.hex.toLowerCase();
  if (wallet === config.faucetAddress.toLowerCase()) {
    return { status: 400, ok: false, error: "cannot drip to the faucet itself" };
  }
  if (inflight.has(wallet)) {
    return { status: 429, ok: false, error: "claim already in flight" };
  }
  if (!store.canWallet(wallet)) {
    return { status: 429, ok: false, error: "this wallet already claimed" };
  }
  if (!store.canIp(ip || "unknown")) {
    return { status: 429, ok: false, error: "this IP already claimed today" };
  }

  const snap = await balance.getFresh();
  if (snap.error || snap.reserve == null) {
    return { status: 503, ok: false, error: "node unreachable" };
  }

  const drip = toNum(config.dripAmount);
  const reserve = toNum(snap.reserve);
  if (reserve < config.minReserve + drip + 0.01) {
    return { status: 503, ok: false, error: "faucet empty" };
  }
  if (store.remainingWeek() < drip) {
    return { status: 503, ok: false, error: "weekly faucet budget empty" };
  }

  const amount = Wart.parse(config.dripAmount);
  if (!amount) return { status: 500, ok: false, error: "invalid drip amount" };

  inflight.add(wallet);
  try {
    let nodeUrl;
    try {
      nodeUrl = await pickNode();
    } catch (err) {
      return { status: 503, ok: false, error: String(err.message || err) };
    }

    let tx;
    try {
      const api = new WarthogApi(nodeUrl);
      const ctx = await api.createTransactionContext(RoundedFee.min(), NonceId.random());
      tx = ctx.transferWart(config.account, recipient, amount);
    } catch (err) {
      return { status: 500, ok: false, error: `tx build failed: ${err.message || err}` };
    }

    if (!tx || tx.type !== "wartTransfer" || !tx.signature65) {
      return { status: 500, ok: false, error: "tx build produced an invalid payload" };
    }

    let result;
    try {
      result = await broadcast(nodeUrl, tx);
    } catch (err) {
      return { status: 500, ok: false, error: `broadcast failed: ${err.message || err}` };
    }

    if (!result.success) {
      return { status: 500, ok: false, error: result.error || "node rejected tx" };
    }

    store.record({ address: wallet, ip: ip || "unknown", amount: drip });
    await balance.poll();

    return {
      status: 200,
      ok: true,
      amount: config.dripAmount,
      txId: result.txHash,
      explorerUrl: result.txHash ? config.explorerTx(result.txHash) : null,
      reserveBefore: snap.reserve,
      reserveAfter: balance.get().reserve,
    };
  } finally {
    inflight.delete(wallet);
  }
}
