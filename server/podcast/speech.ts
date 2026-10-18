import {
  EpisodeAudioPlanSchema,
  type DialogueScript,
  type EpisodeAudioPlan,
  type SubtitleCue
} from "@/server/podcast/contracts";

/**
 * 语音、拼接、字幕都走接口。
 * 未接供应商时用桩：估计时长、不产出音频字节、不读取 API key。
 *
 * 未来供应商读取这些环境变量，本模块现在不要求它们存在：
 * TTS_PROVIDER=stub | elevenlabs | azure | volcengine
 * TTS_API_KEY
 * TTS_ENDPOINT
 * TTS_VOICE_HOST
 * TTS_VOICE_GUEST
 * TTS_VOICE_DEFAULT
 */

export type TtsEnv = {
  TTS_PROVIDER?: string;
  TTS_API_KEY?: string;
  TTS_ENDPOINT?: string;
  TTS_VOICE_HOST?: string;
  TTS_VOICE_GUEST?: string;
  TTS_VOICE_DEFAULT?: string;
};

export type TtsSynthesizeInput = {
  text: string;
  speakerId: string;
  voiceId?: string;
};

export type TtsSegment = {
  speakerId: string;
  text: string;
  voiceId?: string;
  audio: Uint8Array | null;
  durationMs: number;
  format: "stub" | "audio/mpeg" | "audio/wav";
};

export type ConcatResult = {
  audio: Uint8Array | null;
  durationMs: number;
  format: string;
};

export interface TtsProvider {
  readonly id: string;
  synthesize(input: TtsSynthesizeInput): Promise<TtsSegment>;
}

export interface AudioConcatenator {
  concat(segments: TtsSegment[]): Promise<ConcatResult>;
}

export interface SubtitleWriter {
  toSrt(cues: SubtitleCue[]): string;
}

export interface SpeechPipeline {
  tts: TtsProvider;
  concatenator: AudioConcatenator;
  subtitles: SubtitleWriter;
  plan(script: DialogueScript): Promise<EpisodeAudioPlan>;
  cues(script: DialogueScript, plan: EpisodeAudioPlan): SubtitleCue[];
}

export function estimateSpeechMs(text: string) {
  const chars = [...text].length;
  return Math.max(1200, chars * 220);
}

export function formatSrtTime(ms: number) {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3600000);
  const minutes = Math.floor((clamped % 3600000) / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  const millis = clamped % 1000;
  const pad = (value: number, width = 2) => value.toString().padStart(width, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

export function renderSrt(cues: SubtitleCue[]) {
  return cues.map((cue) => (
    `${cue.index}\n${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}\n${cue.text}\n`
  )).join("\n");
}

function voiceFor(role: string | undefined, env: TtsEnv) {
  const fallback = env.TTS_VOICE_DEFAULT?.trim() || (role === "host" || role === "moderator" ? "stub-host" : "stub-guest");
  if (role === "host" || role === "moderator") return env.TTS_VOICE_HOST?.trim() || fallback;
  return env.TTS_VOICE_GUEST?.trim() || fallback;
}

export class StubTtsProvider implements TtsProvider {
  readonly id = "stub";

  async synthesize(input: TtsSynthesizeInput): Promise<TtsSegment> {
    return {
      speakerId: input.speakerId,
      text: input.text,
      voiceId: input.voiceId,
      audio: null,
      durationMs: estimateSpeechMs(input.text),
      format: "stub"
    };
  }
}

export class PendingTtsProvider implements TtsProvider {
  constructor(readonly id: string) {}

  async synthesize(): Promise<TtsSegment> {
    throw new Error(`TTS_PROVIDER=${this.id} 还没有适配器。当前请使用 TTS_PROVIDER=stub。`);
  }
}

export class StubAudioConcatenator implements AudioConcatenator {
  async concat(segments: TtsSegment[]): Promise<ConcatResult> {
    return {
      audio: null,
      durationMs: segments.reduce((sum, segment) => sum + segment.durationMs, 0),
      format: "stub"
    };
  }
}

export class SrtSubtitleWriter implements SubtitleWriter {
  toSrt(cues: SubtitleCue[]) {
    return renderSrt(cues);
  }
}

export function cuesFromScript(script: DialogueScript, plan: EpisodeAudioPlan): SubtitleCue[] {
  let cursor = 0;
  return script.turns.map((turn, index) => {
    const segment = plan.segments.find((item) => item.sequence === turn.sequence);
    const durationMs = segment?.durationMs ?? estimateSpeechMs(turn.text);
    const startMs = cursor;
    cursor += durationMs;
    const speaker = script.speakers.find((item) => item.id === turn.speakerId);
    return {
      index: index + 1,
      startMs,
      endMs: cursor,
      speakerId: turn.speakerId,
      text: `${speaker?.name ?? turn.speakerId}：${turn.text}`
    };
  });
}

function segmentsFrom(script: DialogueScript, synthesized: TtsSegment[], audioIncluded: boolean) {
  return synthesized.map((segment, index) => ({
    sequence: script.turns[index].sequence,
    speakerId: segment.speakerId,
    voiceId: segment.voiceId,
    text: segment.text,
    durationMs: segment.durationMs,
    audioIncluded
  }));
}

function readTtsEnv(env: NodeJS.ProcessEnv = process.env): TtsEnv {
  return {
    TTS_PROVIDER: env.TTS_PROVIDER,
    TTS_API_KEY: env.TTS_API_KEY,
    TTS_ENDPOINT: env.TTS_ENDPOINT,
    TTS_VOICE_HOST: env.TTS_VOICE_HOST,
    TTS_VOICE_GUEST: env.TTS_VOICE_GUEST,
    TTS_VOICE_DEFAULT: env.TTS_VOICE_DEFAULT
  };
}

export function createSpeechPipeline(env: TtsEnv = readTtsEnv()): SpeechPipeline {
  const providerId = env.TTS_PROVIDER?.trim() || "stub";
  const tts: TtsProvider = providerId === "stub" ? new StubTtsProvider() : new PendingTtsProvider(providerId);
  const concatenator = new StubAudioConcatenator();
  const subtitles = new SrtSubtitleWriter();

  return {
    tts,
    concatenator,
    subtitles,
    async plan(script) {
      const estimated: TtsSegment[] = [];
      for (const turn of script.turns) {
        const speaker = script.speakers.find((item) => item.id === turn.speakerId);
        const voiceId = voiceFor(speaker?.role, env);
        if (tts.id === "stub") {
          estimated.push(await tts.synthesize({ text: turn.text, speakerId: turn.speakerId, voiceId }));
        } else {
          estimated.push({
            speakerId: turn.speakerId,
            text: turn.text,
            voiceId,
            audio: null,
            durationMs: estimateSpeechMs(turn.text),
            format: "stub"
          });
        }
      }
      const joined = await concatenator.concat(estimated);
      return EpisodeAudioPlanSchema.parse({
        scriptId: script.id,
        providerId: tts.id,
        status: tts.id === "stub" ? "stub" : "planned",
        segments: segmentsFrom(script, estimated, false),
        totalDurationMs: joined.durationMs
      });
    },
    cues(script, plan) {
      return cuesFromScript(script, plan);
    }
  };
}
