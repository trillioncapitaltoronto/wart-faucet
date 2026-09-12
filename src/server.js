import { app } from "./app.js";
import { getConfig, hasFaucetKey } from "./config.js";
import { balance } from "./balance.js";

const port = Number(process.env.PORT) || 3000;

if (hasFaucetKey()) {
  balance.start().catch((err) => console.error("balance poll:", err.message || err));
}

app.listen(port, "0.0.0.0", () => {
  try {
    console.log(`WART faucet ${getConfig().faucetAddress} on :${port}`);
  } catch {
    console.log(`WART faucet waiting for FAUCET_HEX_PRIVKEY on :${port}`);
  }
});
