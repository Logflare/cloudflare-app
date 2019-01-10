addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  var rMeth = request.method
  var rUrl = request.url
  var uAgent = request.headers.get("user-agent")
  var cfRay = request.headers.get("cf-ray")

  var sourceKey = "12a26fa2-b9ea-4d4b-9209-dc9fc25fb758"
  var apiKey = "SL7NBVZbxN1C"

  const response = await fetch(request)

  var statusCode = response.status
  var contentLength = response.headers.get("content-legth")

  var logEntry = `${rMeth} | ${statusCode} | ${cfRay} | ${rUrl} | ${uAgent}`

  const init = {
    method: "POST",
    headers: { "X-API-KEY": api_key, "Content-Type": "application/json" },
    body: JSON.stringify({ source: source_key, logEntry }),
  }

  const logflare = await fetch("https://logflare.app/api/logs", init)

  // console.log(ua)

  return response
}
