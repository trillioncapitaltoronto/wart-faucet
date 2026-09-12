import { config } from "./config.js";
import { balance } from "./balance.js";
import { ratelimit } from "./ratelimit.js";
import { store, toE8, fromE8 } from "./store.js";

const TIMEOUT_MS = 8_000;

function parseRecipient(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!/^[0-9a-f]{48}$/.test(raw)) return null;
  return raw;
}

function toU64(v) {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  return null;
}

function wireTransfer(tx) {
  const feeE8 = toU64(tx.feeE8);
  const amountE8 = toU64(tx.wartE8 ?? tx.amountE8);
  const nonceId = toU64(tx.nonceId);
  const pinHeight = toU64(tx.pinHeight);
  if (feeE8 == null || amountE8 == null || nonceId == null || pinHeight == null) {
    throw new Error("tx missing numeric fields");
  }
  return {
    type: "wartTransfer",
    pinHeight,
    nonceId,
    feeE8,
    amountE8,
    toAddr: tx.toAddr,
    signature65: tx.signature65,
  };
}

async function broadcast(nodeUrl, tx) {
  const res = await fetch(`${nodeUrl.replace(/\/$/, "")}/transaction/add`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(wireTransfer(tx)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json();
  const txHash = json.txHash || json.txId || json.data?.txHash || json.data?.txId || null;
  const ok = json?.code === 0 || json?.success === true;
  if (!ok) return { success: false, error: json?.error || `node code ${json?.code}` };
  if (!txHash) return { success: false, error: "node accepted tx but returned no txHash" };
  return { success: true, txHash };
}

export async function sendDrip({ address, ip }) {
  const raw = parseRecipient(address);
  if (!raw) return { status: 400, ok: false, error: "Not a valid Warthog address (48 hex chars + checksum)" };

  const { Address } = await import("warthog-js");
  let recipient;
  try {
    recipient = Address.fromHex(raw);
  } catch {
    return { status: 400, ok: false, error: "Not a valid Warthog address (48 hex chars + checksum)" };
  }
  if (!recipient) return { status: 400, ok: false, error: "Not a valid Warthog address (48 hex chars + checksum)" };

  const wallet = recipient.hex.toLowerCase();
  if (wallet === config.faucetAddress.toLowerCase()) {
    return { status: 400, ok: false, error: "cannot drip to the faucet itself" };
  }
  if (!ratelimit.check(ip || "unknown")) {
    return {
      status: 429,
      ok: false,
      error: "this IP already claimed",
      retryAfterSeconds: ratelimit.retryAfterSeconds(ip || "unknown"),
    };
  }
  if (!store.canWallet(wallet)) {
    return { status: 429, ok: false, error: "this wallet already claimed" };
  }
  const ipKey = `ip:${ip || "unknown"}`;
  if (!store.tryLock(wallet)) {
    return { status: 429, ok: false, error: "claim already in flight" };
  }
  if (!store.tryLock(ipKey)) {
    store.unlock(wallet);
    return { status: 429, ok: false, error: "claim already in flight" };
  }

  try {
    const snap = await balance.getFresh();
    if (snap.error || !snap.reserve) {
      return { status: 503, ok: false, error: "node unreachable" };
    }

    const dripE8 = toE8(config.dripAmount);
    if (dripE8 <= 0n) return { status: 500, ok: false, error: "invalid drip amount" };
    const reserveE8 = toE8(snap.reserve);
    const floorE8 = toE8(config.minReserve) + dripE8;
    if (reserveE8 < floorE8) {
      return { status: 503, ok: false, error: "faucet empty — donate or mine to the pot" };
    }
    if (store.remainingWeekE8() < dripE8) {
      return { status: 503, ok: false, error: "weekly faucet budget empty" };
    }

    const { NonceId, RoundedFee, WarthogApi, Wart } = await import("warthog-js");
    const amount = Wart.parse(String(config.dripAmount));
    if (!amount) return { status: 500, ok: false, error: "invalid drip amount" };

    let tx;
    try {
      const api = new WarthogApi(config.nodeUrl);
      const fee = RoundedFee.fromE8(9992n, false) || RoundedFee.min();
      const ctx = await api.createTransactionContext(fee, NonceId.random());
      tx = ctx.transferWart(config.account, recipient, amount);
    } catch (err) {
      return { status: 500, ok: false, error: `tx build failed: ${err.message || err}` };
    }

    if (!tx || tx.type !== "wartTransfer" || !tx.signature65) {
      return { status: 500, ok: false, error: "tx build produced an invalid payload" };
    }

    let result;
    try {
      result = await broadcast(config.nodeUrl, tx);
    } catch (err) {
      return { status: 500, ok: false, error: `broadcast failed: ${err.message || err}` };
    }
    if (!result.success) {
      return { status: 500, ok: false, error: result.error || "node rejected tx" };
    }

    store.record({ address: wallet, amount: fromE8(dripE8), txHash: result.txHash });
    ratelimit.record(ip || "unknown");
    await balance.poll();

    return {
      status: 200,
      ok: true,
      amount: config.dripAmount,
      txId: result.txHash,
      explorerUrl: config.explorerTx(result.txHash),
      reserveBefore: snap.reserve,
      reserveAfter: balance.get().reserve,
    };
  } finally {
    store.unlock(wallet);
    store.unlock(ipKey);
  }
}
