# Community mainnet WART faucet

Not an official Warthog Network service.

A small starter faucet so a new mainnet wallet can exist on-chain and pay a fee. Donate or mine into the same address to refill it.

## What it does

- Fixed drip (default 2 WART), one claim per wallet
- Weekly budget (default 10 WART) and a reserve floor
- Official `warthog-js` for address checks and signed transfers
- Broadcasts to `POST /transaction/add` so the node `txHash` is kept
- Public mainnet nodes, with `https://warthognode.duckdns.org` first

## Run

```bash
npm install
npm run gen-key          # prints FAUCET_HEX_PRIVKEY + address
# put the key in the host environment only
npm start
```

Required env: `FAUCET_HEX_PRIVKEY` (64 hex chars). See `.env.example`.

Then send WART to the derived address. Until the pot is funded, claims return `faucet empty`.

## Hosting

- **Render** (`render.yaml`): better for a long-lived process and `data/claims.json`
- **Vercel**: works as a serverless Express app at `api/index.js`. Claims are in-memory per instance.

Never commit the private key. The faucet address is public; treat the wallet as a small hot pot.
