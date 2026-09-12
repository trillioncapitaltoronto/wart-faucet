# Deploy

One Node process. Same shape as testnet-faucet.warthog.network.

## Fastest public host (Render)

1. New Web Service from `trillioncapitaltoronto/wart-faucet`
2. Build `npm install` / Start `npm start`
3. Env:

```
NODE_ENV=production
NETWORK=mainnet
NODE_URL=https://node.wartscan.io
FAUCET_HEX_PRIVKEY=<64 hex from npm run gen-key>
DRIP_AMOUNT=2
WEEKLY_BUDGET=10
MIN_RESERVE=1
TRUST_PROXY=true
```

4. After first boot, copy `faucetAddress` from `/api/status`
5. Send at least 3 WART to that address
6. Publish the Render URL

A local `wart-node` on `127.0.0.1:3001` is better than the public HTTPS node. Use that when you have a VPS.

## VPS / systemd

```
FAUCET_HEX_PRIVKEY=...
NETWORK=mainnet
NODE_ENV=production
NODE_URL=http://127.0.0.1:3001
PORT=3000
TRUST_PROXY=loopback
```

Unit file: user `wart-faucet`, `EnvironmentFile=/etc/wart-faucet.env` mode 0600, `ExecStart=/usr/bin/node src/server.js`.

Nginx terminates TLS and sets real_ip. Proxy to `127.0.0.1:3000`.

## Ready check

```
curl -s $HOST/api/status
```

Need `health.nodeReachable: true` and `reserve` covering `MIN_RESERVE + DRIP_AMOUNT`.
