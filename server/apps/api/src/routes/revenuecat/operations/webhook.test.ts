import { createHmac } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../../utils/error'
import { createWebhookOperation } from './webhook'

const signingSecret = 'test-signing-secret'
const authorization = 'test-authorization-value'

function signBody(rawBody: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = createHmac('sha256', signingSecret).update(`${timestamp}.${rawBody}`).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

function setup(secrets = { authorization, signingSecret } as { authorization: string | null, signingSecret: string | null }) {
  const reconcile = vi.fn(async (_userId: string) => {})
  const add = vi.fn()
  const webhook = createWebhookOperation({ reconcile }, secrets, { revenuecatEvents: { add } })

  /** Sends a correctly signed delivery of `body`. */
  function deliver(body: unknown) {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body)
    return webhook(rawBody, { authorization, signature: signBody(rawBody) })
  }

  return { reconcile, add, webhook, deliver }
}

function webhookBody(overrides = {}) {
  return {
    api_version: '1.0',
    event: { type: 'INITIAL_PURCHASE', id: 'sub-event-1', app_user_id: 'user-1', ...overrides },
  }
}

describe('revenuecat webhook metrics', () => {
  it('counts a reconciled event as processed', async () => {
    const { add, deliver, reconcile } = setup()

    await deliver(webhookBody())

    expect(reconcile).toHaveBeenCalledWith('user-1')
    expect(add.mock.calls).toEqual([[1, { event_type: 'INITIAL_PURCHASE', outcome: 'processed' }]])
  })

  it('counts a TEST event as processed', async () => {
    const { add, deliver } = setup()

    await deliver(webhookBody({ type: 'TEST' }))

    expect(add.mock.calls).toEqual([[1, { event_type: 'TEST', outcome: 'processed' }]])
  })

  it('counts a reconciliation error as failed and keeps the error', async () => {
    const { add, deliver, reconcile } = setup()
    const error = new ApiError(502, 'BAD_GATEWAY', 'RevenueCat subscriber request failed')
    reconcile.mockRejectedValueOnce(error)

    await expect(deliver(webhookBody({ type: 'RENEWAL' }))).rejects.toBe(error)

    expect(add.mock.calls).toEqual([[1, { event_type: 'RENEWAL', outcome: 'failed' }]])
  })

  it('counts a request with a wrong authorization as rejected', async () => {
    const { add, webhook, reconcile } = setup()
    const rawBody = JSON.stringify(webhookBody())

    await expect(webhook(rawBody, { authorization: 'wrong', signature: signBody(rawBody) }))
      .rejects
      .toMatchObject({ statusCode: 401 })

    expect(reconcile).not.toHaveBeenCalled()
    expect(add.mock.calls).toEqual([[1, { event_type: 'unknown', outcome: 'rejected', reason: 'unauthorized' }]])
  })

  it('counts a request with a wrong signature as rejected', async () => {
    const { add, webhook } = setup()

    await expect(webhook(JSON.stringify(webhookBody()), { authorization, signature: 't=123,v1=deadbeef' }))
      .rejects
      .toMatchObject({ statusCode: 401 })

    expect(add.mock.calls).toEqual([[1, { event_type: 'unknown', outcome: 'rejected', reason: 'unauthorized' }]])
  })

  it('counts a request as rejected when no secret is configured', async () => {
    const { add, webhook } = setup({ authorization: null, signingSecret: null })

    await expect(webhook(JSON.stringify(webhookBody()), { authorization: null, signature: null }))
      .rejects
      .toMatchObject({ statusCode: 503 })

    expect(add.mock.calls).toEqual([[1, { event_type: 'unknown', outcome: 'rejected', reason: 'not_configured' }]])
  })

  it('counts a signed body that is not JSON as rejected', async () => {
    const { add, deliver } = setup()

    await expect(deliver('not json')).rejects.toMatchObject({ statusCode: 400 })

    expect(add.mock.calls).toEqual([[1, { event_type: 'unknown', outcome: 'rejected', reason: 'invalid_payload' }]])
  })

  it('counts a signed body that is not a webhook event as rejected', async () => {
    const { add, deliver, reconcile } = setup()

    await expect(deliver({ api_version: '1.0' })).rejects.toMatchObject({ statusCode: 400 })

    expect(reconcile).not.toHaveBeenCalled()
    expect(add.mock.calls).toEqual([[1, { event_type: 'unknown', outcome: 'rejected', reason: 'invalid_payload' }]])
  })

  it('works without metrics', async () => {
    const reconcile = vi.fn(async (_userId: string) => {})
    const webhook = createWebhookOperation({ reconcile }, { authorization, signingSecret }, null)
    const rawBody = JSON.stringify(webhookBody())

    await expect(webhook(rawBody, { authorization, signature: signBody(rawBody) })).resolves.toEqual({ received: true })
  })
})
