/* eslint-disable global-require */
/* eslint-disable no-undef */

const assert = require("assert")

const fs = require("fs")
const Cloudworker = require("@dollarshaveclub/cloudworker")
const options = require("../staging/install_options")

const worker = fs.readFileSync("workers/worker.js", "utf8")

const bindings = { INSTALL_OPTIONS: options }

describe("Cloudflare Worker integration test", () => {
  it("request event is dispatched and handled successfully", async () => {
    const cw = new Cloudworker(worker, {
      enableCache: true,
      bindings,
    })
    const req = new Cloudworker.Request(
      "http://www.mocky.io/v2/5ce2d71f340000127b773780",
      {
        headers: {
          "cf-connecting-ip": "8.8.8.8",
        },
      },
    )

    const res = await cw.dispatch(req)

    assert.deepEqual(await res.json(), { status: "OK" })
  })
})
