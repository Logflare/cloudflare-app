/* eslint-disable global-require */
/* eslint-disable no-undef */

before(async () => {
  Object.assign(
    global,
    new (require("@dollarshaveclub/cloudworker"))(
      require("fs").readFileSync("workers/worker.js", "utf8"),
    ).context,
  )
})
const assert = require("assert")

describe("Cloudflare Worker test", () => {
  it("correctly fetches IP data from ipinfo.io", async () => {
    const ipData = await fetchIpData("8.8.8.8")
    assert.deepEqual(ipData, {
      city: "Mountain View",
      country: "US",
      hostname: "google-public-dns-a.google.com",
      ip: "8.8.8.8",
      loc: "37.3860,-122.0840",
      org: "AS15169 Google LLC",
      phone: "650",
      postal: "94035",
      region: "California",
    })
  })
})
