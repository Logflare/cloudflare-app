addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  rMeth = request.method
  rUrl = request.url
  uAgent = request.headers.get("user-agent")
  cfRay = request.headers.get("cf-ray")

  sourceKey = "12a26fa2-b9ea-4d4b-9209-dc9fc25fb758"
  apiKey = "SL7NBVZbxN1C"

  const response = await fetch(request)

  statusCode = response.status
  contentLength = response.headers.get("content-legth")

  log_entry = `${rMeth} | ${statusCode} | ${cfRay} | ${rUrl} | ${uAgent}`

  const init = {
    method: "POST",
    headers: { "X-API-KEY": api_key, "Content-Type": "application/json" },
    body: JSON.stringify({ source: source_key, log_entry }),
  }

  const logflare = await fetch("https://logflare.app/api/logs", init)

  // console.log(ua)

  return response
}
