# AI 播客编排工作流

对应 Linear [HUA-74](https://linear.app/huangming/issue/HUA-74)。这一篇只说明工作流边界，以及这一版代码实际跑通了哪一段。

## 这是工作流，不是技能包

要做的是一条生产流程：进料进来，编排成听得下去的长对话，再按时间轴接上语音和字幕。核心是**编排保流畅**。进料可以是用户搜集的，也可以是 AI 搜集的，不要求先做成观点汇总。

它不是可复用的 Agent 技能包，也不替代一席话现有的问题 × 人物对谈。`DialogueOrchestrator` 仍只给编辑部一席草稿出建议。播客访谈走旁边这条 Studio 路径，草稿不进入公开页。

## 五段

1. **进料**。用户或 AI 交来的材料，先整理成信息包：来源、笔记，以及可选的角色 / 话题标签。
2. **编排**。按形式把角色和回合排成流畅长对话。形式预留访谈、辩论、圆桌。
3. **TTS**。文字转语音。供应商以后再测，接口先留好。
4. **拼接**。按时间轴把各段音频接成一集。
5. **字幕**。对齐字幕轨，例如 SRT。

## 这一版实现了什么

- 领域类型和 Zod 校验：`InformationPackage`、`OrchestrationRequest`（`interview | debate | roundtable`）、`DialogueScript`，以及 `EpisodeAudioPlan`、`SubtitleCue`。
- `InterviewOrchestrator`：确定性访谈编排，不调用模型。主持人开场、嘉宾按材料接话，再追问和收束。按完整句组合材料片段，保留短句、更正及限定；每位配置的嘉宾都会发言。
- Studio：`/studio/podcast` 粘贴或上传进料，编排后预览回合。草稿写入与一席相同的 SQLite / Postgres 路径（表 `podcast_drafts`）。
- 语音、拼接、字幕只有接口和桩实现。未设置供应商时不会发请求，也不需要 API key。
- 辩论和圆桌只出现在请求类型里，调用会明确拒绝。

公开页仍只展示已发布一席。工作台密码、`ALLOW_PUBLIC_CREATE` 和固定演绎声明的行为没有改。

## 路径

- 页面：`/studio/podcast`，单条草稿：`/studio/podcast/[id]`
- `POST /api/studio/podcasts`：进料 → 信息包 → 访谈稿 → 音频计划与 SRT 桩
- `GET /api/studio/podcasts` 与 `GET /api/studio/podcasts/[id]`
- 以上都在现有 `/studio` 与 `/api/studio` 鉴权后面

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `TTS_PROVIDER` | `stub`（默认）。预留 `elevenlabs`、`azure`、`volcengine`，尚未接适配器 |
| `TTS_API_KEY` | 未来供应商密钥。桩实现不读取 |
| `TTS_ENDPOINT` | 未来供应商地址 |
| `TTS_VOICE_HOST` | 主持人声线 |
| `TTS_VOICE_GUEST` | 嘉宾声线 |
| `TTS_VOICE_DEFAULT` | 未指定角色声线时的回退 |
| `PODCAST_DB_PATH` | 可选。不设则跟 `EPISODE_DB_PATH`，再否则 `data/episodes.sqlite` |
| `DATABASE_URL` | 与一席相同。`postgres://` 或 `postgresql://` 时草稿进 Postgres |

`TTS_PROVIDER` 设成尚未实现的名字时，访谈稿仍会生成，音频计划标为 `planned`，不会去请求供应商。

## 输入与验收边界

- 进料中的行内链接和短更正不会被删除；独立链接与来源标题中的链接记入来源信息。
- 信息包最多 20 条来源（每条 8,000 字）、30 条笔记（每条 4,000 字）。超过上限会明确拒绝，请分批输入；不会成功保存被静默截断的资料。
- 访谈按完整句组合成最多 600 字的片段。超过 600 字的单句要求先分句/换行，避免截断语义。
- 默认最多 23 轮；材料超出轮次预算时，稿件上方显示覆盖数量与未覆盖提示。编辑仍需核查遗漏片段中的限定与更正，不能把部分编排视为覆盖全部资料。
- 最多 3 位嘉宾，姓名须彼此不同且不同于主持人；轮次预算不足以让所有人发言时明确拒绝。
- `npm test` 运行解析、引用保真、嘉宾覆盖、音频占位和 SQLite 回归测试，并纳入 GitHub Actions。真实模型、TTS 与主观内容质量仍需后续验收。
