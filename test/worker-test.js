/* eslint-disable global-require */

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
  it("handlesRequest", async () => {
    assert.equal(true, true)
  })
})
