# Security

- Private key lives only in the host environment (mode 0600). Never GitHub, never the page.
- Address is derived at boot from that key. It is not hard-coded.
- Talk to a node you run (`NODE_URL=http://127.0.0.1:3001`) or one you trust.
- `TRUST_PROXY=loopback` unless nginx/Cloudflare is in front and rewriting client IP.
- CORS allowlist is closed. Same-origin form posts have no Origin and are allowed.
- Visitors submit a 48-character hex address only. Checksummed via `Address.fromHex`.
- Claims are recorded only after the node returns a txHash.
- Keep the hot pot small. Weekly budget is the drain cap.
