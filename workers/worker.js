// window is not available in workers so we disable no-restricted-globals
/* eslint-disable no-restricted-globals */

async function handleRequest(request) {
  const rMeth = request.method
  const rUrl = request.url
  const uAgent = request.headers.get("user-agent")
  const cfRay = request.headers.get("cf-ray")
  const cIP= request.headers.get("cf-connecting-ip")

  const sourceKey = "YOUR_SOURCE_KEY"
  const apiKey = "YOUR_API_KEY"

  const response = await fetch(request)

  const statusCode = response.status
  const contentLength = response.headers.get("content-legth")

  const logEntry = `${rMeth} | ${statusCode} | ${cIP} | ${cfRay} | ${rUrl} | ${uAgent}`

  const init = {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ source: sourceKey, log_entry: logEntry }),
  }

  const logflare = await fetch("https://logflare.app/api/logs", init)

  // console.log(cIP)

  return response
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})
