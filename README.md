# Community mainnet WART faucet

Not an official Warthog Network service.

A small starter faucet so a new mainnet wallet can exist on-chain and pay a fee. Donate or mine into the same address to refill it.

Uses official warthog-js:

- Account.fromPrivateKeyHex — address derived at boot, never stored in the repo
- Address.fromHex — checksummed 48-char addresses only
- WarthogApi.createTransactionContext + transferWart — pin height from /chain/head
- Broadcast to POST /transaction/add so txHash is preserved (the SDK wrapper drops it)

Different from the official testnet faucet on purpose: fixed drip, persisted one-claim-per-wallet, weekly cap, public mainnet nodes.

No accounts, cards, email, or KYC. Private key only in host env.
