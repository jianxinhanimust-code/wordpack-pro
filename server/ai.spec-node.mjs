import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWordPackServer } from './start.mjs'

async function listen(server, test) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  test.after(() => {
    server.closeAllConnections()
    return new Promise(resolve => server.close(resolve))
  })
  return `http://127.0.0.1:${server.address().port}`
}

function post(origin, body, requestOrigin = origin) {
  return fetch(`${origin}/api/ai`, {
    method: 'POST',
    headers: { origin: requestOrigin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('works without configured AI or exposing credential state details', async t => {
  const origin = await listen(createWordPackServer({ env: {} }), t)
  const status = await fetch(`${origin}/api/ai`)
  assert.deepEqual(await status.json(), { available: false })
  const response = await post(origin, { word: 'adapt', purpose: 'explain' })
  assert.equal(response.status, 503)
  assert.match(response.headers.get('cache-control'), /no-store/)
})

test('same-origin AI uses server-only credentials and sends only the requested exercise inputs', async t => {
  let upstreamCalls = 0
  const upstream = await listen(createServer(async (req, res) => {
    upstreamCalls++
    assert.equal(req.url, '/v1/chat/completions')
    assert.equal(req.headers.authorization, 'Bearer wordpack-test-only')
    let body = ''
    for await (const chunk of req) body += chunk
    const input = JSON.parse(body)
    assert.equal(input.model, 'mock-model')
    assert.match(input.messages[1].content, /adapt/)
    assert.doesNotMatch(input.messages[1].content, /never-send/)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ choices: [{ message: { content: 'adapt 表示适应。' } }] }))
  }), t)
  const origin = await listen(createWordPackServer({ env: {
    WORDPACK_AI_BASE_URL: `${upstream}/v1`,
    WORDPACK_AI_API_KEY: 'wordpack-test-only',
    WORDPACK_AI_MODEL: 'mock-model',
  } }), t)
  const maliciousOrigin = await post(origin, { word: 'adapt', purpose: 'explain' }, 'http://other.example')
  assert.equal(maliciousOrigin.status, 403)
  const malformed = await post(origin, { word: 'adapt', purpose: 'context' })
  assert.equal(malformed.status, 400)
  const response = await post(origin, {
    word: 'adapt', purpose: 'explain', context: 'never-send', mistakes: ['never-send'],
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { answer: 'adapt 表示适应。' })
  assert.equal(upstreamCalls, 1)
})
