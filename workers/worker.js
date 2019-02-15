// window is not available in workers so we disable no-restricted-globals
/* eslint-disable no-restricted-globals */

async function handleRequest(event) {
  const { request } = event
  const rMeth = request.method
  const rUrl = request.url
  const rHost = request.headers.get("host")
  const uAgent = request.headers.get("user-agent")
  const cfRay = request.headers.get("cf-ray")
  const cIP = request.headers.get("cf-connecting-ip")

  const options = INSTALL_OPTIONS

  const sourceKey = options.source
  const apiKey = options.logflare.api_key

  const response = await fetch(request)

  const statusCode = response.status
  const contentLength = response.headers.get("content-legth")

  const logEntry = `${rMeth} | ${statusCode} | ${cIP} | ${cfRay} | ${rUrl} | ${uAgent}`

  const init = {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      "User-Agent": `Cloudflare Worker via ${rHost}`,
    },
    body: JSON.stringify({ source: sourceKey, log_entry: logEntry }),
  }

  event.waitUntil(fetch("https://logflare.app/api/logs", init))

  // console.log(cIP)

  return response
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event))
})
