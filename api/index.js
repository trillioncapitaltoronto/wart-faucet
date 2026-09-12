// Not supported for production drips.
// Serverless isolates do not share claim state. Run src/server.js as one process.
export default function handler(_req, res) {
  res.statusCode = 501;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({
    ok: false,
    error: "This faucet is a single Node process. Deploy src/server.js, not Vercel.",
  }));
}
