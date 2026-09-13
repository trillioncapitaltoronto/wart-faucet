import { app } from "./app.js";
import { config } from "./config.js";
import { balance } from "./balance.js";
import { ratelimit } from "./ratelimit.js";
import { store } from "./store.js";

const started = Date.now();

ratelimit.startGc();

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(
    `mainnet WART faucet ${config.faucetAddress} on :${config.port} via ${config.nodeUrl} (${Date.now() - started}ms)`,
  );
});

server.on("error", (err) => {
  console.error(err.message || err);
  process.exit(1);
});

balance.start().catch((err) => {
  console.error(err.message || err);
});

store
  .hydrateFromChain()
  .then((info) => {
    console.log(`claim log hydrated from chain: ${JSON.stringify(info)}`);
  })
  .catch((err) => {
    console.error(`claim hydrate skipped: ${err.message || err}`);
  });
