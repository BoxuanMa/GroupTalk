# GroupTalk — 教育研究协作学习平台设计文档

## 概述

GroupTalk 是一个面向教育研究的 Web 平台。老师上传 PDF 课件，学生分组后围绕课件内容展开小组讨论，每组中有一个 AI 以不同角色参与对话。讨论结束后，系统根据 PDF 和聊天内容分别生成知识图谱风格的概念图，老师可编辑，所有数据可导出用于研究分析。

## 使用场景

教育研究实验平台。老师是研究者，系统用于收集学生协作数据、对比 AI 不同角色的效果。实验结束后导出数据做分析。

## 技术栈

| 组件 | 选择 | 用途 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | 全栈 |
| 语言 | TypeScript | 全栈 |
| 数据库 | PostgreSQL + Prisma ORM | 数据存储 |
| 实时通信 | Socket.IO | 组内聊天 |
| PDF 渲染 | react-pdf | 左侧 PDF 展示 |
| 图编辑 | React Flow | Concept Map |
| AI | OpenAI ChatGPT API (openai SDK) | 聊天 AI + 生成概念图 |
| 认证 | JWT token（老师和学生统一） | 用户认证（见认证与授权章节） |
| PDF 文本提取 | pdf-parse | Concept Map 生成时提取 PDF 文本 |
| 文件存储 | 本地文件系统（Docker volume 挂载） | PDF 上传存储 |
| 部署 | Docker + docker-compose | 本地/云通用 |

## 用户角色

| 角色 | 认证方式 | 权限 |
|------|---------|------|
| 老师 | 用户名 + 密码 | 创建活动、上传 PDF、配置分组和 AI、查看/编辑 concept map、导出数据 |
| 学生 | 活动码 + 学号 + 姓名（无需注册） | 加入活动、查看 PDF、组内聊天、查看 concept map |

## 数据模型

### Teacher（老师）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| username | String | 用户名，唯一 |
| password | String | 密码（bcrypt 哈希） |
| name | String | 显示名 |

### Activity（活动/实验）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| teacherId | UUID | 外键 → Teacher |
| title | String | 活动标题 |
| joinCode | String | 学生加入用的活动码，唯一 |
| status | Enum | draft / waiting / active / ended |
| pdfUrl | String | PDF 文件存储路径 |
| pdfFileName | String | 原始文件名 |
| aiConfig | JSON | 活动级 AI 默认配置 |
| groupSize | JSON | 分组人数范围，如 { min: 2, max: 4 } |
| createdAt | DateTime | 创建时间 |

### Group（小组）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| activityId | UUID | 外键 → Activity |
| groupNumber | Int | 组号 |
| aiRole | Enum | system_helper / known_ai_peer / hidden_ai_peer |
| aiConfig | JSON | 组级 AI 配置（覆盖活动级，可选） |

### Student（学生）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| activityId | UUID | 外键 → Activity |
| studentNumber | String | 学号 |
| name | String | 姓名 |

唯一约束：`(studentNumber, activityId)`，同一活动内学号唯一。每个学生在同一活动内只能属于一个组。

### GroupMember（组员关系）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| studentId | UUID | 外键 → Student |
| groupId | UUID | 外键 → Group |
| joinedAt | DateTime | 加入时间 |

### Message（消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| groupId | UUID | 外键 → Group |
| senderId | UUID | nullable，AI 消息为 null |
| senderType | Enum | student / ai（仅后端存储，见 API 安全说明） |
| senderName | String | 显示名 |
| content | String | 消息内容 |
| timestamp | DateTime | 精确时间戳 |
| aiMetadata | JSON | 仅 AI 消息：prompt、response、model、tokens、latency |

### ConceptMap（概念图）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| activityId | UUID | 外键 → Activity |
| groupId | UUID | 外键 → Group |
| type | Enum | pdf_based / chat_based |
| nodes | JSON | 节点数组 |
| edges | JSON | 边数组 |
| originalNodes | JSON | 编辑前原始节点（用于研究对比） |
| originalEdges | JSON | 编辑前原始边 |
| editedByTeacher | Boolean | 是否被老师编辑过 |
| generatedAt | DateTime | 生成时间 |
| editedAt | DateTime | 最后编辑时间 |

### ActivityLog（行为日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| activityId | UUID | 外键 → Activity |
| userId | UUID | 操作者 ID |
| userType | Enum | teacher / student / ai |
| action | String | join / leave / send_message / view_pdf / page_change 等 |
| metadata | JSON | 额外数据 |
| timestamp | DateTime | 精确时间戳 |

## 核心功能流程

### 1. 老师创建活动

1. 老师登录
2. 创建活动（填写标题）
3. 上传 PDF 课件
4. 配置 AI 设置（默认角色、prompt 模板、主动程度等）
5. 配置分组参数（人数范围 2-4）
6. 系统生成活动码
7. 活动进入 waiting 状态，老师将活动码告知学生

### 2. 学生加入 & 分组

1. 学生输入活动码 + 学号 + 姓名
2. 进入等候室，等待老师开始
3. 老师查看已加入学生列表
4. 老师点击"开始活动"→ 系统自动随机分组
5. 老师预览分组结果，可手动调整（拖拽学生换组、创建/删除组）
6. 老师确认分组 → 活动进入 active 状态
7. 学生被分配到各自小组，进入聊天室

### 3. 聊天室

页面布局：左侧 PDF 阅读器（翻页/缩放），右侧聊天区（组员列表 + 消息流 + 输入框）。

AI 行为根据角色不同：
- **系统助手**：名字显示"AI助手"，有 AI 标识，仅 @触发
- **已知 AI 同伴**：名字显示"AI同学"，有 AI 标识，主动参与
- **隐藏 AI 同伴**：显示老师自定义的虚拟学生名，无 AI 标识，主动参与

### 4. Concept Map 生成

老师点击"结束讨论"→ 聊天锁定 → 系统为每个组生成两张概念图：

- **PDF 概念图**：提取 PDF 文本 → ChatGPT 生成节点和关系
- **聊天概念图**：分析该组聊天记录 → ChatGPT 提取讨论的概念和关系

返回格式：`{ nodes: [{id, label, category}], edges: [{source, target, relation}] }`

### 5. Concept Map 编辑

页面布局：左侧 PDF 概念图，右侧聊天概念图，底部工具栏。

老师编辑能力：
- 拖拽节点调整布局
- 增删节点和连线
- 修改标签、分类、颜色
- 合并/拆分节点
- 撤销/重做
- 用 ◀ ▶ 切换不同小组
- 保存时保留原始版本用于研究对比

### 6. 数据导出

老师可导出以下数据（JSON/CSV 格式）：

| 数据 | 格式 | 内容 |
|------|------|------|
| 聊天记录 | JSON/CSV | 时间戳、发言者、所属组、发言者类型 |
| AI 日志 | JSON | 每条 AI 消息的 prompt、response、token 数、延迟 |
| 行为日志 | CSV | 学生操作记录（加入时间、翻页、发消息等） |
| Concept Map | JSON | 节点、边、编辑前后版本 |
| 实验条件 | CSV | 每组的 AI 角色配置 |

## AI 系统设计

### 配置层级

活动级默认配置 → 组级可覆盖。

### 配置项

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| role | AI 角色类型 | system_helper / known_ai_peer / hidden_ai_peer |
| displayName | 聊天中显示的名字 | "AI助手" / "AI同学" / "王明" |
| systemPrompt | 角色人设 prompt | "你是一个参与小组讨论的大学生..." |
| proactiveness | 主动程度 | low / medium / high |
| triggerMode | 触发方式 | mention_only / auto / hybrid |
| silenceThreshold | 沉默多久后主动发言（秒） | 30 / 60 / 120 |
| maxFrequency | 最大发言频率（条/分钟） | 1 / 2 / 5 |
| temperature | ChatGPT temperature | 0.7 |
| model | ChatGPT 模型 | gpt-4o / gpt-4o-mini |

### 三种角色默认行为

**系统助手 (system_helper)**
- 显示名："AI助手"，有明显 AI 标识
- triggerMode: mention_only
- 定位：工具型，回答问题，不参与讨论

**已知 AI 同伴 (known_ai_peer)**
- 显示名："AI同学"，有 AI 标识
- triggerMode: auto
- 定位：参与者，提出观点、回应讨论、引导话题

**隐藏 AI 同伴 (hidden_ai_peer)**
- 显示名：老师自定义的虚拟学生名
- triggerMode: auto
- 定位：与已知 AI 同伴行为一致，UI 上无 AI 标识
- 前端 senderType 显示为 student，仅后端数据库记录真实身份
- API 安全：学生端 API 返回消息时，隐藏 AI 同伴的 `senderType` 返回为 `student`，`senderId` 返回虚拟 ID，`aiMetadata` 字段不返回。老师端 API 返回完整数据。

### AI 消息生成流程

1. 触发：新消息到达 / 沉默超时
2. 检查触发条件（triggerMode + silenceThreshold + maxFrequency）
3. 构建 prompt：systemPrompt + PDF 摘要 + 最近 N 条聊天记录
4. 调用 ChatGPT API
5. 记录 aiMetadata（prompt、response、tokens、latency）
6. 通过 Socket.IO 发送到组内

## 系统架构

```
┌─────────────────────────────────────────────┐
│              Next.js App                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Pages/   │  │  API     │  │  Socket.IO│  │
│  │  React UI │  │  Routes  │  │  Server   │  │
│  └──────────┘  └──────────┘  └───────────┘  │
│       │              │              │        │
│       └──────────────┼──────────────┘        │
│                      │                       │
│              ┌───────┴───────┐               │
│              │  PostgreSQL   │               │
│              └───────────────┘               │
│                      │                       │
│              ┌───────┴───────┐               │
│              │  ChatGPT API  │               │
│              └───────────────┘               │
└─────────────────────────────────────────────┘
```

部署方式：Docker + docker-compose，支持本地运行和云部署。

注意：Next.js App Router 不原生支持 WebSocket，需要自定义 server.ts 入口来同时运行 Next.js 和 Socket.IO 服务。

### 文件存储

PDF 文件存储在本地文件系统 `./uploads/` 目录，Docker 部署时通过 volume 挂载持久化。

### 活动状态机

```
draft → waiting → active → ended
```

- `draft → waiting`：老师完成配置，发布活动
- `waiting → active`：老师确认分组，开始活动（确认前锁定加入，分组期间不接受新学生）
- `active → ended`：老师结束讨论
- 状态只能单向流转，不可回退

### Concept Map 生成策略

- 生成任务放入队列，逐组串行调用 ChatGPT API，避免并发限流
- 老师端显示生成进度（如"正在生成 3/10 组..."）
- 单组生成失败不影响其他组，可重试
- AI prompt 上下文限制：PDF 文本截取前 8000 tokens，聊天记录取最近 200 条

## 认证与授权

### JWT 签发

- **老师**：用户名+密码登录，验证通过后签发 JWT，payload 含 `{ userId, role: "teacher" }`
- **学生**：输入活动码+学号+姓名加入活动，验证活动码有效后签发 JWT，payload 含 `{ userId, role: "student", activityId, groupId }`

### API 路由权限

| 路由类别 | 允许角色 | 说明 |
|----------|---------|------|
| `/api/auth/*` | 公开 | 登录、学生加入 |
| `/api/activities/*` | teacher | 创建/管理活动 |
| `/api/groups/*` | teacher | 分组管理 |
| `/api/messages/:groupId` | 本组 student + teacher | 学生只能访问自己所在组的消息 |
| `/api/concept-maps/*` | teacher（编辑）、student（只读本组） | |
| `/api/export/*` | teacher | 数据导出 |

### 隐藏 AI 身份保护

学生端 API 中间件在返回消息时：对 `aiRole=hidden_ai_peer` 组的 AI 消息，将 `senderType` 替换为 `student`，`senderId` 替换为预生成的虚拟学生 ID，移除 `aiMetadata` 字段。

### 安全措施

- 学生加入接口：同一 IP 每分钟最多 10 次请求
- 聊天消息：每用户每分钟最多 30 条
- 活动码为 6 位随机字母数字，暴力破解概率低

## 节点与边数据结构

```typescript
interface ConceptNode {
  id: string
  label: string          // 概念名称
  category: string       // 分类（如"理论"、"方法"、"案例"）
  color: string          // 颜色
  position: { x: number; y: number }  // 画布位置
}

interface ConceptEdge {
  id: string
  source: string         // 起始节点 id
  target: string         // 目标节点 id
  relation: string       // 关系描述（如"导致"、"属于"、"对比"）
}
```
