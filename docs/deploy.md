# Deploy

Copy the official testnet faucet shape: one Node process, a local `wart-node`, nginx or Cloudflare in front.

## 1. Key

```bash
npm run gen-key
```

Put `FAUCET_HEX_PRIVKEY` in `/etc/wart-faucet.env` owned by root, mode `0600`. Fund the printed address.

## 2. Node

Run `wart-node` on the same box and point the faucet at it:

```
NODE_URL=http://127.0.0.1:3001
```

Public HTTP peers are a last resort.

## 3. systemd

```
[Unit]
Description=Community mainnet WART faucet
After=network.target

[Service]
Type=simple
User=wart-faucet
WorkingDirectory=/opt/wart-faucet
EnvironmentFile=/etc/wart-faucet.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

## 4. nginx

Terminate TLS. Set `real_ip` from Cloudflare or the immediate peer. Proxy to `127.0.0.1:3000`. Then `TRUST_PROXY=loopback` is correct.

## 5. Check

```
curl -s localhost:3000/api/status
curl -s localhost:3000/healthz
```

`health.nodeReachable` must be true and `reserve` must cover `MIN_RESERVE + DRIP_AMOUNT` before you publish the URL.
