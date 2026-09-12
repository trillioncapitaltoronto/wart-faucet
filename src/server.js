import { app } from "./app.js";
import { getConfig, hasFaucetKey } from "./config.js";
import { balance } from "./balance.js";

const port = Number(process.env.PORT) || 3000;

if (hasFaucetKey()) {
  getConfig()
    .then(() => balance.start())
    .catch((err) => console.error("balance poll:", err.message || err));
}

app.listen(port, "0.0.0.0", async () => {
  if (!hasFaucetKey()) {
    console.log(`WART faucet waiting for FAUCET_HEX_PRIVKEY on :${port}`);
    return;
  }
  try {
    const config = await getConfig();
    console.log(`WART faucet ${config.faucetAddress} on :${port}`);
  } catch (err) {
    console.log(`WART faucet on :${port} (${err.message})`);
  }
});
