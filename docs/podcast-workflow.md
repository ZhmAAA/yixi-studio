# AI 播客编排工作流

对应 Linear [HUA-74](https://linear.app/huangming/issue/HUA-74)。核心是把人或 AI 搜集的材料组织成可核对的对谈稿；它与现有「问题 × 人物」一席生产流程并行，生成结果只进入 Studio 草稿。

## 当前链路

1. 粘贴或上传 txt / Markdown 进料，解析为来源、笔记和可选角色标签。
2. 选择访谈、辩论或圆桌；可以填主持人和多个发言者姓名。
3. 选择模板编排或模型生成，逐轮记录说话人、阶段、来源 ID 或笔记编号。模型模式还记录原文引用、材料摘要或 AI 演绎及依据原文。
4. 在 Studio 预览并保存至 SQLite / Postgres；可从列表重开并核对逐轮引用。
5. 生成音频计划与 SRT 占位结果，等待后续 TTS 供应商和真实时间轴接入。

## 三种形式

| 形式 | 参与者 | 结构 |
| --- | --- | --- |
| 访谈 | 1 位主持、1–3 位嘉宾 | 开场、基于材料追问、嘉宾回应、收束 |
| 辩论 | 1 位主持、2 位辩手 | 双方立论、双向质询与回应、双方总结、主持收束 |
| 圆桌 | 1 位主持、2–4 位嘉宾 | 逐人开场、跨人回应、主持收束 |

未填写姓名时，先读取进料中的角色标签，再使用该形式的默认姓名。多个姓名可在表单中用逗号、顿号或分号分隔。角色姓名必须彼此不同；人数或轮次预算不满足形式要求时明确拒绝。

模板模式使用确定性编排器，不调用模型；模型模式使用 OpenAI Agents SDK，基于完整信息包围绕实际议题写稿。辩论中的观点分工为演绎角色，不代表资料作者或被命名人物持有相应立场。所有稿件保留服务端固定 AI 演绎声明，需要编辑继续审阅。

## 真实模型模式

服务端设置 `OPENAI_API_KEY` 和 `AGENT_MODEL` 后可选择模型生成。默认 Responses API，也可通过 `OPENAI_BASE_URL` 与 `AGENT_API=chat_completions` 使用支持严格 JSON Schema 的兼容网关；不保证任意网关均兼容。参数参考 `.env.example`。

`PodcastDialogueEditor` 为单一 Agent，不提供工具、网页访问或 handoff。来源、笔记、标题、姓名和语气以待处理数据传入，不作为系统指令。模型按冻结的角色名单和轮数上限生成内容；该上限取本次预编排计划轮数，不要求逐句改写模板。结构化输出使用 Zod，依据 [官方 Agent 定义与 outputType 文档](https://developers.openai.com/api/docs/guides/agents/define-agents) 接入。

保存前重新校验序号、角色名单、全员发言、每种形式的阶段顺序、引用 ID 与笔记索引。每个引用必须有能在对应原文精确定位的 evidence；`quote` 类型的正文还必须保留对应引文。模型不能提供或覆盖稿件 ID、形式、角色名单、固定声明、模型名等服务端元数据。模型提供的 warnings 不作为审核结论；服务端重新计算未引用来源/笔记数量并固定提示继续核对。

这只能验证结构及引文位置，不能自动证明摘要忠实、事实成立或观点合理；`summary` 显示为材料摘要，`synthetic` 显示为 AI 演绎，均不表示已核实。覆盖计数按来源/笔记计，不代表已覆盖其全部限定和更正。

调用超时、限流、拒绝、认证错误、无效 JSON 或无效引用均不写入草稿，不自动降级、不自动重试。错误只返回受控提示，不回传供应商原始报错。默认 120 秒超时、12,000 输出 Token；每个服务进程最多 2 个并发调用。SDK tracing 关闭，Responses `store=false`。多实例共享限流和异步任务队列是后续工作。

成功稿件保存 `generation`：模式、provider、model、promptVersion、生成时间、耗时和可用的 Token 用量；完整信息包继续随稿件保存。失败运行当前返回安全错误码，不建立独立的失败运行审计表。

## 输入保真与覆盖范围

- 保留正文中的行内 URL、短否定、更正和后续限定；独立 URL 与来源标题中的 URL 记入来源信息。
- 进料最多 20,000 字；信息包最多 20 条来源（每条 8,000 字）、30 条笔记（每条 4,000 字）。超限会明确报错，不静默裁掉材料。
- 按完整句组合最多 600 字的材料片段。超过 600 字的单句要求先分句或换行。
- 模板按轮次预算选用材料，未覆盖片段的数量会显示在稿件上方。模型模式显示未引用来源/笔记数。编辑仍需核对限定与更正，必要时分批编排。
- 每轮 `sourceIds` 指向信息包来源；可选 `noteIndexes` 为笔记的零基索引。界面显示可跳转的来源和笔记编号；旧草稿缺少该字段仍可读取。

## 接口与数据

- `/studio/podcast`：形式选择、进料、编排与草稿列表。
- `/studio/podcast/[id]`：已保存草稿与逐轮引用。
- `POST /api/studio/podcasts`：`form` 为 `interview | debate | roundtable`；省略时默认访谈。`generationMode` 为 `template | model`，省略时默认模板以兼容旧请求。支持 `feedText`、`title`、`hostName`、`guestNames`、`collectedBy`；API 还可提供 `targetTurns`、`tone`（模板仅记录语气；模型会接收语气要求）。
- `GET /api/studio/podcasts` 与 `GET /api/studio/podcasts/[id]`：返回草稿摘要和详情。
- 统一入口为 `runPodcastOrchestration`；底层共享材料分片、引用和覆盖检查。
- 三种形式共用 `podcast_drafts` 表，保留 `form`；新增可空 `generation_json` 列，SQLite/Postgres 启动时兼容迁移。旧草稿无生成记录时展示为历史模板稿，不冒充模型稿。不增加公开发布通道。

上述页面和接口均受现有 Studio 鉴权保护。匿名不能读取或创建播客草稿，公开站不会展示它们。

## 音频边界

TTS、音频拼接尚为占位实现，不产出音频文件；SRT 按字符数估计时长，不是与真实音频对齐的字幕。辩论/圆桌新增角色只用于音频计划中的角色映射，不代表已接入不同真人声线。

| 变量 | 作用 |
| --- | --- |
| `TTS_PROVIDER` | 默认 `stub`；`elevenlabs`、`azure`、`volcengine` 尚无真实适配器 |
| `TTS_API_KEY` / `TTS_ENDPOINT` | 预留；当前不请求供应商 |
| `TTS_VOICE_HOST` / `TTS_VOICE_GUEST` / `TTS_VOICE_DEFAULT` | 音频计划声线配置 |
| `PODCAST_DB_PATH` | SQLite 路径；不设则跟 `EPISODE_DB_PATH`，再否则 `data/episodes.sqlite` |
| `DATABASE_URL` | Postgres 连接配置；配置后播客草稿走 Postgres |

## 验证

`npm test` 覆盖解析保真、三种模板结构、模型输出校验、SDK请求与错误路径、全员发言、逐轮引用、轮次预算、旧草稿兼容、音频占位及 SQLite 迁移回读，已加入 GitHub Actions。SDK测试使用模拟 HTTP 响应，不发送真实模型请求。`npm run lint` 与 `npm run build` 检查代码及构建。

真实账号/模型调用、真实音频、Postgres 实际实例及编辑对内容流畅度的主观验收必须分别记录，不能由模拟供应商响应或 CI 结果替代。
