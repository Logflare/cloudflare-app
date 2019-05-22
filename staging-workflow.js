import fs from "fs"

const options = require("./test/install_options")

async function compileWorkerStaging() {
  const compiledWorkerSource = fs.readFileSync("./workers/worker.js", "utf8")

  const testWorkerSource = compiledWorkerSource.replace(
    "INSTALL_OPTIONS",
    JSON.stringify(options),
  )

  fs.writeFileSync("./staging/worker.js", testWorkerSource)
}

