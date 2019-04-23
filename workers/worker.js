// window is not available in workers so we disable no-restricted-globals
/* eslint-disable no-restricted-globals */

let backoff = 0

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
  const requestHeaders = Array.from(request.headers)

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
    body: JSON.stringify({
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
    }),
  }

  if (backoff < Date.now()) {
    event.waitUntil(
      fetch("https://logflarelogs.com/api/logs", init).then(resp => {
        if (resp.status === 403) {
          backoff = Date.now() + 10000
        }
      }),
    )
  }

  return response
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event))
})
