import {
  Address,
  NonceId,
  RoundedFee,
  WarthogApi,
  Wart,
} from "warthog-js";
import { config } from "./config.js";
import { balance, pickNode } from "./balance.js";
import { store } from "./store.js";

function toNum(s) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function sendDrip({ address, ip }) {
  const raw = String(address || "").trim().toLowerCase();
  let recipient;
  try {
    recipient = Address.fromHex(raw);
  } catch {
    return { status: 400, ok: false, error: "invalid address" };
  }
  if (!recipient) return { status: 400, ok: false, error: "invalid address" };

  const wallet = recipient.hex.toLowerCase();
  if (wallet === config.faucetAddress.toLowerCase()) {
    return { status: 400, ok: false, error: "cannot drip to the faucet itself" };
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
  const fee = toNum(config.txFee);
  const reserve = toNum(snap.reserve);
  if (reserve < config.minReserve + drip + fee) {
    return { status: 503, ok: false, error: "faucet empty" };
  }
  if (store.remainingWeek() < drip) {
    return { status: 503, ok: false, error: "weekly faucet budget empty" };
  }

  let nodeUrl;
  try {
    nodeUrl = await pickNode();
  } catch (err) {
    return { status: 503, ok: false, error: String(err.message || err) };
  }

  const api = new WarthogApi(nodeUrl);
  let tx;
  try {
    const ctx = await api.createTransactionContext(RoundedFee.min(), NonceId.random());
    tx = ctx.transferWart(config.account, recipient, Wart.parse(config.dripAmount));
  } catch (err) {
    return { status: 500, ok: false, error: `tx build failed: ${err.message || err}` };
  }

  let result;
  try {
    result = await api.submitTransaction(tx);
  } catch (err) {
    return { status: 500, ok: false, error: `broadcast failed: ${err.message || err}` };
  }

  if (result?.success === false || result?.error) {
    return { status: 500, ok: false, error: result?.error || "node rejected tx" };
  }

  const txId =
    result?.txHash ||
    result?.txId ||
    result?.data?.txHash ||
    result?.signedSnapshot?.txId ||
    null;

  store.record({ address: wallet, ip: ip || "unknown", amount: drip });
  await balance.poll();

  return {
    status: 200,
    ok: true,
    amount: config.dripAmount,
    txId,
    explorerUrl: txId ? config.explorerTx(txId) : null,
    reserveBefore: snap.reserve,
    reserveAfter: balance.get().reserve,
  };
}
