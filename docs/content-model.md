# 内容模型

## Topic / 问题主题

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定标识 |
| `type` | `hot` 或 `classic` |
| `title` | 主题名称 |
| `summary` | 一句话背景 |
| `tags` | 分类与检索标签 |
| `sourceIds` | 关联来源 |
| `publishedAt` | 首次发布 |
| `asOfDate` | 信息截至日期 |
| `expiresAt` | 热点失效时间，可为空 |
| `status` | 草稿 / 审核中 / 已发布 / 已下线 |
| `sensitivity` | 普通 / 需要人工复核 |

热点主题必须记录信息时间窗和失效时间；经典主题必须记录出处、时代背景和复核周期。

## Question / 讨论问题

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定标识 |
| `topicId` | 所属主题 |
| `type` | 热点问题或经典问题 |
| `question` | 面向用户展示的问题 |
| `neutralFraming` | 中性问题表述 |
| `background` | 事实背景 |
| `discussionAngles` | 可讨论角度 |
| `tensionPoints` | 观点冲突点 |
| `recommendedPersonIds` | 推荐人物 |
| `prohibitedClaims` | 不允许生成的断言 |
| `editorialStatus` | 编辑状态 |

问题是内容单元，不等同于热点新闻标题。它需要能支撑一场完整对谈。

## Person / 对谈人物

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定标识 |
| `type` | 热点人物或经典人物 |
| `displayName` | 展示名 |
| `era` | 时代 / 活跃阶段 |
| `roles` | 身份和角色 |
| `bio` | 简介 |
| `viewpointSummary` | 与问题相关的观点摘要 |
| `sourceIds` | 关联来源 |
| `suitableQuestionIds` | 适合讨论的问题 |
| `uncertaintyNotes` | 不确定信息 |
| `prohibitedClaims` | 不允许生成的断言 |
| `voicePolicy` | 统一使用通用合成声音，不克隆本人声音 |
| `reviewStatus` | 草稿 / 审核中 / 已发布 / 已下线 |

人物不是单纯的百科条目，必须说明“为什么适合回答这个问题”。

## Source / 来源

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定标识 |
| `title` | 来源标题 |
| `publisher` | 发布方 |
| `url` | 原始链接 |
| `publishedAt` | 来源发布时间 |
| `excerpt` | 支撑内容的摘录或摘要 |
| `evidenceLevel` | 一手 / 权威二手 / 普通二手 / 待核 |
| `rightsStatus` | 使用与引用状态 |
| `snapshotHash` | 生成时使用的来源快照标识 |

## EditorialBrief / 节目策划单

每次生成前先形成策划单，固定：

- 核心问题和中性 framing
- 热点事实时间窗或经典时代背景
- 每位人物的相关观点角度
- 预计冲突点与追问顺序
- 允许使用和禁止使用的事实 / 引述
- 节目结构与目标时长
- 来源快照和提示词版本

## Episode / 一席对谈

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定标识 |
| `questionId` | 使用的问题 |
| `personIds` | 参与人物 |
| `combinationType` | 四种内容组合 |
| `format` | 访谈 / 对话 / 观点交锋 |
| `durationTarget` | 目标时长 |
| `status` | 生成中 / 待审核 / 已发布 / 失败 |
| `sourceSnapshot` | 生成时的来源版本 |
| `disclosure` | AI 演绎声明 |
| `publishedAt` | 发布时间 |

## Turn / 对话轮次

- `sequence`：轮次
- `speakerId`：人物
- `text`：文本
- `provenance`：事实 / 原文引用 / 摘要 / 合成演绎
- `citationIds`：支撑来源
- `editorialNotes`：审核备注

所有人物发言都必须标注为 AI 演绎，不得写成真实采访记录。
