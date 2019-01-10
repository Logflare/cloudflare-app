addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  rm = request.method
  rurl = request.url
  ua = request.headers.get('user-agent')
  cf_ray = request.headers.get('cf-ray')

  source_key = "12a26fa2-b9ea-4d4b-9209-dc9fc25fb758"
  api_key = "SL7NBVZbxN1C"

  const response = await fetch(request)

  sc = response.status
  cl = response.headers.get('content-legth')

  log_entry = rm + " | " + sc + " | " + cf_ray + " | " + rurl + " | " + ua

  const init = {
    method: 'POST',
    headers: {'X-API-KEY': api_key, 'Content-Type': 'application/json'},
    body: JSON.stringify({source: source_key, log_entry: log_entry})
  }

  const logflare = await fetch('https://logflare.app/api/logs', init)

  // console.log(ua)

  return response
}
