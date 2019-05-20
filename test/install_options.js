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
  env: "test",
  source: "9684afe0-21b5-4ba5-92b3-049777a9f053",
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
