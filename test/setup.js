/* Test bootstrap: TypeScript via ts-node (transpile only) and a silent logger. */
process.env.TS_NODE_TRANSPILE_ONLY = "true"
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "commonjs" },
})

const Module = require("module")
const path = require("path")

// src/piers/logger writes rotating log files into data/ on import: stub it
const loggerPath = path.join(__dirname, "../src/piers/logger.ts")
const stub = new Module(loggerPath)
stub.filename = loggerPath
stub.loaded = true
stub.exports = {
  logger: { log() {}, info() {}, error() {}, warn() {} },
  log: () => () => {},
}
require.cache[loggerPath] = stub
