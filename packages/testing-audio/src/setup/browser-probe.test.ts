import { afterEach, describe, expect, it, vi } from 'vitest'

import { stubForBrowser } from './browser-probe'

class TestWebSocket extends EventTarget {
  send(_data: string | ArrayBufferLike | Blob | ArrayBufferView): void {}

  close(): void {}

  receive(data: string | ArrayBuffer): void {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

function receive(socket: WebSocket, data: string | ArrayBuffer): void {
  if (!(socket instanceof TestWebSocket))
    throw new Error('The browser probe did not retain the test WebSocket transport.')
  socket.receive(data)
}

describe('audio browser probe', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('observes official ASR and streaming TTS without recording TTS control content', () => {
    // ROOT CAUSE:
    // The probe only recognized Aliyun sockets, so the official ASR and streaming
    // TTS pipeline could run while Testing audio reported no transcript or audio.
    // Both protocol routes now expose only the events needed for acceptance.
    vi.stubGlobal('window', {
      WebSocket: TestWebSocket,
      fetch: vi.fn(),
      location: { href: 'https://test.airi.example/chat' },
    })
    vi.stubGlobal('BroadcastChannel', class {
      addEventListener(): void {}
    })
    vi.spyOn(console, 'info').mockImplementation(() => {})

    stubForBrowser('test-pinia-actions')

    const asr = new window.WebSocket('wss://test.airi.example/api/v1/audio/transcriptions/ws')
    asr.send(new Uint8Array(8192))
    receive(asr, JSON.stringify({ event: 'session.started' }))
    receive(asr, JSON.stringify({ event: 'transcript.text.snapshot', text: 'Please say hello.', isFinal: true }))

    const tts = new window.WebSocket('wss://test.airi.example/api/v1/audio/speech/ws')
    tts.send(JSON.stringify({ event: 'start', apiKey: 'must-not-be-recorded' }))
    receive(tts, JSON.stringify({ event: 'session.started' }))
    receive(tts, new ArrayBuffer(2048))
    receive(tts, JSON.stringify({ event: 'session.finished' }))

    const state = window.__airiAudioInputE2E
    expect(state?.streamingTranscriptionReady).toBe(true)
    expect(state?.transcriptionAudio).toHaveLength(1)
    expect(state?.transcriptionAudio[0]?.format).toBe('pcm')
    expect(state?.transcriptionResults).toEqual(['Please say hello.'])
    expect(state?.streamingTts).toEqual({ sessionsStarted: 1, sessionsFinished: 1, audioBytes: 2048 })
    expect(JSON.stringify(state)).not.toContain('must-not-be-recorded')
  })
})
