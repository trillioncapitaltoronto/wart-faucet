# AGENTS.md — wart-faucet

Community mainnet sibling of `warthog-network/testnet-faucet`.
Not an official Warthog Network service.

## What it is

A single Node process.
One instance per host.
Mainnet only.
Address derived at boot from `FAUCET_HEX_PRIVKEY` via `warthog-js`.
Never hard-coded.

## Source-of-truth map

| Question | Answer |
| --- | --- |
| Who talks to the node? | `src/faucet.js` (drips) and `src/balance.js` (cache) |
| Where is the faucet address stored? | In memory only, `Account.fromPrivateKeyHex(env.FAUCET_HEX_PRIVKEY).address.hex` |
| Where is claim state persisted? | Optional `data/claims.json`. RAM if the disk is read-only. Restart resets RAM. |
| How is balance polled? | `GET {NODE_URL}/account/{address}/wart_balance` every `BALANCE_POLL_MS` |
| How is a drip broadcast? | Sign with official `warthog-js`, then `POST {NODE_URL}/transaction/add`. No txHash = no claim. |
| Process model | One process. Do not scale out serverless isolates. Run more hosts with their own keys if you must. |

## Policy (mainnet, not testnet)

- Fixed drip (default 2 WART), not 0.1% of reserve.
- One claim per wallet (long window).
- One claim per IP per 24h.
- Weekly budget (default 10 WART) and a reserve floor (default 1 WART).

## Conventions

- Fail fast at boot if the key is missing or the first balance poll fails.
- `NETWORK` must be `mainnet`.
- Pin `warthog-js` to a commit SHA.
