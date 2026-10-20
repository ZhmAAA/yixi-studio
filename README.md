# 一席话 | Hear Them Out

> One question. Many voices.

“一席话”是一款围绕**热点与经典问题**，邀请**热点与经典人物**展开多角色对谈的 Web 产品。

它把公开资料、人物观点与编辑策划组合成一场可阅读、有来源的 AI 对谈。这一版没有音频，也不能把对谈当成本人发言。全站固定标注：

> 基于公开资料的 AI 演绎，非本人发言，不代表本人观点。

## 开发代号

`yixi-studio`

## 当前 Web 基线

- Next.js 16 App Router
- TypeScript
- React 19
- Zod 内容与请求校验
- Node.js 22.13+（默认用内置 `node:sqlite` 把一席写到文件）
- 可选 Postgres：设置 `DATABASE_URL` 后走同一套 repository 接口
- GitHub Actions 用 `npm ci` 执行 lint、test 与 build

## 第一版实际能做的

- 浏览热点问题与经典问题
- 浏览热点人物与经典人物
- 阅读编辑部已发布的对谈、来源和固定声明
- 编辑部登录后新建草稿、改稿，并把状态设为草稿 / 待审核 / 已发布
- 匿名读者不能改内容，也不能调用创建和生成接口

播客访谈、辩论和圆桌支持模板编排与真实模型两种路径。模型路径使用 OpenAI Agents SDK，需在服务端配置凭证和模型名；生成结果经结构与引用校验后保存为草稿，并记录模型、提示词版本、耗时及供应商返回的 Token 用量。缺少配置或模型失败时明确报错，不自动改用模板。详见 `docs/podcast-workflow.md`。

原「问题 × 人物」生成器仍为确定性演示。还没做：真实 TTS 供应商、分享卡片、问题人物来源的后台 CRUD、搜索和收藏；结构与引用校验也不等于事实和内容质量验收。

## 已搭建页面

- `/` 首页（精选只链已发布一席）
- `/topics` 问题库
- `/topics/[slug]` 问题详情
- `/people` 人物库
- `/people/[slug]` 人物详情
- `/create` 预约开一席（默认关闭生成表单）
- `/disclaimer` 关于与免责
- `/episodes/[id]` 已发布对谈；草稿对匿名返回 404
- `/studio` 内容工作台（需要密码）
- `/studio/new` 新建编辑草稿
- `/studio/episodes/[id]` 对谈编辑器与预览
- `/studio/podcast` 播客编排（需要密码；进料 → 访谈 / 辩论 / 圆桌草稿；音频与字幕为可插拔桩）

## 数据

一席存在数据库里，不在进程内存。

- 未设置 `DATABASE_URL`：SQLite 文件，默认 `data/episodes.sqlite`。适合单机。多实例不会共享这个文件。
- `DATABASE_URL=postgres://...` 或 `postgresql://...`：Postgres。表结构由 repository 启动时创建。
- 种子一席按 id 补齐，不会覆盖已经改过的记录。新建的一席在进程重启后仍可按 id 读取。
- 问题、人物、来源仍是 `lib/content.ts` 里的代码种子。

Repository 接口在 `server/repositories/episode-store.ts`。SQLite 与 Postgres 是两个适配器。

## 鉴权

`STUDIO_PASSWORD` 是编辑部共享密码。未设置时，工作台和全部写接口都会拒绝。

- 浏览器打开 `/studio`：未登录返回 401 和密码页；正确密码写入 HttpOnly Cookie `yixi_studio`
- API：`Authorization: Bearer <STUDIO_PASSWORD>`，或 `Authorization: Basic`（用户名任意，密码为该值），或请求头 `x-studio-key`
- 受保护：`/studio/*`、`/api/studio/*`（登录接口除外）、`POST /api/episodes`、`POST /api/episodes/[id]/generate`
- `ALLOW_PUBLIC_CREATE=true` 时，匿名请求才能创建和生成。结果仍是草稿，公开页不会展示

## 本地运行

需要 Node.js 22.13 或更高。

```bash
cp .env.example .env.local
# 编辑 STUDIO_PASSWORD
npm ci
npm run dev
```

生产检查与启动：

```bash
npm run lint
npm test
npm run build
npm start
```

本地验收：

1. 不带密码打开 `/studio`，状态码 401；`POST /api/episodes` 同样 401。
2. 首页能打开种子里已发布的一席；用密码新建的草稿，匿名打开 `/episodes/<id>` 为 404。
3. 在工作台把草稿改为已发布后，重启进程，同一 id 仍可公开阅读。
4. `/create` 默认是预约说明，不出现可提交的生成表单。

真实模型文本生成：

1. 在未提交的 `.env.local` 中设置 `OPENAI_API_KEY` 与 `AGENT_MODEL`。不要使用 `NEXT_PUBLIC_*`，不要将密钥写进浏览器或提交仓库。
2. 默认使用 Responses API。兼容网关可设置 `OPENAI_BASE_URL` 和 `AGENT_API=chat_completions`；网关和所选模型必须支持严格 JSON Schema 输出。
3. 重启服务，在 `/studio/podcast` 选择「模型生成」。未配置时该选项不可用，模板编排仍可使用。
4. 核对稿件的「模型生成」标记、引用依据、生成记录和待编辑核对提示，再保存后的重开/重启回读。调用会产生供应商用量；实现不自动重试。

默认超时 120 秒、输出上限 12,000 Token，可通过 `.env.example` 中的服务端变量调整。SDK tracing 关闭，Responses `store=false`；模型仍会收到本次信息包。单进程最多同时执行 2 个模型请求，多实例限流/任务队列尚未实现。

自动化测试中的模拟供应商响应只验证调用协议和错误路径，不能证明实际账号权限、模型质量或真实调用已通过。真实联调需要有效配置；Postgres 的实际实例验收单独进行。

## 目录约定

- `app/`：App Router 页面与 API Route Handlers
- `components/`：可复用界面组件
- `lib/`：内容模型、种子数据、声明文案、工作台鉴权
- `server/contracts.ts`：请求与生成结果的 Zod 契约
- `server/agents/`：确定性编排器、OpenAI Agents SDK 播客模型调用与服务端配置
- `server/podcast/`：播客信息包、语音 / 拼接 / 字幕接口
- `server/services/`：业务服务
- `server/repositories/`：一席仓储；`episode-store.ts` 是可替换的存储接口
- `docs/`：产品规格、内容模型和决策记录
- `proxy.ts`：工作台与写接口门禁

## 名称

- 中文名：一席话
- 英文名：Hear Them Out
- 口号：听你想听的人，把话说完。
