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
- GitHub Actions 用 `npm ci` 执行 lint 与 build

## 第一版实际能做的

- 浏览热点问题与经典问题
- 浏览热点人物与经典人物
- 阅读编辑部已发布的对谈、来源和固定声明
- 编辑部登录后新建草稿、改稿，并把状态设为草稿 / 待审核 / 已发布
- 匿名读者不能改内容，也不能调用创建和生成接口

还没做：真实大模型、真实 TTS 供应商、分享卡片、问题人物来源的后台 CRUD、搜索和收藏。确定性编排器仍只用于内测草稿。播客访谈是另一条工作流，见 `docs/podcast-workflow.md`。

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
- `/studio/podcast` 播客访谈编排（需要密码；进料 → 访谈稿；音频与字幕为可插拔桩）

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
npm run build
npm start
```

本地验收：

1. 不带密码打开 `/studio`，状态码 401；`POST /api/episodes` 同样 401。
2. 首页能打开种子里已发布的一席；用密码新建的草稿，匿名打开 `/episodes/<id>` 为 404。
3. 在工作台把草稿改为已发布后，重启进程，同一 id 仍可公开阅读。
4. `/create` 默认是预约说明，不出现可提交的生成表单。

## 目录约定

- `app/`：App Router 页面与 API Route Handlers
- `components/`：可复用界面组件
- `lib/`：内容模型、种子数据、声明文案、工作台鉴权
- `server/contracts.ts`：请求与生成结果的 Zod 契约
- `server/agents/`：确定性演示编排器（对谈草稿，以及播客访谈）
- `server/podcast/`：播客信息包、语音 / 拼接 / 字幕接口
- `server/services/`：业务服务
- `server/repositories/`：一席仓储；`episode-store.ts` 是可替换的存储接口
- `docs/`：产品规格、内容模型和决策记录
- `proxy.ts`：工作台与写接口门禁

## 名称

- 中文名：一席话
- 英文名：Hear Them Out
- 口号：听你想听的人，把话说完。
