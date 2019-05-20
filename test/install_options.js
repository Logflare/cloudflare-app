const ipInfoToken = process.env.IPINFO_API_TOKEN
const logflareApiKey = process.env.LOGFLARE_API_KEY
const logflareSource = process.env.LOGFLARE_TEST_SOURCE

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
  env: "test",
  source: logflareSource,
  logflare: {
    api_key: logflareApiKey,
  },
  metadata: headers,
  services: {
    ipData: {
      ipinfoIo: {
        token: ipInfoToken,
        maxAge: "86400",
      },
    },
  },
}

module.exports = options
