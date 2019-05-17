// window is not available in workers so we disable no-restricted-globals
/* eslint-disable no-restricted-globals */

let backoff = 0
let ipInfoBackoff = 0

const ipInfoToken = ""

function buildLogEntry(request, response) {
  const options = INSTALL_OPTIONS

  const logDefs = {
    rMeth: request.method,
    rUrl: request.url,
    uAgent: request.headers.get("user-agent"),
    cfRay: request.headers.get("cf-ray"),
    cIP: request.headers.get("cf-connecting-ip"),
    statusCode: response.status,
    contentLength: response.headers.get("content-legth"),
    cfCacheStatus: response.headers.get("cf-cache-status"),
    contentType: response.headers.get("content-type"),
    responseConnection: response.headers.get("connection"),
    requestConnection: request.headers.get("connection"),
    cacheControl: response.headers.get("cache-control"),
    acceptRanges: response.headers.get("accept-ranges"),
    expectCt: response.headers.get("expect-ct"),
    expires: response.headers.get("expires"),
    lastModified: response.headers.get("last-modified"),
    vary: response.headers.get("vary"),
    server: response.headers.get("server"),
    etag: response.headers.get("etag"),
    date: response.headers.get("date"),
    transferEncoding: response.headers.get("transfer-encoding"),
  }

  const logArray = []

  options.metadata.forEach(entry => {
    logArray.push(logDefs[entry.field])
  })

  const logEntry = logArray.join(" | ")

  return logEntry
}

async function fetchIpData(ip) {
  const resp = await fetch(`https://ipinfo.io/${ip}/json?token=${ipInfoToken}`)
  if (resp.status !== 200) {
    ipInfoBackoff = Date.now() + 10000
    return {}
  }
  const json = await resp.json()
  return json
}

async function postLogs(init, connectingIp) {
  init.body.metadata.request.ipData = await fetchIpData(connectingIp)
  init.body = JSON.stringify(init.body)
  const resp = await fetch("https://api.logflare.app/logs/cloudflare", init)
  if (resp.status === 403 || resp.status === 429) {
    backoff = Date.now() + 10000
  }
  return resp.json()
}

async function handleRequest(event) {
  const { request } = event
  const requestHeaders = Array.from(request.headers)

  const connectingIp = request.headers["CF-Connecting-IP"]

  const t1 = Date.now()
  const response = await fetch(request)
  const originTimeMs = Date.now() - t1

  const rHost = request.headers.get("host")
  const rUrl = request.url
  const rMeth = request.method
  const rCf = request.cf
  const requestMetadata = {}

  requestHeaders.forEach(([key, value]) => {
    requestMetadata[key.replace(/-/g, "_")] = value
  })

  const responseHeaders = Array.from(response.headers)

  const responseMetadata = {}

  responseHeaders.forEach(([key, value]) => {
    responseMetadata[key.replace(/-/g, "_")] = value
  })

  const statusCode = response.status

  const options = INSTALL_OPTIONS
  const sourceKey = options.source
  const apiKey = options.logflare.api_key

  const logEntry = buildLogEntry(request, response)

  const init = {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      "User-Agent": `Cloudflare Worker via ${rHost}`,
    },
    body: {
      source: sourceKey,
      log_entry: logEntry,
      metadata: {
        response: {
          headers: responseMetadata,
          origin_time: originTimeMs,
          status_code: statusCode,
        },
        request: {
          url: rUrl,
          method: rMeth,
          headers: requestMetadata,
          cf: rCf,
        },
      },
    },
  }

  if (backoff < Date.now()) {
    event.waitUntil(postLogs(init, connectingIp))
  }

  return response
}

addEventListener("fetch", event => {
  event.passThroughOnException()

  event.respondWith(handleRequest(event))
})
