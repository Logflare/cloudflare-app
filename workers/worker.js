// window is not available in workers so we disable no-restricted-globals
/* eslint-disable no-restricted-globals */

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

async function handleRequest(event) {
  const { request } = event
  const response = await fetch(request)
  const rHost = request.headers.get("host")

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
    body: JSON.stringify({ source: sourceKey, log_entry: logEntry }),
  }

  event.waitUntil(fetch("https://logflare.app/api/logs", init))

  // console.log(cIP)

  return response
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event))
})
