import express from "express";
import open from "open";

import { buildStatusPage } from "../statusPage";
import { getConfigFile, getRegistry, save } from "./npm";
import { printUsage } from "./usage";

const registry = getRegistry();

if (registry.includes("registry.npmjs.org")) {
  printUsage();
  process.exit(1);
}

open(`${registry}/oauth/authorize`);

const successPage = buildStatusPage(`
  <h1>All done!</h1>
  <p>We've updated your npm configuration.</p>
  <p><code>${getConfigFile()}</code></p>
`);

const server = express()
  .use((req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "default-src 'self';");
    next();
  })
  .get("/", (req, res) => {
    const token = decodeURIComponent(req.query.token as string);
    save(registry, token);
    res.setHeader("Content-Type", "text/html");
    res.send(successPage);
    server.close();
    process.exit(0);
  })
  .listen(8239);
