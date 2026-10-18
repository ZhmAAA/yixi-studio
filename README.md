# 一席话 | Hear Them Out

> One question. Many voices.

“一席话”是一款围绕**热点与经典问题**，邀请**热点与经典人物**展开多角色对谈的 Web 产品。

它把公开资料、人物观点与编辑策划组合成一场可阅读、可收听、可分享的 AI 对谈。所有内容都会明确标注：

> 基于公开资料的 AI 演绎，非本人发言，不代表本人观点。

## 开发代号

`yixi-studio`

## 当前 Web 基线

- Next.js 16 App Router
- TypeScript
- React 19
- Zod 内容与请求校验
- 前端、服务层、Agent 编排器和仓储层的模块化单体结构
- GitHub Actions 自动执行 lint 与 build

## 第一版目标

- 浏览热点问题与经典问题
- 浏览热点人物与经典人物
- 选择一个问题和两位人物，生成一场结构化对谈
- 阅读逐轮对话、查看来源与事实依据
- 生成可选音频，分享结果
- 通过内部内容工作台维护问题、人物、来源和节目

## 已搭建页面

- `/` 首页
- `/topics` 问题库
- `/topics/[slug]` 问题详情
- `/people` 人物库
- `/people/[slug]` 人物详情
- `/create` 开一席
- `/episodes/[id]` 对谈结果
- `/studio` 内容工作台占位页

## 当前最小闭环

`/create` 已接入：

1. `POST /api/episodes` 创建一席并校验问题、人物、形式和时长；
2. `POST /api/episodes/[id]/generate` 调用确定性的演示编排器；
3. Zod 校验结构化对谈草稿；
4. `/episodes/[id]` 读取并展示生成结果。

当前仓储使用进程内存，仅用于演示和接口联调；重启或多实例部署会丢失新生成的一席。生成结果默认是 `draft`，经过内容审核后才应进入 `published`。

## 内容组合

1. 热点问题 × 热点人物
2. 热点问题 × 经典人物
3. 经典问题 × 热点人物
4. 经典问题 × 经典人物

## 本地运行

```bash
npm install
npm run dev
```

生产检查：

```bash
npm run build
npm run lint
```

## 当前状态

第一条前后端 Agent 纵切片已搭建：前端选择、API 创建、确定性 Agent 编排、结构化校验和结果页展示均已接通。下一步接入真实模型、持久化数据库、来源快照和内容工作台权限。

## 目录约定

- `app/`：App Router 页面与 API Route Handlers
- `components/`：可复用界面组件
- `lib/`：内容模型、种子数据和共享查找函数
- `server/contracts.ts`：请求与生成结果的 Zod 契约
- `server/agents/`：Agent 编排器
- `server/services/`：业务服务
- `server/repositories/`：内容仓储适配器
- `docs/`：产品规格、内容模型和决策记录

## 名称

- 中文名：一席话
- 英文名：Hear Them Out
- 口号：听你想听的人，把话说完。
