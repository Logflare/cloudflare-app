// window is not available in workers so we disable no-restricted-globals
/* eslint-disable no-restricted-globals */

async function handleRequest(request) {
  const rMeth = request.method
  const rUrl = request.url
  const uAgent = request.headers.get("user-agent")
  const cfRay = request.headers.get("cf-ray")

  const sourceKey = "12a26fa2-b9ea-4d4b-9209-dc9fc25fb758"
  const apiKey = "SL7NBVZbxN1C"

  const response = await fetch(request)

  const statusCode = response.status
  const contentLength = response.headers.get("content-legth")

  const logEntry = `${rMeth} | ${statusCode} | ${cfRay} | ${rUrl} | ${uAgent}`

  const init = {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ source: sourceKey, log_entry: logEntry }),
  }

  const logflare = await fetch("https://logflare.app/api/logs", init)

  // console.log(ua)

  return response
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})
