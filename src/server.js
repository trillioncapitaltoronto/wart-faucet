import { app } from "./app.js";
import { config } from "./config.js";
import { balance } from "./balance.js";
import { ratelimit } from "./ratelimit.js";

const started = Date.now();

try {
  await balance.start();
  ratelimit.startGc();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}

app.listen(config.port, "0.0.0.0", () => {
  console.log(
    `mainnet WART faucet ${config.faucetAddress} on :${config.port} via ${config.nodeUrl} (${Date.now() - started}ms)`,
  );
});
