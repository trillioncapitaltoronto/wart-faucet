import { Account } from "warthog-js";

const acc = Account.fromRandom();
process.stdout.write(`FAUCET_HEX_PRIVKEY=${acc.privateKeyHex}\n`);
process.stdout.write(`# Faucet address (fund this, then set the key as an env var):\n`);
process.stdout.write(`# ${acc.address.hex}\n`);
process.stdout.write(`# Explorer: https://wartscan.io/account/${acc.address.hex}\n`);
