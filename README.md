# Community mainnet WART faucet

Not an official Warthog Network service.

Single-process sibling of the official testnet faucet. Address is derived from `FAUCET_HEX_PRIVKEY` and is never hard-coded.

## Policy

- 2 WART per wallet, once
- 1 claim per IP per 24 hours
- Weekly budget 10 WART, reserve floor 1 WART
- Public claim log (address + tx only, links to wartscan.io)
- Official `warthog-js`, pinned
- Broadcast to `POST /transaction/add`; claim recorded only if the node returns a txHash

## Run

```bash
npm install
npm run gen-key
# put FAUCET_HEX_PRIVKEY in the host env only (chmod 600)
NODE_ENV=production NODE_URL=https://node.wartscan.io npm start
```

Fund the printed address with at least 3 WART. Then:

```bash
curl -s localhost:3000/api/status
curl -s localhost:3000/api/log
curl -s localhost:3000/healthz
```

See `docs/deploy.md`. Do not host drips on Vercel.

Never commit the private key.
