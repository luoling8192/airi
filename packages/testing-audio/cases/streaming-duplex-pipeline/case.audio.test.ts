import { IOAttributes, IOSpanNames } from '@proj-airi/stage-shared/perf/io-trace'

import { describe, expect, it } from '../../src'
import { configureModuleConsciousness, configureModuleHearing, configureModuleSpeech, configureOnboarding, loadCaseEnvironment } from '../shared/configurations'
import { configureStorage } from '../shared/configurations/storage'
import { assistantMessages, enableChatMicrophone } from '../shared/interactions'

describe('bidirectional audio pipeline', () => {
  it('streams official ASR into official chat and plays official streaming TTS', {
    input: new URL('../single-utterance-pipeline/input.test.wav', import.meta.url),
    preflight: [
      async (context) => {
        const environment = await loadCaseEnvironment(context.env)
        const enabled = environment.TESTING_AUDIO_RUN_STREAMING_PIPELINE === '1'
        context.skip(!enabled, 'Set TESTING_AUDIO_RUN_STREAMING_PIPELINE=1 to run this paid end-to-end case.')
        if (!enabled)
          return

        const serverUrl = context.env.VITE_SERVER_URL
        const accessToken = environment.TESTING_AUDIO_AIRI_ACCESS_TOKEN
        context.skip(!serverUrl || !accessToken, 'Export VITE_SERVER_URL and set TESTING_AUDIO_AIRI_ACCESS_TOKEN for the same test server.')
        if (!serverUrl || !accessToken)
          return

        await configureStorage(context.runtime, { 'auth/v1/token': accessToken })
      },
      configureOnboarding(() => ({ completed: true })),
      configureModuleHearing(() => ({
        provider: {
          id: 'official-provider-transcription',
          definitionId: 'official-provider-transcription',
          model: 'auto',
          config: {},
        },
        captureFormat: 'pcm',
      })),
      configureModuleConsciousness(() => ({
        provider: {
          id: 'official-provider',
          definitionId: 'official-provider',
          model: 'auto',
          config: {},
        },
      })),
      configureModuleSpeech(async (context) => {
        const environment = await loadCaseEnvironment(context.env)
        const model = environment.TESTING_AUDIO_OFFICIAL_TTS_MODEL
        const voice = environment.TESTING_AUDIO_OFFICIAL_TTS_VOICE
        context.skip(!model || !voice, 'Set TESTING_AUDIO_OFFICIAL_TTS_MODEL and TESTING_AUDIO_OFFICIAL_TTS_VOICE for the configured official streaming catalog.')
        if (!model || !voice)
          return undefined

        return {
          provider: {
            id: 'official-provider-speech-streaming',
            definitionId: 'official-provider-speech-streaming',
            model,
            config: {},
          },
          voice,
        }
      }),
    ],
  }, async ({ audio }) => {
    await enableChatMicrophone(audio, { readiness: 'streaming-transcription' })

    await expect(audio).toHaveCapturedTranscriptionAudio({ count: 1, minimumBytes: 8000 })
    await expect(audio).toHaveTranscriptions([['Please say hello.']], { match: 'contains' })
    await expect(audio).toHaveCompletedTranscription()

    const updates = await audio.streamingTranscriptionUpdates()
    expect(new Set(updates).size, 'The chat input must show interim ASR text before the final transcript.').toBeGreaterThan(1)

    await assistantMessages(audio).first().waitFor({ state: 'visible', timeout: 60_000 })
    await expect.poll(async () => {
      const spans = await audio.completedSpans(IOSpanNames.LLMInference)
      return spans.some(span => Number(span.attributes[IOAttributes.LLMTextLength]) > 0)
    }, { timeout: 60_000 }).toBe(true)

    await audio.runtimePage.waitForFunction(() => {
      const tts = window.__airiAudioInputE2E?.streamingTts
      return Boolean(tts && tts.sessionsStarted > 0 && tts.sessionsFinished > 0 && tts.audioBytes > 0)
    }, undefined, { timeout: 90_000 })
    await expect.poll(async () => {
      const spans = await audio.completedSpans(IOSpanNames.AudioPlayback)
      return spans.some(span => span.attributes[IOAttributes.TTSInterrupted] !== true)
    }, { timeout: 90_000 }).toBe(true)

    const { streamingTts } = await audio.snapshot()
    expect(streamingTts.sessionsStarted).toBeGreaterThan(0)
    expect(streamingTts.sessionsFinished).toBeGreaterThan(0)
    expect(streamingTts.audioBytes).toBeGreaterThan(0)
  })
})
