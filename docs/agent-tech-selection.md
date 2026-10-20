# Agent 技术选型

## 当前实现状态

播客访谈、辩论和圆桌已按本方案接入 `@openai/agents`，由 `AGENT_MODEL` 显式选择模型。单 Agent 使用结构化输出、服务端引用/节目结构校验及草稿生成记录；仍需有效服务端配置完成真实账号联调。原「问题 × 人物」演示编排器尚未切换模型，真实音频也未接入。当前实现边界与配置见 [播客工作流](./podcast-workflow.md)。

## 结论

第一版采用：

- 运行时：TypeScript / Node.js
- 编排：`@openai/agents`
- 结构化输出与校验：`zod`
- 模型接入：通过 Agents SDK 的 OpenAI provider，模型名由 `AGENT_MODEL` 环境变量配置
- 接口层：Next.js Route Handler 作为 BFF/API
- 数据：第一阶段 seed repository，随后接 Postgres
- 异步：第一阶段同步跑通，随后增加 queue + worker

第一版不引入 LangChain、CrewAI 或多 Agent handoff，也不把 Agent 暴露成面向用户的聊天机器人。

## 为什么这样选

一席话的 Agent 任务是“基于编辑策划单生成一场有来源的对谈”，不是开放式自主探索。核心要求是：

- 输入边界稳定
- 输出必须是严格 JSON
- 每轮发言要有 provenance 和 citationIds
- 能检查禁止断言和人物边界
- 能记录 prompt、模型、耗时、错误和重试
- 后续可以加工具和人工审核

OpenAI Agents SDK 的 Agent、function tool、guardrail、structured output 和 tracing primitives 足够覆盖第一版；Zod 负责把模型输出变成可校验的领域对象。

## Agent 组成

第一版只保留一个编排器：

```text
DialogueOrchestrator
  ├── buildEditorialBrief()
  ├── generateOutline()
  ├── generateTurns()
  ├── validateCitations()
  ├── validateBoundaries()
  └── buildEpisodeDraft()
```

后续需要时再拆：

- SourceResearchAgent：资料整理
- DialogueAgent：对谈生成
- QAAgent：引用、风险与事实检查

拆分条件是质量或运行规模确实需要，而不是为了“看起来像 Agent 系统”。

## 输入契约

Agent 只接收冻结后的 `EditorialBrief`：

- question
- neutralFraming
- background
- discussionAngles
- tensionPoints
- personCards
- sourceSnapshots
- prohibitedClaims
- episodeFormat
- durationTarget
- disclosure
- promptVersion

Agent 不自行决定邀请谁，也不直接从未审核网页中选择人物观点。

## 输出契约

```ts
type EpisodeDraft = {
  title: string;
  turns: Array<{
    sequence: number;
    speakerId: string;
    text: string;
    provenance: "fact" | "quote" | "summary" | "synthetic";
    citationIds: string[];
  }>;
  warnings: string[];
  disclosure: string;
};
```

后端必须在保存前再次校验：

- speakerId 是否来自入席人物
- citationIds 是否来自 sourceSnapshot
- quote 是否存在对应原文来源
- 是否包含禁止断言
- 是否包含固定 AI 演绎声明
- 是否满足轮次和时长要求

## 后端接口

- `POST /api/episodes`：创建 `pending` Episode
- `POST /api/episodes/:id/generate`：触发 Agent
- `GET /api/episodes/:id`：返回状态和结果
- `GET /api/episodes/:id/stream`：后续提供进度流

前端永远只调用后端，不直接调用模型 Provider。

## AgentRun 记录

每次运行保留：

- episodeId
- agentName
- promptVersion
- model
- inputSnapshotId
- outputSchemaVersion
- status
- latencyMs
- tokenUsage
- warnings
- error
- createdAt

这让每期对谈可重试、可比较、可评估。

## 开发顺序

1. 先定义 Question、Person、Source、EditorialBrief、EpisodeDraft 的 Zod schema
2. 建立 Episode 创建接口和状态机
3. 用固定演示生成器跑通前端到结果页
4. 接入一个 DialogueOrchestrator
5. 加引用与边界校验
6. 建立 10–20 个固定问题/人物组合的评测集
7. 生成耗时或并发上升后，再拆 queue + Agent worker

## 暂不做

- 多 Agent 自由 handoff
- 开放网页漫游式研究
- 用户自定义人物
- 语音克隆
- 长期记忆
- 直接让模型写数据库
