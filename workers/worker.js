// window is not available in workers so we disable no-restricted-globals
/* eslint-disable no-restricted-globals */

let backoff = 0
let ipInfoBackoff = 0

const options = INSTALL_OPTIONS

const ipInfoToken = options.services.ipData.ipinfoIo.token

const sourceKey = options.source
const apiKey = options.logflare.api_key

const logflareApiURL = "https://api.logflare.app/logs/cloudflare"

function buildLogEntry(request, response) {
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

  return logArray.join(" | ")
}

function buildLogflareRequest(logEntry, data) {
  return {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      "User-Agent": `Cloudflare Worker Debug`,
    },
    body: JSON.stringify({
      source: sourceKey,
      log_entry: logEntry,
      metadata: {
        data,
      },
    }),
  }
}
async function fetchIpDataWithCache(ip) {
  const {
    ipinfoIo: { maxAge },
  } = options.services.ipData

  const cache = caches.default

  // Do not switch to HTTPS until this is fixed:
  // deployed Cloudflare workers throw SSL handshake error
  // * this doesn't happen neither in cloudflareworkers.com environment
  // * this also doesn't happen in test console of preview console for deployed workers within Cloudflare dashboard
  const url = new URL(`http://ipinfo.io/${ip}/json?token=${ipInfoToken}`)

  const cacheKey = new Request(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  let cachedResponse = await cache.match(cacheKey)

  if (!cachedResponse) {
    const resp = await fetch(cacheKey)
    if (resp.status !== 200) {
      ipInfoBackoff = Date.now() + 10000
      return resp
    }
    cachedResponse = new Response(resp.body, resp)
    cachedResponse.headers.set("Cache-Control", `max-age=${maxAge}`)
    await cache.put(cacheKey, cachedResponse.clone())
    return cachedResponse
  }

  return cachedResponse
}

async function postLogs(init, connectingIp) {
  const post = init
  if (ipInfoToken && ipInfoBackoff < Date.now()) {
    const ipDataResponse = await fetchIpDataWithCache(connectingIp)
    if (ipDataResponse.status === 200) {
      post.body.metadata.request.ipData = await ipDataResponse.json()
    } else {
      post.body.metadata.request.ipData = { error: await ipDataResponse.json() }
    }
  }
  post.body = JSON.stringify(init.body)
  const resp = await fetch(logflareApiURL, post)
  if (resp.status === 403 || resp.status === 429) {
    backoff = Date.now() + 10000
  }
  return resp.json()
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

  const connectingIp = requestMetadata.cf_connecting_ip

  if (backoff < Date.now()) {
    if (options.env === "test") {
      const result = await postLogs(init, connectingIp)
      if (result.message !== "Logged!") {
        throw new Error(`Logflare API error: ${result.message}`)
      }
    } else {
      event.waitUntil(postLogs(init, connectingIp))
    }
  }

  return response
}

addEventListener("fetch", event => {
  event.passThroughOnException()

  event.respondWith(handleRequest(event))
})
