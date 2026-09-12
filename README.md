# Community mainnet WART faucet

Not an official Warthog Network service.

Single-process sibling of [warthog-network/testnet-faucet](https://github.com/warthog-network/testnet-faucet). Same boot contract: the hot-wallet address is derived from `FAUCET_HEX_PRIVKEY` and is never hard-coded.

## Policy

- 2 WART per wallet, once
- 1 claim per IP per 24 hours
- Weekly budget 10 WART, reserve floor 1 WART
- Official `warthog-js`, pinned
- Broadcast to `POST /transaction/add`; claim is recorded only if the node returns a txHash

## Run

```bash
npm install
npm run gen-key          # prints FAUCET_HEX_PRIVKEY and the derived address
# put the key in the host environment only (chmod 600)
# run a local wart-node, or set NODE_URL to a node you trust
NODE_ENV=production NODE_URL=http://127.0.0.1:3001 npm start
```

Then send WART to the derived address. Until the pot is funded, claims return `faucet empty`.

See `docs/deploy.md` for systemd + nginx, the same shape as the official testnet faucet.

Do not host drips on Vercel. Serverless isolates do not share claim state.

Never commit the private key. Treat the wallet as a small hot pot.
