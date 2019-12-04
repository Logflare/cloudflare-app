/* eslint-disable global-require */
/* eslint-disable no-undef */

const assert = require("assert")

const fs = require("fs")
const Cloudworker = require("@dollarshaveclub/cloudworker")
const options = require("../staging/install_options")

const worker = fs.readFileSync("workers/worker.js", "utf8")

const bindings = { INSTALL_OPTIONS: options }

const ipInfoDataFor8888 = {
  city: "Mountain View",
  country: "US",
  hostname: "google-public-dns-a.google.com",
  ip: "8.8.8.8",
  loc: "37.3860,-122.0840",
  org: "AS15169 Google LLC",
  phone: "650",
  postal: "94035",
  region: "California",
}

before(async () => {
  const { context } = new Cloudworker(worker, {
    enableCache: true,
    bindings,
  })
  Object.assign(global, context)
})

describe("Cloudflare Worker test", () => {
  it("correctly fetches and caches fetched IP data from ipinfo.io", async () => {
    const initialResponse = await fetchIpDataWithCache("8.8.8.8")
    const initialJson = await initialResponse.json()
    assert.equal(initialResponse.headers.get("cf-cache-status"), null)
    assert.deepEqual(initialJson, ipInfoDataFor8888)

    const cachedResponse = await fetchIpDataWithCache("8.8.8.8")
    const cachedJson = await cachedResponse.json()
    assert.equal(cachedResponse.headers.get("cf-cache-status"), "HIT")
    assert.deepEqual(cachedJson, ipInfoDataFor8888)
  })

  it("correctly builds Logflare POST request", async () => {
    const logEntry = "log message"
    const metadata = { request: { headers: {} }, response: { headers: {} } }
    const payload = buildLogflareRequest(logEntry, metadata)
    const apiKey = process.env.LOGFLARE_API_KEY
    assert.deepEqual(payload, {
      body: `{"source":"${
        options.source
      }","log_entry":"log message","metadata":{"data":{"request":{"headers":{}},"response":{"headers":{}}}}}`,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Cloudflare Worker Debug",
        "X-API-KEY": apiKey,
      },
      method: "POST",
    })
  })

  it("correctly POSTs logs to Logflare API", async () => {
    const apiKey = process.env.LOGFLARE_API_KEY
    const sourceId = process.env.LOGFLARE_TEST_SOURCE
    const init = {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        "User-Agent": `Cloudflare Worker via 0.0.0.0`,
      },
      body: {
        source: sourceId,
        log_entry: "Message from Cloudflare worker testing",
        metadata: {
          request: {
            cf: {
              asn: 15169,
              clientTrustScore: 1,
              colo: "DFW",
              country: "US",
              httpProtocol: "HTTP/1.1",
              requestPriority: "",
              tlsCipher: "ECDHE-ECDSA-AES128-GCM-SHA256",
              tlsClientAuth: {
                certFingerprintSHA1: "",
                certIssuerDN: "",
                certIssuerDNLegacy: "",
                certIssuerDNRFC2253: "",
                certNotAfter: "",
                certNotBefore: "",
                certPresented: "0",
                certSerial: "",
                certSubjectDN: "",
                certSubjectDNLegacy: "",
                certSubjectDNRFC2253: "",
                certVerified: "NONE",
              },
              tlsVersion: "TLSv1.2",
            },
            headers: {
              accept: "text/plain,text/html,*/*",
              accept_encoding: "gzip",
              cf_connecting_ip: "66.249.73.70",
              cf_ipcountry: "US",
              cf_ray: "4d77c945dd49d25e",
              cf_visitor: '{"scheme":"https"}',
              connection: "Keep-Alive",
              host: "logflare.app",
              user_agent:
                "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
              x_forwarded_proto: "https",
              x_real_ip: "66.249.73.70",
            },
            method: "GET",
            url: "https://logflare.app/robots.txt",
          },
          response: {
            headers: {
              accept_ranges: "bytes",
              cache_control: "public, max-age=14400",
              cf_cache_status: "EXPIRED",
              cf_ray: "4d77c945d77dd25e-DFW",
              connection: "keep-alive",
              content_length: "202",
              content_type: "text/plain",
              date: "Wed, 15 May 2019 20:15:50 GMT",
              etag: '"5cdc59bc-ca"',
              expect_ct:
                'max-age=604800, report-uri="https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct"',
              expires: "Thu, 16 May 2019 00:15:50 GMT",
              last_modified: "Wed, 15 May 2019 18:26:04 GMT",
              server: "cloudflare",
              vary: "Accept-Encoding",
            },
            origin_time: 201,
            status_code: 200,
          },
        },
      },
    }
    const resp = await postLogs(init, "8.8.8.8")

    assert.deepEqual(resp, { message: "Logged!" })
  })
})
