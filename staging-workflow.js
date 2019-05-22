const axios = require("axios")
const fs = require("fs")

const options = require("./test/install_options")

const stagingZoneId = process.env.LOGFLARE_CF_WORKER_ZONE_STAGING
const cfEmail = process.env.CF_EMAIL
const cfAuthKey = process.env.CF_AUTH_KEY
const scriptEndpoint = `https://api.cloudflare.com/client/v4/zones/${stagingZoneId}/workers/script`

async function compileWorkerStaging() {
  const compiledWorkerSource = fs.readFileSync("./workers/worker.js", "utf8")
  options.env = "staging"

  const testWorkerSource = compiledWorkerSource.replace(
    "INSTALL_OPTIONS",
    JSON.stringify(options),
  )

  fs.writeFileSync("./staging/worker.js", testWorkerSource)
}

async function updateStagingWorkerScript() {
  const script = fs.readFileSync("./staging/worker.js", "utf8")
  try {
    const res = await axios.put(scriptEndpoint, script, {
      headers: {
        "X-Auth-Email": cfEmail,
        "X-Auth-Key": cfAuthKey,
        "Content-Type": "application/javascript",
      },
    })
    if (res.status === 200) {
      console.log("Staging worker code updated!")
    } else {
      console.log("ERROR")
      console.log(res)
    }
  } catch (e) {
    console.log(e)
  }
}

async function run() {
  await compileWorkerStaging()
  await updateStagingWorkerScript()
}

run()
