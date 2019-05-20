const ipInfoToken = process.env.IPINFO_API_TOKEN
const logflareApiKey = process.env.LOGFLARE_API_KEY

const headers = [
  "rMeth",
  "rUrl",
  "uAgent",
  "cfRay",
  "cIP",
  "statusCode",
  "contentLength",
  "cfCacheStatus",
  "contentType",
  "responseConnection",
  "requestConnection",
  "cacheControl",
  "acceptRanges",
  "expectCt",
  "expires",
  "lastModified",
  "vary",
  "server",
  "etag",
  "date",
  "transferEncoding",
]

const options = {
  source: "js_worker_testing_source",
  logflare: {
    api_key: logflareApiKey,
  },
  metadata: {
    headers,
  },
  services: {
    ipData: {
      ipinfoIo: {
        token: ipInfoToken,
      },
    },
  },
}

module.exports = options
