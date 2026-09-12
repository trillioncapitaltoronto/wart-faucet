# WART faucet

Mainnet Warthog faucet for people who do not run a local machine.

Repo: https://github.com/trillioncapitaltoronto/wart-faucet

Fixed drip (default 2 WART), one claim per wallet, one claim per IP per day, weekly budget.

No private key is in this repo. The address is derived at boot from `FAUCET_HEX_PRIVKEY` on Render.

The key from the earlier public Grok share is burned. Do not fund it.

## Deploy from a phone (Render)

1. Open https://dashboard.render.com and sign in with GitHub (`trillioncapitaltoronto`).
2. New → Web Service → `wart-faucet`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Instance: Free
6. Environment variables:

| Key | Value |
|---|---|
| FAUCET_HEX_PRIVKEY | the 64-char key generated for this faucet (Render only, never GitHub) |
| NODE_URL | https://warthognode.duckdns.org |
| DRIP_AMOUNT | 2 |
| WEEKLY_BUDGET | 10 |
| TRUST_PROXY | true |
| NETWORK | mainnet |

7. Deploy. When Live, open the `.onrender.com` URL.
8. Send a small bag of mainnet WART to the address shown on the page.
9. Claim from a different address to test.

Free Render sleeps when idle. First visit after sleep can take about a minute. Disk is ephemeral: a rebuild wipes claim history.

If the node is down, change `NODE_URL` to `http://65.87.7.86:3001` and redeploy.

## Rules

- 1 drip per wallet (~100 year window)
- 1 drip per IP per 24h
- Fixed amount, not a percent of reserves
- Stops if reserve is too low or the weekly budget is spent
