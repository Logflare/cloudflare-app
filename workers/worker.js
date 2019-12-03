/* eslint-disable no-restricted-globals */

// Cloudflare App Options
const options = INSTALL_OPTIONS
const LOGFLARE_CF_APP_VERSION = "0.4.0"
options.metadata = options.metadata.map(value => ({ field: value }))

const sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const makeid = length => {
  let text = ""
  const possible = "ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789"
  for (let i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  return text
}

const backoff = 0
let ipInfoBackoff = 0

// Batching
const BATCH_INTERVAL_MS = 10000
let logEventsBatch = []
let workerTimestamp
const workerId = makeid(6)
let batchIsRunning = false
const maxRequestsPerBatch = 1000

// IpInfo
const { ipInfoToken, ipInfoMaxAge } = options.services

// Logflare API

const sourceKey = options.source
const apiKey = options.logflare.api_key
const logflareApiURL = "https://api.logflare.app/logs/elixir/logger"

function buildLogMessage(request, response) {
  const logDefs = {
    rMeth: request.method,
    rUrl: request.url,
    uAgent: request.headers.get("user-agent"),
    cfRay: request.headers.get("cf-ray"),
    cIP: request.headers.get("cf-connecting-ip"),
    statusCode: response.status,
    contentLength: response.headers.get("content-length"),
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
  options.metadata.forEach(entry => logArray.push(logDefs[entry.field]))
  return logArray.join(" | ")
}

const fetchIpDataWithCache = async ip => {
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
    if (resp.status === 200) {
      cachedResponse = new Response(resp.body, resp)
      cachedResponse.headers.set("Cache-Control", `max-age=${ipInfoMaxAge}`)
      await cache.put(cacheKey, cachedResponse.clone())
      return await cachedResponse.json()
    } else {
      ipInfoBackoff = Date.now() + 10000
      return {
        error: await resp.text(),
      }
    }
  }
  return cachedResponse.json()
}

async function addToBatch(body, connectingIp) {
  const enrichedBody = body
  if (ipInfoToken && ipInfoBackoff < Date.now()) {
    enrichedBody.metadata.request.ipData = await fetchIpDataWithCache(
      connectingIp,
    )
  }
  logEventsBatch.push(enrichedBody)
}

async function handleRequest(event) {
  const { request } = event

  const requestMetadata = {}
  const requestHeaders = Array.from(request.headers)
  requestHeaders.forEach(([key, value]) => {
    requestMetadata[key.replace(/-/g, "_")] = value
  })

  const t1 = Date.now()
  const response = await fetch(request)
  const originTimeMs = Date.now() - t1

  const rUrl = request.url
  const rMeth = request.method
  const rCf = request.cf

  const responseMetadata = {}
  const responseHeaders = Array.from(response.headers)
  responseHeaders.forEach(([key, value]) => {
    responseMetadata[key.replace(/-/g, "_")] = value
  })

  const logflareEventBody = {
    source: sourceKey,
    message: buildLogMessage(request, response),
    timestamp: new Date().toISOString(),
    metadata: {
      response: {
        headers: responseMetadata,
        origin_time: originTimeMs,
        status_code: response.status,
      },
      request: {
        url: rUrl,
        method: rMeth,
        headers: requestMetadata,
        cf: rCf,
      },
      logflare_cf_app: {
        version: LOGFLARE_CF_APP_VERSION,
        worker_id: workerId,
        worker_timestamp: workerTimestamp,
      },
    },
  }

  addToBatch(logflareEventBody, requestMetadata.cf_connecting_ip)

  return response
}

const resetBatch = () => {
  logEventsBatch = []
  batchIsRunning = false
}

const postBatch = async () => {
  const rHost = logEventsBatch[0].metadata.host
  const body = JSON.stringify({ batch: logEventsBatch, source: sourceKey })
  const request = {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      "User-Agent": `Cloudflare Worker via ${rHost}`,
    },
    body,
  }
  const response = await fetch(logflareApiURL, request)
  resetBatch()
  return true
}

const handleBatch = async event => {
  batchIsRunning = true
  await sleep(BATCH_INTERVAL_MS)
  try {
    if (logEventsBatch.length > 0) {
      return postBatch()
    }
  } catch (e) {
    resetBatch()
  }
}

const logRequests = async event => {
  if (!batchIsRunning) {
    event.waitUntil(handleBatch(event))
  }
  if (logEventsBatch.length >= maxRequestsPerBatch) {
    event.waitUntil(postBatch())
  }
  if (!workerTimestamp) {
    workerTimestamp = new Date().toISOString()
  }
  return handleRequest(event)
}

addEventListener("fetch", event => {
  event.passThroughOnException()

  event.respondWith(logRequests(event))
})
