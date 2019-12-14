/* eslint-disable no-restricted-globals */
import {
  makeid,
  sleep,
  buildMetadataFromHeaders,
  buildLogMessage,
} from "./utils"

// Cloudflare App Options
const options = INSTALL_OPTIONS

// IpInfo
let ipInfoBackoff = 0

// Batching
const BATCH_INTERVAL_MS = 250
const MAX_REQUESTS_PER_BATCH = 100
const WORKER_ID = makeid(6)

let logEventsBatch = []
let workerTimestamp
let batchTimeoutStarted

// Backoff

const BACKOFF_INTERVAL = 10000
let backoff = 0

// IpInfo
const ipInfoToken = options.ipInfoApiKey
const ipInfoMaxAge = 86400

// Logflare API
const sourceKey = options.source
const apiKey = options.logflare.api_key
const logflareApiURL = "https://api.logflare.app/logs/cloudflare"

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
      return cachedResponse.json()
    }
    ipInfoBackoff = Date.now() + 10000
    return {
      error: await resp.text(),
    }
  }
  return cachedResponse.json()
}

async function addToBatch(body, connectingIp) {
  const enrichedBody = { ...body }
  try {
    if (ipInfoToken && ipInfoBackoff < Date.now()) {
      enrichedBody.metadata.request.ipData = await fetchIpDataWithCache(
        connectingIp,
      )
    }
  } catch (e) {
  }
  logEventsBatch.push(enrichedBody)
}

async function handleRequest(event) {
  const { request } = event

  const requestMetadata = buildMetadataFromHeaders(request.headers)

  const t1 = Date.now()
  const response = await fetch(request)
  const originTimeMs = Date.now() - t1

  const rUrl = request.url
  const rMeth = request.method
  const rCf = request.cf

  const responseMetadata = buildMetadataFromHeaders(response.headers)

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
      logflare_worker: {
        version: CF_APP_VERSION,
        worker_id: WORKER_ID,
        worker_started: workerTimestamp,
      },
    },
  }
  if (backoff <= Date.now()) {
    event.waitUntil(
      addToBatch(logflareEventBody, requestMetadata.cf_connecting_ip),
    )
  }

  return response
}

const postBatch = async () => {
  const batchInFlight = [...logEventsBatch]
  logEventsBatch = []
  const rHost = batchInFlight[0].metadata.host
  const body = JSON.stringify({ batch: batchInFlight, source: sourceKey })
  const request = {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      "User-Agent": `Cloudflare Worker via ${rHost}`,
    },
    body,
  }

  const resp = await fetch(logflareApiURL, request)
  if (resp.status === 403 || resp.status === 429) {
    backoff = Date.now() + BACKOFF_INTERVAL
  }
  return true
}

const scheduleBatch = async event => {
  if (!batchTimeoutStarted) {
    batchTimeoutStarted = true
    await sleep(BATCH_INTERVAL_MS)
    if (logEventsBatch.length > 0) {
      event.waitUntil(postBatch())
    }
    batchTimeoutStarted = false
  }
}

addEventListener("fetch", event => {
  event.passThroughOnException()
  event.waitUntil(sleep(30000))
  event.waitUntil(scheduleBatch(event))

  if (!workerTimestamp) {
    workerTimestamp = new Date().toISOString()
  }
  if (logEventsBatch.length >= MAX_REQUESTS_PER_BATCH) {
    event.waitUntil(postBatch())
  }

  event.respondWith(handleRequest(event))
})
