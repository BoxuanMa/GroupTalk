# GroupTalk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a collaborative learning research platform where teachers upload PDFs, students discuss in AI-augmented groups, and concept maps are generated for analysis.

**Architecture:** Next.js 14 (App Router) full-stack app with custom server.ts for Socket.IO. PostgreSQL via Prisma ORM. ChatGPT API for AI chat participant and concept map generation. React Flow for interactive concept map editing.

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL, Prisma, Socket.IO, react-pdf, React Flow, OpenAI SDK, JWT (jsonwebtoken), bcrypt, Docker

**Spec:** `docs/superpowers/specs/2026-03-23-grouptalk-design.md`

---

## File Structure

```
GroupTalk/
├── server.ts                          # Custom server: Next.js + Socket.IO
├── package.json
├── tsconfig.json
├── next.config.js
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── uploads/                           # PDF file storage (Docker volume)
├── prisma/
│   └── schema.prisma                  # All data models
├── src/
│   ├── lib/
│   │   ├── prisma.ts                  # Prisma client singleton
│   │   ├── auth.ts                    # JWT sign/verify, password hash
│   │   ├── middleware.ts              # Auth middleware for API routes
│   │   ├── ai-config.ts              # AI config defaults, merge logic
│   │   ├── ai-engine.ts              # ChatGPT API calls, prompt building
│   │   ├── concept-map-generator.ts   # PDF text extraction + concept map generation
│   │   ├── export.ts                  # Data export logic (CSV/JSON)
│   │   ├── rate-limit.ts             # Rate limiting utility
│   │   ├── activity-log.ts           # Activity logging helper
│   │   └── socket.ts                 # Socket.IO server setup + event handlers
│   ├── app/
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing page (role selection)
│   │   ├── teacher/
│   │   │   ├── login/page.tsx         # Teacher login
│   │   │   ├── register/page.tsx      # Teacher register
│   │   │   ├── dashboard/page.tsx     # Activity list
│   │   │   ├── activities/
│   │   │   │   ├── new/page.tsx       # Create activity (title, PDF, AI config, group config)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # Activity detail (waiting room, monitoring)
│   │   │   │       ├── groups/page.tsx      # Group management (preview, adjust, confirm)
│   │   │   │       ├── concept-maps/page.tsx # Concept map view/edit
│   │   │   │       └── export/page.tsx      # Data export
│   │   ├── student/
│   │   │   ├── join/page.tsx          # Enter join code + student number + name
│   │   │   ├── waiting/page.tsx       # Waiting room
│   │   │   └── chat/page.tsx          # Chat room (PDF + chat)
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── register/route.ts  # Teacher registration
│   │       │   ├── login/route.ts     # Teacher login
│   │       │   └── join/route.ts      # Student join activity
│   │       ├── activities/
│   │       │   ├── route.ts           # GET list, POST create
│   │       │   └── [id]/
│   │       │       ├── route.ts       # GET detail, PATCH update status
│   │       │       ├── upload/route.ts # PDF upload
│   │       │       ├── groups/
│   │       │       │   ├── route.ts   # GET groups, POST auto-assign
│   │       │       │   └── [groupId]/route.ts # PATCH update group
│   │       │       ├── concept-maps/
│   │       │       │   ├── route.ts          # POST generate, GET list
│   │       │       │   └── [mapId]/route.ts  # GET detail, PATCH update
│   │       │       └── export/route.ts       # GET export data
│   │       └── messages/
│   │           └── [groupId]/route.ts # GET messages (with masking)
│   └── components/
│       ├── ui/                        # Shared UI primitives (Button, Input, Card, etc.)
│       ├── pdf-viewer.tsx             # PDF viewer with page navigation + zoom
│       ├── chat-panel.tsx             # Chat messages + input
│       ├── chat-message.tsx           # Single message bubble
│       ├── group-manager.tsx          # Drag-and-drop group assignment
│       ├── concept-map-editor.tsx     # React Flow wrapper with toolbar
│       ├── concept-map-node.tsx       # Custom node component
│       ├── ai-config-form.tsx         # AI configuration form
│       ├── waiting-room.tsx           # Student list in waiting room
│       └── export-panel.tsx           # Export options UI
└── __tests__/
    ├── lib/
    │   ├── auth.test.ts
    │   ├── ai-config.test.ts
    │   ├── ai-engine.test.ts
    │   ├── concept-map-generator.test.ts
    │   ├── export.test.ts
    │   └── rate-limit.test.ts
    ├── api/
    │   ├── auth.test.ts
    │   ├── activities.test.ts
    │   ├── groups.test.ts
    │   ├── messages.test.ts
    │   └── concept-maps.test.ts
    └── components/
        ├── pdf-viewer.test.tsx
        ├── chat-panel.test.tsx
        ├── group-manager.test.tsx
        └── concept-map-editor.test.tsx
```

---

## Task 1: Project Scaffolding & Database Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `.env.example`, `.gitignore`, `prisma/schema.prisma`, `src/lib/prisma.ts`, `docker-compose.yml`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/project/GroupTalk
npx create-next-app@14 . --typescript --app --src-dir --tailwind --eslint --no-import-alias
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install prisma @prisma/client socket.io socket.io-client jsonwebtoken bcryptjs openai react-pdf pdf-parse reactflow
npm install -D @types/jsonwebtoken @types/bcryptjs @types/pdf-parse jest @testing-library/react @testing-library/jest-dom ts-jest @types/jest
```

- [ ] **Step 3: Create .env.example**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/grouptalk
JWT_SECRET=your-secret-key-change-in-production
OPENAI_API_KEY=your-openai-api-key
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

- [ ] **Step 4: Add .env.example entries to .gitignore**

Append to `.gitignore`:
```
.env
.env.local
uploads/
```

- [ ] **Step 5: Create docker-compose.yml**

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: grouptalk
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 6: Create Prisma schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ActivityStatus {
  draft
  waiting
  active
  ended
}

enum AiRole {
  system_helper
  known_ai_peer
  hidden_ai_peer
}

enum SenderType {
  student
  ai
}

enum UserType {
  teacher
  student
  ai
}

model Teacher {
  id         String     @id @default(uuid())
  username   String     @unique
  password   String
  name       String
  createdAt  DateTime   @default(now())
  activities Activity[]
}

model Activity {
  id          String         @id @default(uuid())
  teacherId   String
  teacher     Teacher        @relation(fields: [teacherId], references: [id])
  title       String
  joinCode    String         @unique
  status      ActivityStatus @default(draft)
  pdfUrl      String?
  pdfFileName String?
  aiConfig    Json           @default("{}")
  groupSize   Json           @default("{\"min\": 2, \"max\": 4}")
  createdAt   DateTime       @default(now())
  groups      Group[]
  students    Student[]
  conceptMaps ConceptMap[]
  logs        ActivityLog[]
}

model Group {
  id          String        @id @default(uuid())
  activityId  String
  activity    Activity      @relation(fields: [activityId], references: [id])
  groupNumber Int
  aiRole      AiRole        @default(system_helper)
  aiConfig    Json?
  members     GroupMember[]
  messages    Message[]
  conceptMaps ConceptMap[]
}

model Student {
  id            String        @id @default(uuid())
  activityId    String
  activity      Activity      @relation(fields: [activityId], references: [id])
  studentNumber String
  name          String
  createdAt     DateTime      @default(now())
  memberships   GroupMember[]

  @@unique([studentNumber, activityId])
}

model GroupMember {
  id        String   @id @default(uuid())
  studentId String
  student   Student  @relation(fields: [studentId], references: [id])
  groupId   String
  group     Group    @relation(fields: [groupId], references: [id])
  joinedAt  DateTime @default(now())

  @@unique([studentId])
}

model Message {
  id          String     @id @default(uuid())
  groupId     String
  group       Group      @relation(fields: [groupId], references: [id])
  senderId    String?
  senderType  SenderType
  senderName  String
  content     String
  timestamp   DateTime   @default(now())
  aiMetadata  Json?
}

model ConceptMap {
  id              String   @id @default(uuid())
  activityId      String
  activity        Activity @relation(fields: [activityId], references: [id])
  groupId         String
  group           Group    @relation(fields: [groupId], references: [id])
  type            String   // pdf_based or chat_based
  nodes           Json     @default("[]")
  edges           Json     @default("[]")
  originalNodes   Json     @default("[]")
  originalEdges   Json     @default("[]")
  editedByTeacher Boolean  @default(false)
  generatedAt     DateTime @default(now())
  editedAt        DateTime?
}

model ActivityLog {
  id         String   @id @default(uuid())
  activityId String
  activity   Activity @relation(fields: [activityId], references: [id])
  userId     String
  userType   UserType
  action     String
  metadata   Json     @default("{}")
  timestamp  DateTime @default(now())
}
```

- [ ] **Step 7: Create Prisma client singleton**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 8: Start database and run migration**

```bash
docker-compose up -d db
cp .env.example .env  # edit with real values
npx prisma migrate dev --name init
```

- [ ] **Step 9: Configure Jest**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default config
```

Add to `package.json` scripts: `"test": "jest"`

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: project scaffolding with Next.js, Prisma schema, Docker"
```

---

## Task 2: Authentication System

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/middleware.ts`, `src/lib/rate-limit.ts`
- Create: `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/join/route.ts`
- Test: `__tests__/lib/auth.test.ts`, `__tests__/api/auth.test.ts`

- [ ] **Step 1: Write auth utility tests**

```typescript
// __tests__/lib/auth.test.ts
import { hashPassword, verifyPassword, signToken, verifyToken } from '@/lib/auth'

describe('auth utilities', () => {
  test('hashPassword returns a bcrypt hash', async () => {
    const hash = await hashPassword('test123')
    expect(hash).not.toBe('test123')
    expect(hash).toMatch(/^\$2[aby]\$/)
  })

  test('verifyPassword matches correct password', async () => {
    const hash = await hashPassword('test123')
    expect(await verifyPassword('test123', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  test('signToken creates a valid JWT', () => {
    const token = signToken({ userId: '123', role: 'teacher' })
    expect(typeof token).toBe('string')
    const payload = verifyToken(token)
    expect(payload.userId).toBe('123')
    expect(payload.role).toBe('teacher')
  })

  test('verifyToken throws on invalid token', () => {
    expect(() => verifyToken('invalid')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/auth.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement auth utilities**

```typescript
// src/lib/auth.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export interface TokenPayload {
  userId: string
  role: 'teacher' | 'student'
  activityId?: string
  groupId?: string
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/lib/auth.test.ts
```
Expected: PASS

- [ ] **Step 5: Implement rate limiter**

```typescript
// src/lib/rate-limit.ts
const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = requests.get(key)

  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}
```

- [ ] **Step 6: Implement auth middleware**

```typescript
// src/lib/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, TokenPayload } from './auth'

export function getAuthPayload(request: NextRequest): TokenPayload | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  try {
    return verifyToken(authHeader.slice(7))
  } catch {
    return null
  }
}

export function requireTeacher(request: NextRequest): TokenPayload {
  const payload = getAuthPayload(request)
  if (!payload || payload.role !== 'teacher') {
    throw new Error('Unauthorized')
  }
  return payload
}

export function requireAuth(request: NextRequest): TokenPayload {
  const payload = getAuthPayload(request)
  if (!payload) {
    throw new Error('Unauthorized')
  }
  return payload
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

- [ ] **Step 7: Implement teacher register API**

```typescript
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { username, password, name } = await request.json()

  if (!username || !password || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const existing = await prisma.teacher.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: 'Username taken' }, { status: 409 })
  }

  const teacher = await prisma.teacher.create({
    data: { username, password: await hashPassword(password), name },
  })

  const token = signToken({ userId: teacher.id, role: 'teacher' })
  return NextResponse.json({ token, teacher: { id: teacher.id, username: teacher.username, name: teacher.name } })
}
```

- [ ] **Step 8: Implement teacher login API**

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const teacher = await prisma.teacher.findUnique({ where: { username } })
  if (!teacher || !(await verifyPassword(password, teacher.password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = signToken({ userId: teacher.id, role: 'teacher' })
  return NextResponse.json({ token, teacher: { id: teacher.id, username: teacher.username, name: teacher.name } })
}
```

- [ ] **Step 9: Implement student join API**

```typescript
// src/app/api/auth/join/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`join:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { joinCode, studentNumber, name } = await request.json()

  if (!joinCode || !studentNumber || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const activity = await prisma.activity.findUnique({ where: { joinCode } })
  if (!activity || activity.status !== 'waiting') {
    return NextResponse.json({ error: 'Invalid or inactive join code' }, { status: 404 })
  }

  const student = await prisma.student.upsert({
    where: { studentNumber_activityId: { studentNumber, activityId: activity.id } },
    update: { name },
    create: { studentNumber, name, activityId: activity.id },
  })

  const token = signToken({ userId: student.id, role: 'student', activityId: activity.id })
  return NextResponse.json({ token, student: { id: student.id, studentNumber, name }, activityId: activity.id })
}
```

- [ ] **Step 10: Commit**

```bash
git add src/lib/auth.ts src/lib/middleware.ts src/lib/rate-limit.ts src/app/api/auth/ __tests__/lib/auth.test.ts
git commit -m "feat: authentication system — teacher login/register, student join, JWT, rate limiting"
```

---

## Task 3: Activity Management & PDF Upload

**Files:**
- Create: `src/app/api/activities/route.ts`, `src/app/api/activities/[id]/route.ts`, `src/app/api/activities/[id]/upload/route.ts`
- Test: `__tests__/api/activities.test.ts`

- [ ] **Step 1: Write activity CRUD test**

```typescript
// __tests__/api/activities.test.ts
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'

describe('Activity API', () => {
  let teacherToken: string
  let teacherId: string

  beforeAll(async () => {
    const teacher = await prisma.teacher.create({
      data: { username: 'testteacher', password: await hashPassword('pass'), name: 'Test' },
    })
    teacherId = teacher.id
    teacherToken = signToken({ userId: teacher.id, role: 'teacher' })
  })

  afterAll(async () => {
    await prisma.activity.deleteMany({ where: { teacherId } })
    await prisma.teacher.delete({ where: { id: teacherId } })
  })

  test('POST /api/activities creates activity with join code', async () => {
    const res = await fetch('http://localhost:3000/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({ title: 'Test Activity' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.activity.title).toBe('Test Activity')
    expect(data.activity.joinCode).toHaveLength(6)
    expect(data.activity.status).toBe('draft')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/api/activities.test.ts
```

- [ ] **Step 3: Implement activity list + create API**

```typescript
// src/app/api/activities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import crypto from 'crypto'

function generateJoinCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

export async function GET(request: NextRequest) {
  try {
    const payload = requireTeacher(request)
    const activities = await prisma.activity.findMany({
      where: { teacherId: payload.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { students: true, groups: true } } },
    })
    return NextResponse.json({ activities })
  } catch {
    return unauthorized()
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = requireTeacher(request)
    const { title } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const activity = await prisma.activity.create({
      data: {
        teacherId: payload.userId,
        title,
        joinCode: generateJoinCode(),
      },
    })

    return NextResponse.json({ activity })
  } catch {
    return unauthorized()
  }
}
```

- [ ] **Step 4: Implement activity detail + status update API**

```typescript
// src/app/api/activities/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'

const VALID_TRANSITIONS: Record<string, string> = {
  draft: 'waiting',
  waiting: 'active',
  active: 'ended',
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId },
      include: {
        groups: { include: { members: { include: { student: true } } } },
        students: true,
      },
    })

    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ activity })
  } catch {
    return unauthorized()
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const body = await request.json()

    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId },
    })
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Status transition validation
    if (body.status) {
      const allowed = VALID_TRANSITIONS[activity.status]
      if (body.status !== allowed) {
        return NextResponse.json({ error: `Cannot transition from ${activity.status} to ${body.status}` }, { status: 400 })
      }
    }

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.status && { status: body.status }),
        ...(body.aiConfig && { aiConfig: body.aiConfig }),
        ...(body.groupSize && { groupSize: body.groupSize }),
      },
    })

    // When transitioning to active, notify waiting students via Socket.IO
    if (body.status === 'active') {
      const io = (global as Record<string, unknown>).__io as import('socket.io').Server | undefined
      if (io) {
        const groups = await prisma.group.findMany({
          where: { activityId: params.id },
          include: { members: { include: { student: true } } },
        })
        for (const group of groups) {
          for (const member of group.members) {
            io.to(`waiting:${params.id}`).emit('activity-started', {
              studentId: member.studentId,
              groupId: group.id,
            })
          }
        }
      }
    }

    return NextResponse.json({ activity: updated })
  } catch {
    return unauthorized()
  }
}
```

- [ ] **Step 5: Implement PDF upload API**

```typescript
// src/app/api/activities/[id]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)

    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId },
    })
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('pdf') as File
    if (!file || !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'uploads', params.id)
    await mkdir(uploadDir, { recursive: true })

    const fileName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: { pdfUrl: `/uploads/${params.id}/${fileName}`, pdfFileName: file.name },
    })

    return NextResponse.json({ activity: updated })
  } catch {
    return unauthorized()
  }
}
```

- [ ] **Step 6: Add static file serving for uploads in next.config.js**

Add to `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/files/:path*',
      },
    ]
  },
}

module.exports = nextConfig
```

Create file serving route:
```typescript
// src/app/api/files/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const filePath = path.join(process.cwd(), 'uploads', ...params.path)
  try {
    const file = await readFile(filePath)
    return new NextResponse(file, {
      headers: { 'Content-Type': 'application/pdf' },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
```

- [ ] **Step 7: Implement student-accessible activity/group info API**

```typescript
// src/app/api/student/my-group/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthPayload, unauthorized } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request)
  if (!payload || payload.role !== 'student') return unauthorized()

  const membership = await prisma.groupMember.findFirst({
    where: { studentId: payload.userId },
    include: {
      group: {
        include: {
          activity: { select: { id: true, title: true, pdfUrl: true, pdfFileName: true, status: true } },
          members: { include: { student: { select: { id: true, name: true, studentNumber: true } } } },
        },
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Not in a group yet' }, { status: 404 })
  }

  return NextResponse.json({
    groupId: membership.groupId,
    groupNumber: membership.group.groupNumber,
    activity: membership.group.activity,
    members: membership.group.members.map((m) => ({
      id: m.student.id,
      name: m.student.name,
      studentNumber: m.student.studentNumber,
    })),
  })
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/api/activities/ src/app/api/files/ src/app/api/student/ next.config.js __tests__/api/activities.test.ts
git commit -m "feat: activity CRUD, PDF upload, status transitions, student group info API"
```

---

## Task 4: Group Management (Auto-assign + Manual Adjust)

**Files:**
- Create: `src/app/api/activities/[id]/groups/route.ts`, `src/app/api/activities/[id]/groups/[groupId]/route.ts`
- Test: `__tests__/api/groups.test.ts`

- [ ] **Step 1: Write grouping logic test**

```typescript
// __tests__/api/groups.test.ts
describe('Group assignment', () => {
  test('assigns students into groups within size range', () => {
    const students = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}` }))
    const groups = assignGroups(students, { min: 2, max: 4 })
    expect(groups.length).toBeGreaterThanOrEqual(3) // 10 / 4 = 2.5 → at least 3
    expect(groups.length).toBeLessThanOrEqual(5) // 10 / 2 = 5
    groups.forEach(g => {
      expect(g.length).toBeGreaterThanOrEqual(2)
      expect(g.length).toBeLessThanOrEqual(4)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/api/groups.test.ts
```

- [ ] **Step 3: Implement auto-assign groups API**

```typescript
// src/app/api/activities/[id]/groups/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function assignGroups<T>(students: T[], size: { min: number; max: number }): T[][] {
  const shuffled = shuffleArray(students)
  const targetSize = Math.ceil((size.min + size.max) / 2)
  const numGroups = Math.max(1, Math.round(shuffled.length / targetSize))
  const groups: T[][] = Array.from({ length: numGroups }, () => [])

  shuffled.forEach((student, i) => {
    groups[i % numGroups].push(student)
  })

  return groups
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const groups = await prisma.group.findMany({
      where: { activity: { id: params.id, teacherId: payload.userId } },
      include: { members: { include: { student: true } } },
      orderBy: { groupNumber: 'asc' },
    })
    return NextResponse.json({ groups })
  } catch {
    return unauthorized()
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId, status: 'waiting' },
      include: { students: true },
    })
    if (!activity) return NextResponse.json({ error: 'Activity not found or not in waiting status' }, { status: 400 })

    const groupSize = activity.groupSize as { min: number; max: number }
    const studentGroups = assignGroups(activity.students, groupSize)

    // Delete existing groups
    await prisma.groupMember.deleteMany({ where: { group: { activityId: params.id } } })
    await prisma.group.deleteMany({ where: { activityId: params.id } })

    // Create new groups
    const defaultAiRole = (activity.aiConfig as Record<string, unknown>)?.role as string || 'system_helper'

    for (let i = 0; i < studentGroups.length; i++) {
      const group = await prisma.group.create({
        data: {
          activityId: params.id,
          groupNumber: i + 1,
          aiRole: defaultAiRole as 'system_helper' | 'known_ai_peer' | 'hidden_ai_peer',
        },
      })

      for (const student of studentGroups[i]) {
        await prisma.groupMember.create({
          data: { studentId: student.id, groupId: group.id },
        })
      }
    }

    const groups = await prisma.group.findMany({
      where: { activityId: params.id },
      include: { members: { include: { student: true } } },
      orderBy: { groupNumber: 'asc' },
    })

    return NextResponse.json({ groups })
  } catch {
    return unauthorized()
  }
}
```

- [ ] **Step 4: Implement group update API (move student, change AI role)**

```typescript
// src/app/api/activities/[id]/groups/[groupId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'

export async function PATCH(request: NextRequest, { params }: { params: { id: string; groupId: string } }) {
  try {
    const payload = requireTeacher(request)
    const body = await request.json()

    const group = await prisma.group.findFirst({
      where: { id: params.groupId, activity: { id: params.id, teacherId: payload.userId } },
    })
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    // Move student to this group
    if (body.addStudentId) {
      await prisma.groupMember.updateMany({
        where: { studentId: body.addStudentId },
        data: { groupId: params.groupId },
      })
    }

    // Update AI role/config
    const updated = await prisma.group.update({
      where: { id: params.groupId },
      data: {
        ...(body.aiRole && { aiRole: body.aiRole }),
        ...(body.aiConfig !== undefined && { aiConfig: body.aiConfig }),
      },
      include: { members: { include: { student: true } } },
    })

    return NextResponse.json({ group: updated })
  } catch {
    return unauthorized()
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- __tests__/api/groups.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/activities/[id]/groups/ __tests__/api/groups.test.ts
git commit -m "feat: auto group assignment with manual adjustment support"
```

---

## Task 5: Custom Server with Socket.IO + Real-time Chat

**Files:**
- Create: `server.ts`, `src/lib/socket.ts`, `src/lib/activity-log.ts`, `src/lib/ai-config.ts`

- [ ] **Step 1: Write AI config merge test**

```typescript
// __tests__/lib/ai-config.test.ts
import { mergeAiConfig, getDefaultConfig } from '@/lib/ai-config'

describe('AI config', () => {
  test('getDefaultConfig returns system_helper defaults', () => {
    const config = getDefaultConfig('system_helper')
    expect(config.triggerMode).toBe('mention_only')
    expect(config.displayName).toBe('AI助手')
  })

  test('mergeAiConfig overrides activity config with group config', () => {
    const activityConfig = { role: 'system_helper', temperature: 0.7 }
    const groupConfig = { temperature: 0.9, displayName: 'Custom' }
    const merged = mergeAiConfig(activityConfig, groupConfig)
    expect(merged.temperature).toBe(0.9)
    expect(merged.displayName).toBe('Custom')
    expect(merged.role).toBe('system_helper')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/ai-config.test.ts
```

- [ ] **Step 3: Implement AI config utilities**

```typescript
// src/lib/ai-config.ts
export interface AiConfig {
  role: string
  displayName: string
  systemPrompt: string
  proactiveness: 'low' | 'medium' | 'high'
  triggerMode: 'mention_only' | 'auto' | 'hybrid'
  silenceThreshold: number
  maxFrequency: number
  temperature: number
  model: string
}

const DEFAULTS: Record<string, Partial<AiConfig>> = {
  system_helper: {
    displayName: 'AI助手',
    triggerMode: 'mention_only',
    proactiveness: 'low',
    systemPrompt: '你是一个课堂AI助手。学生@你时，根据课件内容和讨论上下文回答问题。保持简洁，不主动参与讨论。',
    silenceThreshold: 0,
    maxFrequency: 5,
  },
  known_ai_peer: {
    displayName: 'AI同学',
    triggerMode: 'auto',
    proactiveness: 'medium',
    systemPrompt: '你是一个参与小组讨论的AI同学。积极参与讨论，提出观点，回应其他同学的想法，适时引导话题深入。语气自然、友好，像一个认真学习的大学生。',
    silenceThreshold: 60,
    maxFrequency: 2,
  },
  hidden_ai_peer: {
    displayName: '王明',
    triggerMode: 'auto',
    proactiveness: 'medium',
    systemPrompt: '你是一个参与小组讨论的大学生。积极参与讨论，提出观点，回应其他同学的想法。语气自然、口语化，像一个真实的大学生。不要暴露你是AI。',
    silenceThreshold: 60,
    maxFrequency: 2,
  },
}

const BASE_DEFAULTS: AiConfig = {
  role: 'system_helper',
  displayName: 'AI助手',
  systemPrompt: '',
  proactiveness: 'medium',
  triggerMode: 'mention_only',
  silenceThreshold: 60,
  maxFrequency: 2,
  temperature: 0.7,
  model: 'gpt-4o',
}

export function getDefaultConfig(role: string): AiConfig {
  return { ...BASE_DEFAULTS, ...DEFAULTS[role], role }
}

export function mergeAiConfig(
  activityConfig: Record<string, unknown>,
  groupConfig?: Record<string, unknown> | null
): AiConfig {
  const role = (groupConfig?.role || activityConfig.role || 'system_helper') as string
  const defaults = getDefaultConfig(role)
  return { ...defaults, ...activityConfig, ...(groupConfig || {}) } as AiConfig
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/lib/ai-config.test.ts
```

- [ ] **Step 5: Implement activity logging helper**

```typescript
// src/lib/activity-log.ts
import { prisma } from './prisma'

export async function logActivity(params: {
  activityId: string
  userId: string
  userType: 'teacher' | 'student' | 'ai'
  action: string
  metadata?: Record<string, unknown>
}) {
  await prisma.activityLog.create({
    data: {
      activityId: params.activityId,
      userId: params.userId,
      userType: params.userType,
      action: params.action,
      metadata: params.metadata || {},
    },
  })
}
```

- [ ] **Step 6: Implement Socket.IO server**

```typescript
// src/lib/socket.ts
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { verifyToken } from './auth'
import { prisma } from './prisma'
import { logActivity } from './activity-log'
import { rateLimit } from './rate-limit'

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    try {
      const payload = verifyToken(token)
      socket.data.user = payload
      next()
    } catch {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user

    // Join group room
    socket.on('join-group', async (groupId: string) => {
      // Verify membership
      if (user.role === 'student') {
        const member = await prisma.groupMember.findFirst({
          where: { studentId: user.userId, groupId },
          include: { group: true },
        })
        if (!member) return socket.emit('error', 'Not a member of this group')
        socket.data.groupId = groupId
        socket.data.activityId = member.group.activityId
      } else {
        // Teacher can join any group
        const group = await prisma.group.findUnique({ where: { id: groupId } })
        if (!group) return socket.emit('error', 'Group not found')
        socket.data.groupId = groupId
        socket.data.activityId = group.activityId
      }

      socket.join(`group:${groupId}`)
      io.to(`group:${groupId}`).emit('user-joined', { userId: user.userId, role: user.role })

      await logActivity({
        activityId: socket.data.activityId,
        userId: user.userId,
        userType: user.role,
        action: 'join',
        metadata: { groupId },
      })
    })

    // Send message
    socket.on('send-message', async (data: { content: string }) => {
      const groupId = socket.data.groupId
      if (!groupId) return socket.emit('error', 'Not in a group')

      // Rate limit
      if (!rateLimit(`chat:${user.userId}`, 30, 60_000)) {
        return socket.emit('error', 'Rate limit exceeded')
      }

      // Check activity is still active
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { activity: true },
      })
      if (!group || group.activity.status !== 'active') {
        return socket.emit('error', 'Discussion has ended')
      }

      // Get student name
      let senderName = 'Teacher'
      if (user.role === 'student') {
        const student = await prisma.student.findUnique({ where: { id: user.userId } })
        senderName = student?.name || 'Unknown'
      }

      const message = await prisma.message.create({
        data: {
          groupId,
          senderId: user.userId,
          senderType: 'student',
          senderName,
          content: data.content,
        },
      })

      io.to(`group:${groupId}`).emit('new-message', {
        id: message.id,
        senderId: message.senderId,
        senderType: message.senderType,
        senderName: message.senderName,
        content: message.content,
        timestamp: message.timestamp,
      })

      await logActivity({
        activityId: socket.data.activityId,
        userId: user.userId,
        userType: 'student',
        action: 'send_message',
        metadata: { groupId, messageId: message.id },
      })

      // Trigger AI response check — direct function call (not Socket.IO event)
      const { handleAiTrigger } = await import('./ai-engine')
      setTimeout(() => handleAiTrigger(groupId, socket.data.activityId), 2000 + Math.random() * 3000)
    })

    // Silence-based AI triggering: track last message time per group
    socket.on('join-group', async () => {
      // Start silence timer for this group (checked periodically)
    })

    // Waiting room
    socket.on('join-waiting', (activityId: string) => {
      socket.join(`waiting:${activityId}`)
    })

    socket.on('disconnect', () => {
      if (socket.data.groupId) {
        io.to(`group:${socket.data.groupId}`).emit('user-left', { userId: user.userId })
      }
    })
  })

  return io
}
```

- [ ] **Step 7: Create custom server.ts**

```typescript
// server.ts
import { createServer } from 'http'
import next from 'next'
import { setupSocketIO } from './src/lib/socket'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const port = parseInt(process.env.PORT || '3000', 10)

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  const io = setupSocketIO(httpServer)

  // Make io accessible for AI engine
  ;(global as Record<string, unknown>).__io = io

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "ts-node --project tsconfig.server.json server.ts",
    "build": "next build",
    "start": "NODE_ENV=production ts-node --project tsconfig.server.json server.ts"
  }
}
```

Create `tsconfig.server.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "dist",
    "noEmit": false
  },
  "include": ["server.ts", "src/lib/**/*.ts"]
}
```

- [ ] **Step 8: Install ts-node**

```bash
npm install -D ts-node
```

- [ ] **Step 9: Commit**

```bash
git add server.ts tsconfig.server.json src/lib/socket.ts src/lib/activity-log.ts src/lib/ai-config.ts __tests__/lib/ai-config.test.ts
git commit -m "feat: custom server with Socket.IO, real-time chat, activity logging"
```

---

## Task 6: AI Chat Engine (ChatGPT Integration)

**Files:**
- Create: `src/lib/ai-engine.ts`
- Test: `__tests__/lib/ai-engine.test.ts`

- [ ] **Step 1: Write AI engine prompt building test**

```typescript
// __tests__/lib/ai-engine.test.ts
import { buildPrompt } from '@/lib/ai-engine'

describe('AI engine', () => {
  test('buildPrompt includes system prompt, PDF summary, and recent messages', () => {
    const messages = buildPrompt({
      systemPrompt: 'You are a student.',
      pdfSummary: 'This lesson covers photosynthesis.',
      chatHistory: [
        { senderName: '张三', content: '光合作用的原理是什么？' },
        { senderName: '李四', content: '我记得和叶绿素有关。' },
      ],
    })

    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('You are a student.')
    expect(messages[0].content).toContain('photosynthesis')
    expect(messages.length).toBe(3) // system + 2 chat messages
  })

  test('buildPrompt truncates to maxMessages', () => {
    const chatHistory = Array.from({ length: 50 }, (_, i) => ({
      senderName: `User${i}`,
      content: `Message ${i}`,
    }))

    const messages = buildPrompt({
      systemPrompt: 'test',
      pdfSummary: 'test',
      chatHistory,
      maxMessages: 20,
    })

    // system + 20 recent messages
    expect(messages.length).toBe(21)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/ai-engine.test.ts
```

- [ ] **Step 3: Implement AI engine**

```typescript
// src/lib/ai-engine.ts
import OpenAI from 'openai'
import { prisma } from './prisma'
import { mergeAiConfig, AiConfig } from './ai-config'
import { logActivity } from './activity-log'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ChatMessage {
  senderName: string
  content: string
}

export function buildPrompt(params: {
  systemPrompt: string
  pdfSummary: string
  chatHistory: ChatMessage[]
  maxMessages?: number
}): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const { systemPrompt, pdfSummary, chatHistory, maxMessages = 30 } = params

  const system = `${systemPrompt}\n\n课件内容摘要：\n${pdfSummary}`

  const recentMessages = chatHistory.slice(-maxMessages).map((msg) => ({
    role: 'user' as const,
    content: `${msg.senderName}: ${msg.content}`,
  }))

  return [{ role: 'system', content: system }, ...recentMessages]
}

// Track last AI message time per group for frequency limiting
const lastAiMessage = new Map<string, number>()
// Track last message time per group for silence detection
const lastGroupMessage = new Map<string, number>()
// Active silence timers per group
const silenceTimers = new Map<string, NodeJS.Timeout>()

export function startSilenceTimer(groupId: string, activityId: string, thresholdMs: number) {
  // Clear existing timer
  const existing = silenceTimers.get(groupId)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    handleAiTrigger(groupId, activityId)
  }, thresholdMs)
  silenceTimers.set(groupId, timer)
}

export function resetSilenceTimer(groupId: string, activityId: string, thresholdMs: number) {
  lastGroupMessage.set(groupId, Date.now())
  startSilenceTimer(groupId, activityId, thresholdMs)
}

export function stopSilenceTimer(groupId: string) {
  const timer = silenceTimers.get(groupId)
  if (timer) {
    clearTimeout(timer)
    silenceTimers.delete(groupId)
  }
}

export async function shouldTriggerAi(
  groupId: string,
  config: AiConfig,
  mentionedAi: boolean
): Promise<boolean> {
  if (config.triggerMode === 'mention_only' && !mentionedAi) {
    return false
  }

  // Check frequency limit
  const lastTime = lastAiMessage.get(groupId) || 0
  const minInterval = (60 / config.maxFrequency) * 1000
  if (Date.now() - lastTime < minInterval) {
    return false
  }

  return true
}

export async function generateAiResponse(params: {
  groupId: string
  activityId: string
  config: AiConfig
  pdfSummary: string
}): Promise<{ content: string; metadata: Record<string, unknown> } | null> {
  const { groupId, config, pdfSummary } = params

  // Fetch recent chat history
  const messages = await prisma.message.findMany({
    where: { groupId },
    orderBy: { timestamp: 'desc' },
    take: 30,
  })

  const chatHistory = messages.reverse().map((m) => ({
    senderName: m.senderName,
    content: m.content,
  }))

  const prompt = buildPrompt({
    systemPrompt: config.systemPrompt,
    pdfSummary,
    chatHistory,
  })

  const startTime = Date.now()

  try {
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: prompt,
      temperature: config.temperature,
      max_tokens: 500,
    })

    const latency = Date.now() - startTime
    const responseContent = completion.choices[0]?.message?.content || ''

    lastAiMessage.set(groupId, Date.now())

    return {
      content: responseContent,
      metadata: {
        model: config.model,
        prompt: prompt,
        response: responseContent,
        tokens: {
          prompt: completion.usage?.prompt_tokens,
          completion: completion.usage?.completion_tokens,
          total: completion.usage?.total_tokens,
        },
        latency,
      },
    }
  } catch (error) {
    console.error('AI generation failed:', error)
    return null
  }
}

export async function handleAiTrigger(groupId: string, activityId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { activity: true },
  })
  if (!group || group.activity.status !== 'active') return

  const config = mergeAiConfig(
    group.activity.aiConfig as Record<string, unknown>,
    group.aiConfig as Record<string, unknown> | null
  )

  // Get the latest message to check for @mention
  const lastMsg = await prisma.message.findFirst({
    where: { groupId },
    orderBy: { timestamp: 'desc' },
  })

  const mentionedAi = lastMsg?.content.includes(`@${config.displayName}`) ||
    lastMsg?.content.includes('@AI') ||
    lastMsg?.content.includes('@ai') || false

  if (!(await shouldTriggerAi(groupId, config, mentionedAi))) return

  // Get PDF summary
  let pdfSummary = ''
  if (group.activity.pdfUrl) {
    // PDF summary would be extracted and cached — simplified here
    pdfSummary = '(PDF content available)'
  }

  const result = await generateAiResponse({ groupId, activityId, config, pdfSummary })
  if (!result) return

  // Save message
  const message = await prisma.message.create({
    data: {
      groupId,
      senderId: null,
      senderType: 'ai',
      senderName: config.displayName,
      content: result.content,
      aiMetadata: result.metadata,
    },
  })

  await logActivity({
    activityId,
    userId: 'ai',
    userType: 'ai',
    action: 'send_message',
    metadata: { groupId, messageId: message.id },
  })

  // Broadcast via Socket.IO
  const io = (global as Record<string, unknown>).__io as import('socket.io').Server | undefined
  if (io) {
    const emitData: Record<string, unknown> = {
      id: message.id,
      senderName: config.displayName,
      content: result.content,
      timestamp: message.timestamp,
    }

    // For hidden AI peer, present as student
    if (config.role === 'hidden_ai_peer') {
      emitData.senderType = 'student'
      emitData.senderId = `virtual-${groupId}`
    } else {
      emitData.senderType = 'ai'
      emitData.senderId = null
    }

    io.to(`group:${groupId}`).emit('new-message', emitData)
  }
}
```

- [ ] **Step 4: Wire silence timer into Socket.IO send-message handler**

In the `send-message` handler in `src/lib/socket.ts`, after the AI trigger call, add silence timer reset:

```typescript
// After the setTimeout for handleAiTrigger, add:
const { resetSilenceTimer } = await import('./ai-engine')
const groupData = await prisma.group.findUnique({
  where: { id: groupId },
  include: { activity: true },
})
if (groupData) {
  const config = (await import('./ai-config')).mergeAiConfig(
    groupData.activity.aiConfig as Record<string, unknown>,
    groupData.aiConfig as Record<string, unknown> | null
  )
  if (config.silenceThreshold > 0 && config.triggerMode !== 'mention_only') {
    resetSilenceTimer(groupId, socket.data.activityId, config.silenceThreshold * 1000)
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- __tests__/lib/ai-engine.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai-engine.ts __tests__/lib/ai-engine.test.ts src/lib/socket.ts
git commit -m "feat: AI chat engine with ChatGPT, trigger logic, frequency control"
```

---

## Task 7: Message API with Hidden AI Masking

**Files:**
- Create: `src/app/api/messages/[groupId]/route.ts`
- Test: `__tests__/api/messages.test.ts`

- [ ] **Step 1: Write message API test with masking**

```typescript
// __tests__/api/messages.test.ts
describe('Message API', () => {
  test('student API masks hidden AI peer messages', () => {
    const messages = [
      { id: '1', senderType: 'student', senderId: 's1', senderName: '张三', content: 'Hi', aiMetadata: null },
      { id: '2', senderType: 'ai', senderId: null, senderName: '王明', content: 'Hello', aiMetadata: { tokens: 10 } },
    ]
    const masked = maskMessagesForStudent(messages, 'hidden_ai_peer', 'group1')
    expect(masked[1].senderType).toBe('student')
    expect(masked[1].senderId).toBe('virtual-group1')
    expect(masked[1].aiMetadata).toBeUndefined()
  })
})
```

- [ ] **Step 2: Implement message API**

```typescript
// src/app/api/messages/[groupId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthPayload, unauthorized, forbidden } from '@/lib/middleware'

export async function GET(request: NextRequest, { params }: { params: { groupId: string } }) {
  const payload = getAuthPayload(request)
  if (!payload) return unauthorized()

  const group = await prisma.group.findUnique({
    where: { id: params.groupId },
    include: { activity: true },
  })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Authorization: student must be member, teacher must own activity
  if (payload.role === 'student') {
    const member = await prisma.groupMember.findFirst({
      where: { studentId: payload.userId, groupId: params.groupId },
    })
    if (!member) return forbidden()
  } else if (payload.role === 'teacher') {
    if (group.activity.teacherId !== payload.userId) return forbidden()
  }

  const messages = await prisma.message.findMany({
    where: { groupId: params.groupId },
    orderBy: { timestamp: 'asc' },
  })

  // Mask hidden AI messages for students
  const result = messages.map((msg) => {
    const base: Record<string, unknown> = {
      id: msg.id,
      groupId: msg.groupId,
      senderId: msg.senderId,
      senderType: msg.senderType,
      senderName: msg.senderName,
      content: msg.content,
      timestamp: msg.timestamp,
    }

    if (payload.role === 'teacher') {
      base.aiMetadata = msg.aiMetadata
      return base
    }

    // Student: mask hidden AI peer
    if (msg.senderType === 'ai' && group.aiRole === 'hidden_ai_peer') {
      base.senderType = 'student'
      base.senderId = `virtual-${params.groupId}`
      // Don't include aiMetadata
    }

    return base
  })

  return NextResponse.json({ messages: result })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/ __tests__/api/messages.test.ts
git commit -m "feat: message API with hidden AI identity masking for students"
```

---

## Task 8: Concept Map Generation

**Files:**
- Create: `src/lib/concept-map-generator.ts`, `src/app/api/activities/[id]/concept-maps/route.ts`, `src/app/api/activities/[id]/concept-maps/[mapId]/route.ts`
- Test: `__tests__/lib/concept-map-generator.test.ts`

- [ ] **Step 1: Write concept map generator test**

```typescript
// __tests__/lib/concept-map-generator.test.ts
import { parseConceptMapResponse } from '@/lib/concept-map-generator'

describe('Concept Map Generator', () => {
  test('parseConceptMapResponse extracts valid nodes and edges', () => {
    const raw = JSON.stringify({
      nodes: [
        { id: 'n1', label: '光合作用', category: '过程' },
        { id: 'n2', label: '叶绿素', category: '物质' },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', relation: '需要' },
      ],
    })

    const result = parseConceptMapResponse(raw)
    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
    expect(result.nodes[0].position).toBeDefined()
  })

  test('parseConceptMapResponse handles malformed JSON gracefully', () => {
    const result = parseConceptMapResponse('not json')
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/concept-map-generator.test.ts
```

- [ ] **Step 3: Implement concept map generator**

```typescript
// src/lib/concept-map-generator.ts
import OpenAI from 'openai'
import pdfParse from 'pdf-parse'
import { readFile } from 'fs/promises'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ConceptNode {
  id: string
  label: string
  category: string
  color: string
  position: { x: number; y: number }
}

interface ConceptEdge {
  id: string
  source: string
  target: string
  relation: string
}

interface ConceptMapData {
  nodes: ConceptNode[]
  edges: ConceptEdge[]
}

const CATEGORY_COLORS: Record<string, string> = {
  '理论': '#4F46E5',
  '方法': '#059669',
  '案例': '#D97706',
  '概念': '#7C3AED',
  '过程': '#DC2626',
  '物质': '#2563EB',
  default: '#6B7280',
}

export function parseConceptMapResponse(raw: string): ConceptMapData {
  try {
    // Try to extract JSON from the response (may have markdown wrapping)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { nodes: [], edges: [] }

    const data = JSON.parse(jsonMatch[0])

    const nodes: ConceptNode[] = (data.nodes || []).map((n: Record<string, string>, i: number) => ({
      id: n.id || `n${i}`,
      label: n.label || '',
      category: n.category || '概念',
      color: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.default,
      position: { x: 150 + (i % 4) * 250, y: 100 + Math.floor(i / 4) * 200 },
    }))

    const edges: ConceptEdge[] = (data.edges || []).map((e: Record<string, string>, i: number) => ({
      id: e.id || `e${i}`,
      source: e.source,
      target: e.target,
      relation: e.relation || '',
    }))

    return { nodes, edges }
  } catch {
    return { nodes: [], edges: [] }
  }
}

export async function extractPdfText(pdfPath: string): Promise<string> {
  const fullPath = path.join(process.cwd(), pdfPath)
  const buffer = await readFile(fullPath)
  const data = await pdfParse(buffer)
  // Truncate to ~8000 tokens (~32000 chars)
  return data.text.slice(0, 32000)
}

const CONCEPT_MAP_PROMPT = `分析以下内容，提取核心概念和概念之间的关系，生成知识图谱。

要求：
1. 提取 8-15 个最重要的概念作为节点
2. 每个节点有 id、label（概念名）、category（分类，如：理论、方法、案例、概念、过程、物质）
3. 提取概念之间的关系作为边，每条边有 id、source、target、relation（关系描述，如：导致、属于、对比、包含）
4. 返回严格的 JSON 格式：{ "nodes": [...], "edges": [...] }
5. 只返回 JSON，不要其他文字`

export async function generateConceptMap(
  content: string,
  type: 'pdf' | 'chat'
): Promise<ConceptMapData> {
  const typeHint = type === 'pdf'
    ? '以下是课件内容：'
    : '以下是学生的小组讨论记录：'

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: CONCEPT_MAP_PROMPT },
      { role: 'user', content: `${typeHint}\n\n${content}` },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  })

  const raw = completion.choices[0]?.message?.content || ''
  return parseConceptMapResponse(raw)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/lib/concept-map-generator.test.ts
```

- [ ] **Step 5: Implement concept map API routes**

```typescript
// src/app/api/activities/[id]/concept-maps/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import { extractPdfText, generateConceptMap } from '@/lib/concept-map-generator'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const maps = await prisma.conceptMap.findMany({
      where: { activity: { id: params.id, teacherId: payload.userId } },
      include: { group: true },
      orderBy: [{ group: { groupNumber: 'asc' } }, { type: 'asc' }],
    })
    return NextResponse.json({ conceptMaps: maps })
  } catch {
    return unauthorized()
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId, status: 'ended' },
      include: { groups: true },
    })
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found or not ended' }, { status: 400 })
    }

    // Extract PDF text
    let pdfText = ''
    if (activity.pdfUrl) {
      pdfText = await extractPdfText(activity.pdfUrl)
    }

    const results: Array<{ groupId: string; groupNumber: number; status: string }> = []

    // Generate concept maps for each group serially
    for (const group of activity.groups) {
      try {
        // PDF-based concept map
        if (pdfText) {
          const pdfMap = await generateConceptMap(pdfText, 'pdf')
          await prisma.conceptMap.upsert({
            where: { id: `${group.id}-pdf` },
            update: { nodes: pdfMap.nodes, edges: pdfMap.edges, originalNodes: pdfMap.nodes, originalEdges: pdfMap.edges },
            create: {
              id: `${group.id}-pdf`,
              activityId: params.id,
              groupId: group.id,
              type: 'pdf_based',
              nodes: pdfMap.nodes,
              edges: pdfMap.edges,
              originalNodes: pdfMap.nodes,
              originalEdges: pdfMap.edges,
            },
          })
        }

        // Chat-based concept map
        const messages = await prisma.message.findMany({
          where: { groupId: group.id },
          orderBy: { timestamp: 'asc' },
          take: 200,
        })
        const chatText = messages.map((m) => `${m.senderName}: ${m.content}`).join('\n')

        if (chatText) {
          const chatMap = await generateConceptMap(chatText, 'chat')
          await prisma.conceptMap.upsert({
            where: { id: `${group.id}-chat` },
            update: { nodes: chatMap.nodes, edges: chatMap.edges, originalNodes: chatMap.nodes, originalEdges: chatMap.edges },
            create: {
              id: `${group.id}-chat`,
              activityId: params.id,
              groupId: group.id,
              type: 'chat_based',
              nodes: chatMap.nodes,
              edges: chatMap.edges,
              originalNodes: chatMap.nodes,
              originalEdges: chatMap.edges,
            },
          })
        }

        results.push({ groupId: group.id, groupNumber: group.groupNumber, status: 'success' })
      } catch (error) {
        results.push({ groupId: group.id, groupNumber: group.groupNumber, status: 'failed' })
      }
    }

    return NextResponse.json({ results })
  } catch {
    return unauthorized()
  }
}
```

```typescript
// src/app/api/activities/[id]/concept-maps/[mapId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthPayload, unauthorized, forbidden } from '@/lib/middleware'

export async function GET(request: NextRequest, { params }: { params: { id: string; mapId: string } }) {
  const payload = getAuthPayload(request)
  if (!payload) return unauthorized()

  const map = await prisma.conceptMap.findFirst({
    where: { id: params.mapId, activityId: params.id },
    include: { group: true },
  })
  if (!map) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ conceptMap: map })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string; mapId: string } }) {
  const payload = getAuthPayload(request)
  if (!payload || payload.role !== 'teacher') return unauthorized()

  const body = await request.json()

  const map = await prisma.conceptMap.update({
    where: { id: params.mapId },
    data: {
      ...(body.nodes && { nodes: body.nodes }),
      ...(body.edges && { edges: body.edges }),
      editedByTeacher: true,
      editedAt: new Date(),
    },
  })

  return NextResponse.json({ conceptMap: map })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/concept-map-generator.ts src/app/api/activities/[id]/concept-maps/ __tests__/lib/concept-map-generator.test.ts
git commit -m "feat: concept map generation from PDF and chat via ChatGPT"
```

---

## Task 9: Data Export API

**Files:**
- Create: `src/lib/export.ts`, `src/app/api/activities/[id]/export/route.ts`
- Test: `__tests__/lib/export.test.ts`

- [ ] **Step 1: Write export test**

```typescript
// __tests__/lib/export.test.ts
import { messagesToCsv, formatExperimentConditions } from '@/lib/export'

describe('Export', () => {
  test('messagesToCsv formats messages correctly', () => {
    const messages = [
      { timestamp: new Date('2026-03-23T10:00:00Z'), senderName: '张三', senderType: 'student', content: 'Hello', groupId: 'g1' },
    ]
    const csv = messagesToCsv(messages as never[])
    expect(csv).toContain('timestamp,group_id,sender_name,sender_type,content')
    expect(csv).toContain('张三')
    expect(csv).toContain('student')
  })

  test('formatExperimentConditions lists group AI roles', () => {
    const groups = [
      { groupNumber: 1, aiRole: 'system_helper', _count: { members: 3 } },
      { groupNumber: 2, aiRole: 'hidden_ai_peer', _count: { members: 4 } },
    ]
    const csv = formatExperimentConditions(groups as never[])
    expect(csv).toContain('group_number,ai_role,student_count')
    expect(csv).toContain('1,system_helper,3')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/export.test.ts
```

- [ ] **Step 3: Implement export utilities**

```typescript
// src/lib/export.ts
import { Message, ActivityLog, Group, ConceptMap } from '@prisma/client'

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export function messagesToCsv(messages: (Message & { group?: { groupNumber: number } })[]): string {
  const header = 'timestamp,group_id,sender_name,sender_type,content'
  const rows = messages.map((m) =>
    [
      m.timestamp.toISOString(),
      m.groupId,
      escapeCsv(m.senderName),
      m.senderType,
      escapeCsv(m.content),
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export function aiLogToJson(messages: Message[]): string {
  const aiMessages = messages
    .filter((m) => m.senderType === 'ai' && m.aiMetadata)
    .map((m) => ({
      id: m.id,
      groupId: m.groupId,
      timestamp: m.timestamp,
      senderName: m.senderName,
      content: m.content,
      metadata: m.aiMetadata,
    }))
  return JSON.stringify(aiMessages, null, 2)
}

export function activityLogsToCsv(logs: ActivityLog[]): string {
  const header = 'timestamp,user_id,user_type,action,metadata'
  const rows = logs.map((l) =>
    [
      l.timestamp.toISOString(),
      l.userId,
      l.userType,
      l.action,
      escapeCsv(JSON.stringify(l.metadata)),
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export function formatExperimentConditions(
  groups: (Pick<Group, 'groupNumber' | 'aiRole'> & { _count: { members: number } })[]
): string {
  const header = 'group_number,ai_role,student_count'
  const rows = groups.map((g) => `${g.groupNumber},${g.aiRole},${g._count.members}`)
  return [header, ...rows].join('\n')
}

export function conceptMapsToJson(maps: ConceptMap[]): string {
  return JSON.stringify(
    maps.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      type: m.type,
      nodes: m.nodes,
      edges: m.edges,
      originalNodes: m.originalNodes,
      originalEdges: m.originalEdges,
      editedByTeacher: m.editedByTeacher,
      generatedAt: m.generatedAt,
      editedAt: m.editedAt,
    })),
    null,
    2
  )
}
```

- [ ] **Step 4: Implement export API**

```typescript
// src/app/api/activities/[id]/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import {
  messagesToCsv,
  aiLogToJson,
  activityLogsToCsv,
  formatExperimentConditions,
  conceptMapsToJson,
} from '@/lib/export'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId },
    })
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (type === 'messages') {
      const messages = await prisma.message.findMany({
        where: { group: { activityId: params.id } },
        orderBy: { timestamp: 'asc' },
      })
      return new NextResponse(messagesToCsv(messages), {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="messages.csv"' },
      })
    }

    if (type === 'ai-logs') {
      const messages = await prisma.message.findMany({
        where: { group: { activityId: params.id }, senderType: 'ai' },
        orderBy: { timestamp: 'asc' },
      })
      return new NextResponse(aiLogToJson(messages), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="ai-logs.json"' },
      })
    }

    if (type === 'activity-logs') {
      const logs = await prisma.activityLog.findMany({
        where: { activityId: params.id },
        orderBy: { timestamp: 'asc' },
      })
      return new NextResponse(activityLogsToCsv(logs), {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="activity-logs.csv"' },
      })
    }

    if (type === 'concept-maps') {
      const maps = await prisma.conceptMap.findMany({
        where: { activityId: params.id },
      })
      return new NextResponse(conceptMapsToJson(maps), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="concept-maps.json"' },
      })
    }

    if (type === 'conditions') {
      const groups = await prisma.group.findMany({
        where: { activityId: params.id },
        include: { _count: { select: { members: true } } },
        orderBy: { groupNumber: 'asc' },
      })
      return new NextResponse(formatExperimentConditions(groups), {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="experiment-conditions.csv"' },
      })
    }

    // type === 'all': return JSON summary of all data types available
    return NextResponse.json({
      exports: [
        { type: 'messages', format: 'CSV', description: '聊天记录' },
        { type: 'ai-logs', format: 'JSON', description: 'AI 日志' },
        { type: 'activity-logs', format: 'CSV', description: '行为日志' },
        { type: 'concept-maps', format: 'JSON', description: '概念图数据' },
        { type: 'conditions', format: 'CSV', description: '实验条件' },
      ],
    })
  } catch {
    return unauthorized()
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- __tests__/lib/export.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/export.ts src/app/api/activities/[id]/export/ __tests__/lib/export.test.ts
git commit -m "feat: research data export — messages, AI logs, activity logs, concept maps, conditions"
```

---

## Task 10: Frontend — Landing Page, Teacher Auth & Dashboard

**Files:**
- Create: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/teacher/login/page.tsx`, `src/app/teacher/register/page.tsx`, `src/app/teacher/dashboard/page.tsx`
- Create: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/card.tsx`

- [ ] **Step 1: Create shared UI primitives**

```typescript
// src/components/ui/button.tsx
import { ButtonHTMLAttributes } from 'react'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  )
}
```

```typescript
// src/components/ui/input.tsx
import { InputHTMLAttributes } from 'react'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
  )
}
```

```typescript
// src/components/ui/card.tsx
import { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`} {...props} />
}
```

- [ ] **Step 2: Create root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GroupTalk — 协作学习研究平台',
  description: '教育研究协作学习平台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Create landing page**

```typescript
// src/app/page.tsx
'use client'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">GroupTalk</h1>
          <p className="text-gray-500 mt-2">协作学习研究平台</p>
        </div>
        <Card>
          <div className="space-y-4">
            <Link href="/teacher/login">
              <Button className="w-full">老师入口</Button>
            </Link>
            <Link href="/student/join">
              <Button className="w-full bg-green-600 hover:bg-green-700">学生入口</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create teacher login page**

```typescript
// src/app/teacher/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function TeacherLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '登录失败')
      return
    }

    const data = await res.json()
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.teacher))
    router.push('/teacher/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">老师登录</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">登录</Button>
          <p className="text-sm text-center text-gray-500">
            没有账号？<Link href="/teacher/register" className="text-blue-600">注册</Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Create teacher register page**

```typescript
// src/app/teacher/register/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function TeacherRegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '注册失败')
      return
    }

    const data = await res.json()
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.teacher))
    router.push('/teacher/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">老师注册</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">注册</Button>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Create teacher dashboard**

```typescript
// src/app/teacher/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Activity {
  id: string
  title: string
  joinCode: string
  status: string
  createdAt: string
  _count: { students: number; groups: number }
}

export default function DashboardPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/teacher/login'); return }

    fetch('/api/activities', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setActivities(data.activities || []))
  }, [router])

  const statusLabels: Record<string, string> = {
    draft: '草稿', waiting: '等待中', active: '进行中', ended: '已结束',
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">我的活动</h1>
        <Link href="/teacher/activities/new">
          <Button>创建活动</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {activities.map((a) => (
          <Link key={a.id} href={`/teacher/activities/${a.id}`}>
            <Card className="hover:shadow-md transition cursor-pointer">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-sm text-gray-500">
                    活动码: {a.joinCode} · {a._count.students} 名学生 · {a._count.groups} 个小组
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm bg-gray-100">
                  {statusLabels[a.status] || a.status}
                </span>
              </div>
            </Card>
          </Link>
        ))}

        {activities.length === 0 && (
          <p className="text-center text-gray-400 py-12">还没有活动，点击右上角创建一个</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/ src/components/ui/
git commit -m "feat: frontend — landing page, teacher auth, dashboard"
```

---

## Task 11: Frontend — Create Activity (PDF Upload + AI Config)

**Files:**
- Create: `src/app/teacher/activities/new/page.tsx`, `src/components/ai-config-form.tsx`

- [ ] **Step 1: Create AI config form component**

```typescript
// src/components/ai-config-form.tsx
'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface AiConfigFormProps {
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

export function AiConfigForm({ value, onChange }: AiConfigFormProps) {
  const role = (value.role as string) || 'system_helper'

  function update(key: string, val: unknown) {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">AI 角色</label>
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={role}
          onChange={(e) => update('role', e.target.value)}
        >
          <option value="system_helper">系统助手（@触发）</option>
          <option value="known_ai_peer">已知 AI 同伴</option>
          <option value="hidden_ai_peer">隐藏 AI 同伴</option>
        </select>
      </div>

      {role === 'hidden_ai_peer' && (
        <div>
          <label className="block text-sm font-medium mb-1">虚拟学生名</label>
          <Input
            value={(value.displayName as string) || ''}
            onChange={(e) => update('displayName', e.target.value)}
            placeholder="如：王明"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">角色人设 Prompt</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 h-24"
          value={(value.systemPrompt as string) || ''}
          onChange={(e) => update('systemPrompt', e.target.value)}
          placeholder="设定 AI 的角色和行为..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">主动程度</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={(value.proactiveness as string) || 'medium'}
            onChange={(e) => update('proactiveness', e.target.value)}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">触发方式</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={(value.triggerMode as string) || 'mention_only'}
            onChange={(e) => update('triggerMode', e.target.value)}
          >
            <option value="mention_only">仅 @触发</option>
            <option value="auto">自动参与</option>
            <option value="hybrid">混合</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">沉默阈值（秒）</label>
          <Input
            type="number"
            value={(value.silenceThreshold as number) || 60}
            onChange={(e) => update('silenceThreshold', Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">最大频率（条/分钟）</label>
          <Input
            type="number"
            value={(value.maxFrequency as number) || 2}
            onChange={(e) => update('maxFrequency', Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">模型</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={(value.model as string) || 'gpt-4o'}
            onChange={(e) => update('model', e.target.value)}
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Temperature</label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={(value.temperature as number) || 0.7}
            onChange={(e) => update('temperature', Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create new activity page**

```typescript
// src/app/teacher/activities/new/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AiConfigForm } from '@/components/ai-config-form'

export default function NewActivityPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [aiConfig, setAiConfig] = useState<Record<string, unknown>>({ role: 'system_helper' })
  const [groupMin, setGroupMin] = useState(2)
  const [groupMax, setGroupMax] = useState(4)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const token = localStorage.getItem('token')

    // 1. Create activity
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title }),
    })
    const { activity } = await res.json()

    // 2. Upload PDF
    if (pdf) {
      const formData = new FormData()
      formData.append('pdf', pdf)
      await fetch(`/api/activities/${activity.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
    }

    // 3. Update AI config and group size
    await fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        aiConfig,
        groupSize: { min: groupMin, max: groupMax },
        status: 'waiting',
      }),
    })

    router.push(`/teacher/activities/${activity.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">创建新活动</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="font-semibold mb-3">基本信息</h3>
          <Input placeholder="活动标题" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">上传 PDF 课件</h3>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdf(e.target.files?.[0] || null)}
            className="w-full"
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">分组设置</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">最少人数</label>
              <Input type="number" min={2} max={4} value={groupMin} onChange={(e) => setGroupMin(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm mb-1">最多人数</label>
              <Input type="number" min={2} max={4} value={groupMax} onChange={(e) => setGroupMax(Number(e.target.value))} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">AI 设置</h3>
          <AiConfigForm value={aiConfig} onChange={setAiConfig} />
        </Card>

        <Button type="submit" className="w-full" disabled={loading || !title}>
          {loading ? '创建中...' : '创建并发布活动'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/teacher/activities/new/ src/components/ai-config-form.tsx
git commit -m "feat: create activity page with PDF upload, AI config, group settings"
```

---

## Task 12: Frontend — Activity Detail, Waiting Room & Group Management

**Files:**
- Create: `src/app/teacher/activities/[id]/page.tsx`, `src/app/teacher/activities/[id]/groups/page.tsx`
- Create: `src/components/waiting-room.tsx`, `src/components/group-manager.tsx`
- Create: `src/app/student/join/page.tsx`, `src/app/student/waiting/page.tsx`

- [ ] **Step 1: Create student join page**

```typescript
// src/app/student/join/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function StudentJoinPage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joinCode: joinCode.toUpperCase(), studentNumber, name }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '加入失败')
      return
    }

    const data = await res.json()
    localStorage.setItem('token', data.token)
    localStorage.setItem('student', JSON.stringify(data.student))
    localStorage.setItem('activityId', data.activityId)
    router.push('/student/waiting')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">加入活动</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="活动码" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required />
          <Input placeholder="学号" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} required />
          <Input placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">加入</Button>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create student waiting room page**

```typescript
// src/app/student/waiting/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { Card } from '@/components/ui/card'

export default function StudentWaitingPage() {
  const router = useRouter()
  const [status, setStatus] = useState('等待老师开始活动...')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const activityId = localStorage.getItem('activityId')
    if (!token || !activityId) { router.push('/student/join'); return }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
    })

    socket.emit('join-waiting', activityId)

    const student = JSON.parse(localStorage.getItem('student') || '{}')
    socket.on('activity-started', (data: { studentId: string; groupId: string }) => {
      if (data.studentId === student.id) {
        localStorage.setItem('groupId', data.groupId)
        router.push('/student/chat')
      }
    })

    return () => { socket.disconnect() }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="text-center">
        <div className="animate-pulse text-4xl mb-4">...</div>
        <p className="text-lg">{status}</p>
        <p className="text-sm text-gray-400 mt-2">老师开始活动后会自动跳转</p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create teacher activity detail page (waiting room + controls)**

```typescript
// src/app/teacher/activities/[id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Student { id: string; studentNumber: string; name: string }
interface Activity {
  id: string; title: string; joinCode: string; status: string
  students: Student[]
}

export default function ActivityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [activity, setActivity] = useState<Activity | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  async function loadActivity() {
    const res = await fetch(`/api/activities/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setActivity(data.activity)
  }

  useEffect(() => { loadActivity() }, [params.id])

  async function handleStartGrouping() {
    // Auto-assign groups, then navigate to group management
    await fetch(`/api/activities/${params.id}/groups`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    router.push(`/teacher/activities/${params.id}/groups`)
  }

  async function handleEndDiscussion() {
    await fetch(`/api/activities/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'ended' }),
    })
    loadActivity()
  }

  if (!activity) return <div className="p-6">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{activity.title}</h1>
        <span className="px-3 py-1 rounded-full bg-gray-100">{activity.status}</span>
      </div>

      <Card>
        <h3 className="font-semibold mb-2">活动码</h3>
        <p className="text-3xl font-mono tracking-wider">{activity.joinCode}</p>
        <p className="text-sm text-gray-500 mt-1">将此活动码分享给学生</p>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">已加入的学生 ({activity.students.length})</h3>
          <Button onClick={loadActivity} className="bg-gray-200 text-gray-700 hover:bg-gray-300">刷新</Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {activity.students.map((s) => (
            <div key={s.id} className="p-2 bg-gray-50 rounded text-sm">
              {s.name} ({s.studentNumber})
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-4">
        {activity.status === 'waiting' && (
          <Button onClick={handleStartGrouping} disabled={activity.students.length < 2}>
            开始分组 ({activity.students.length} 人)
          </Button>
        )}

        {activity.status === 'active' && (
          <>
            <Button onClick={handleEndDiscussion} className="bg-red-600 hover:bg-red-700">
              结束讨论
            </Button>
            <Link href={`/teacher/activities/${params.id}/groups`}>
              <Button className="bg-gray-600 hover:bg-gray-700">查看分组</Button>
            </Link>
          </>
        )}

        {activity.status === 'ended' && (
          <>
            <Link href={`/teacher/activities/${params.id}/concept-maps`}>
              <Button>查看概念图</Button>
            </Link>
            <Link href={`/teacher/activities/${params.id}/export`}>
              <Button className="bg-gray-600 hover:bg-gray-700">导出数据</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create group management page**

```typescript
// src/app/teacher/activities/[id]/groups/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Student { id: string; studentNumber: string; name: string }
interface GroupMember { id: string; student: Student }
interface Group { id: string; groupNumber: number; aiRole: string; members: GroupMember[] }

export default function GroupManagementPage() {
  const router = useRouter()
  const params = useParams()
  const [groups, setGroups] = useState<Group[]>([])

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  async function loadGroups() {
    const res = await fetch(`/api/activities/${params.id}/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setGroups(data.groups)
  }

  useEffect(() => { loadGroups() }, [params.id])

  async function handleMoveStudent(studentId: string, targetGroupId: string) {
    await fetch(`/api/activities/${params.id}/groups/${targetGroupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ addStudentId: studentId }),
    })
    loadGroups()
  }

  async function handleChangeAiRole(groupId: string, aiRole: string) {
    await fetch(`/api/activities/${params.id}/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ aiRole }),
    })
    loadGroups()
  }

  async function handleConfirm() {
    await fetch(`/api/activities/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'active' }),
    })
    // Students are notified via Socket.IO from the server-side PATCH handler
    router.push(`/teacher/activities/${params.id}`)
  }

  async function handleReshuffle() {
    await fetch(`/api/activities/${params.id}/groups`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    loadGroups()
  }

  const roleLabels: Record<string, string> = {
    system_helper: '系统助手',
    known_ai_peer: '已知AI同伴',
    hidden_ai_peer: '隐藏AI同伴',
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">分组管理</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {groups.map((group) => (
          <Card key={group.id}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">第 {group.groupNumber} 组</h3>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={group.aiRole}
                onChange={(e) => handleChangeAiRole(group.id, e.target.value)}
              >
                <option value="system_helper">系统助手</option>
                <option value="known_ai_peer">已知AI同伴</option>
                <option value="hidden_ai_peer">隐藏AI同伴</option>
              </select>
            </div>

            <div className="space-y-1">
              {group.members.map((m) => (
                <div key={m.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span>{m.student.name} ({m.student.studentNumber})</span>
                  <select
                    className="border rounded px-1 text-xs"
                    value={group.id}
                    onChange={(e) => handleMoveStudent(m.student.id, e.target.value)}
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>第 {g.groupNumber} 组</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <Button onClick={handleReshuffle} className="bg-gray-600 hover:bg-gray-700">重新随机分组</Button>
        <Button onClick={handleConfirm}>确认分组并开始</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/teacher/activities/[id]/ src/app/student/
git commit -m "feat: activity detail, student join/waiting, group management with manual adjustment"
```

---

## Task 13: Frontend — Chat Room (PDF + Real-time Chat)

**Files:**
- Create: `src/app/student/chat/page.tsx`, `src/components/pdf-viewer.tsx`, `src/components/chat-panel.tsx`, `src/components/chat-message.tsx`

- [ ] **Step 1: Create PDF viewer component**

```typescript
// src/components/pdf-viewer.tsx
'use client'
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <div className="flex gap-2">
          <Button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ◀
          </Button>
          <span className="text-sm leading-8">{pageNumber} / {numPages}</span>
          <Button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ▶
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300">-</Button>
          <span className="text-sm leading-8">{Math.round(scale * 100)}%</span>
          <Button onClick={() => setScale((s) => Math.min(2.0, s + 0.1))} className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300">+</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create chat message component**

```typescript
// src/components/chat-message.tsx
interface ChatMessageProps {
  senderName: string
  senderType: 'student' | 'ai'
  content: string
  timestamp: string
  isOwn: boolean
}

export function ChatMessage({ senderName, senderType, content, timestamp, isOwn }: ChatMessageProps) {
  const isAi = senderType === 'ai'
  const time = new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[70%] ${isOwn ? 'bg-blue-500 text-white' : isAi ? 'bg-purple-100' : 'bg-gray-100'} rounded-lg px-3 py-2`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold opacity-80">
            {senderName}
            {isAi && <span className="ml-1 px-1 bg-purple-200 text-purple-800 rounded text-[10px]">AI</span>}
          </span>
          <span className="text-[10px] opacity-50">{time}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create chat panel component**

```typescript
// src/components/chat-panel.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChatMessage } from '@/components/chat-message'

interface Message {
  id: string
  senderId: string | null
  senderType: 'student' | 'ai'
  senderName: string
  content: string
  timestamp: string
}

interface ChatPanelProps {
  socket: Socket | null
  groupId: string
  currentUserId: string
  members: Array<{ name: string }>
}

export function ChatPanel({ socket, groupId, currentUserId, members }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load existing messages
    const token = localStorage.getItem('token')
    fetch(`/api/messages/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
  }, [groupId])

  useEffect(() => {
    if (!socket) return

    socket.on('new-message', (msg: Message) => {
      setMessages((prev) => [...prev, msg])
    })

    return () => { socket.off('new-message') }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim() || !socket) return
    socket.emit('send-message', { content: input.trim() })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b bg-gray-50 text-sm">
        成员: {members.map((m) => m.name).join(', ')}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            senderName={msg.senderName}
            senderType={msg.senderType}
            content={msg.content}
            timestamp={msg.timestamp}
            isOwn={msg.senderId === currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入消息..."
        />
        <Button onClick={handleSend}>发送</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create student chat page**

```typescript
// src/app/student/chat/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { PdfViewer } from '@/components/pdf-viewer'
import { ChatPanel } from '@/components/chat-panel'

export default function StudentChatPage() {
  const router = useRouter()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [activity, setActivity] = useState<{ pdfUrl: string } | null>(null)
  const [members, setMembers] = useState<Array<{ name: string }>>([])
  const [groupId, setGroupId] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedGroupId = localStorage.getItem('groupId')
    const student = JSON.parse(localStorage.getItem('student') || '{}')

    if (!token || !storedGroupId) { router.push('/student/join'); return }

    setGroupId(storedGroupId)
    setCurrentUserId(student.id)

    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
    })

    s.on('connect', () => {
      s.emit('join-group', storedGroupId)
    })

    s.on('error', (msg: string) => {
      if (msg === 'Discussion has ended') {
        alert('讨论已结束')
      }
    })

    setSocket(s)

    // Fetch activity info and group members via student API
    fetch('/api/student/my-group', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.activity) {
          setActivity({ pdfUrl: data.activity.pdfUrl })
          setMembers(data.members || [])
        }
      })

    return () => { s.disconnect() }
  }, [router])

  return (
    <div className="h-screen flex">
      <div className="w-1/2 border-r">
        {activity?.pdfUrl ? (
          <PdfViewer url={activity.pdfUrl} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">加载 PDF 中...</div>
        )}
      </div>
      <div className="w-1/2">
        <ChatPanel
          socket={socket}
          groupId={groupId}
          currentUserId={currentUserId}
          members={members}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/student/chat/ src/components/pdf-viewer.tsx src/components/chat-panel.tsx src/components/chat-message.tsx
git commit -m "feat: student chat room — PDF viewer, real-time chat with Socket.IO"
```

---

## Task 14: Frontend — Concept Map Editor

**Files:**
- Create: `src/app/teacher/activities/[id]/concept-maps/page.tsx`, `src/components/concept-map-editor.tsx`, `src/components/concept-map-node.tsx`

- [ ] **Step 1: Create custom concept map node component**

```typescript
// src/components/concept-map-node.tsx
import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface ConceptNodeData {
  label: string
  category: string
  color: string
}

export const ConceptMapNode = memo(function ConceptMapNode({ data }: NodeProps<ConceptNodeData>) {
  return (
    <div
      className="px-4 py-2 rounded-lg border-2 shadow-sm min-w-[100px] text-center"
      style={{ borderColor: data.color, backgroundColor: `${data.color}15` }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="text-xs text-gray-500 mb-1">{data.category}</div>
      <div className="font-medium text-sm">{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})
```

- [ ] **Step 2: Create concept map editor component**

```typescript
// src/components/concept-map-editor.tsx
'use client'
import { useCallback, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Node,
  Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ConceptMapNode } from './concept-map-node'
import { Button } from '@/components/ui/button'

const nodeTypes = { concept: ConceptMapNode }

interface ConceptMapEditorProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  onSave: (nodes: Node[], edges: Edge[]) => void
  title: string
}

export function ConceptMapEditor({ initialNodes, initialEdges, onSave, title }: ConceptMapEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.map((n) => ({ ...n, type: 'concept' }))
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map((e) => ({
      ...e,
      label: (e.data as { relation?: string })?.relation || e.label,
      markerEnd: { type: MarkerType.ArrowClosed },
    }))
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const label = prompt('请输入关系描述：')
      if (label) {
        setEdges((eds) => addEdge({ ...connection, label, markerEnd: { type: MarkerType.ArrowClosed } }, eds))
      }
    },
    [setEdges]
  )

  function addNode() {
    const label = prompt('请输入概念名称：')
    if (!label) return
    const category = prompt('请输入分类（如：理论、方法、案例）：') || '概念'
    const id = `n${Date.now()}`
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'concept',
        position: { x: 300, y: 300 },
        data: { label, category, color: '#6B7280' },
      },
    ])
  }

  function deleteSelected() {
    setNodes((nds) => nds.filter((n) => !n.selected))
    setEdges((eds) => eds.filter((e) => !e.selected))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
        <span className="font-semibold text-sm">{title}</span>
        <div className="flex gap-2">
          <Button onClick={addNode} className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700">添加节点</Button>
          <Button onClick={deleteSelected} className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700">删除选中</Button>
          <Button onClick={() => onSave(nodes, edges)} className="px-2 py-1 text-xs">保存</Button>
        </div>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create concept maps page**

```typescript
// src/app/teacher/activities/[id]/concept-maps/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ConceptMapEditor } from '@/components/concept-map-editor'
import { Button } from '@/components/ui/button'
import { Node, Edge } from 'reactflow'

interface ConceptMap {
  id: string
  groupId: string
  type: string
  nodes: Array<{ id: string; label: string; category: string; color: string; position: { x: number; y: number } }>
  edges: Array<{ id: string; source: string; target: string; relation: string }>
  group: { groupNumber: number }
}

export default function ConceptMapsPage() {
  const params = useParams()
  const [maps, setMaps] = useState<ConceptMap[]>([])
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const [generating, setGenerating] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  async function loadMaps() {
    const res = await fetch(`/api/activities/${params.id}/concept-maps`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setMaps(data.conceptMaps || [])
  }

  useEffect(() => { loadMaps() }, [params.id])

  async function handleGenerate() {
    setGenerating(true)
    await fetch(`/api/activities/${params.id}/concept-maps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    await loadMaps()
    setGenerating(false)
  }

  async function handleSave(mapId: string, nodes: Node[], edges: Edge[]) {
    await fetch(`/api/activities/${params.id}/concept-maps/${mapId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nodes, edges }),
    })
    alert('保存成功')
  }

  // Group maps by group
  const groupNumbers = [...new Set(maps.map((m) => m.group.groupNumber))].sort()
  const currentGroupNum = groupNumbers[currentGroupIndex]
  const pdfMap = maps.find((m) => m.group.groupNumber === currentGroupNum && m.type === 'pdf_based')
  const chatMap = maps.find((m) => m.group.groupNumber === currentGroupNum && m.type === 'chat_based')

  function toFlowNodes(map?: ConceptMap): Node[] {
    if (!map) return []
    return map.nodes.map((n) => ({
      id: n.id,
      type: 'concept',
      position: n.position,
      data: { label: n.label, category: n.category, color: n.color },
    }))
  }

  function toFlowEdges(map?: ConceptMap): Edge[] {
    if (!map) return []
    return map.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.relation,
      data: { relation: e.relation },
    }))
  }

  if (maps.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-6">概念图</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? '生成中...' : '生成概念图'}
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h1 className="font-bold">概念图</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setCurrentGroupIndex((i) => Math.max(0, i - 1))}
            disabled={currentGroupIndex === 0}
            className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ◀
          </Button>
          <span>第 {currentGroupNum} 组</span>
          <Button
            onClick={() => setCurrentGroupIndex((i) => Math.min(groupNumbers.length - 1, i + 1))}
            disabled={currentGroupIndex >= groupNumbers.length - 1}
            className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ▶
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-1/2 border-r">
          {pdfMap ? (
            <ConceptMapEditor
              key={`pdf-${pdfMap.id}`}
              initialNodes={toFlowNodes(pdfMap)}
              initialEdges={toFlowEdges(pdfMap)}
              onSave={(nodes, edges) => handleSave(pdfMap.id, nodes, edges)}
              title="PDF 概念图"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">无 PDF 概念图</div>
          )}
        </div>
        <div className="w-1/2">
          {chatMap ? (
            <ConceptMapEditor
              key={`chat-${chatMap.id}`}
              initialNodes={toFlowNodes(chatMap)}
              initialEdges={toFlowEdges(chatMap)}
              onSave={(nodes, edges) => handleSave(chatMap.id, nodes, edges)}
              title="聊天概念图"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">无聊天概念图</div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/teacher/activities/[id]/concept-maps/ src/components/concept-map-editor.tsx src/components/concept-map-node.tsx
git commit -m "feat: concept map editor with React Flow — dual view, add/delete/connect nodes"
```

---

## Task 15: Frontend — Data Export Page

**Files:**
- Create: `src/app/teacher/activities/[id]/export/page.tsx`, `src/components/export-panel.tsx`

- [ ] **Step 1: Create export page**

```typescript
// src/app/teacher/activities/[id]/export/page.tsx
'use client'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const EXPORT_TYPES = [
  { type: 'messages', label: '聊天记录', format: 'CSV', description: '所有组的完整聊天记录，含时间戳和发言者信息' },
  { type: 'ai-logs', label: 'AI 日志', format: 'JSON', description: '每条 AI 消息的 prompt、response 和 token 使用' },
  { type: 'activity-logs', label: '行为日志', format: 'CSV', description: '学生的所有操作记录（加入、发消息、翻页等）' },
  { type: 'concept-maps', label: '概念图数据', format: 'JSON', description: '所有组的概念图节点和边（含编辑前后版本）' },
  { type: 'conditions', label: '实验条件', format: 'CSV', description: '每个组的 AI 角色配置和人数' },
]

export default function ExportPage() {
  const params = useParams()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  function handleDownload(type: string, format: string) {
    const url = `/api/activities/${params.id}/export?type=${type}`
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}.${format === 'CSV' ? 'csv' : 'json'}`

    // Need to fetch with auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        a.href = url
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">数据导出</h1>

      <div className="space-y-4">
        {EXPORT_TYPES.map((item) => (
          <Card key={item.type} className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{item.label}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{item.format}</span>
            </div>
            <Button onClick={() => handleDownload(item.type, item.format)}>下载</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/teacher/activities/[id]/export/
git commit -m "feat: data export page — download messages, AI logs, activity logs, concept maps, conditions"
```

---

## Task 16: Docker Deployment

**Files:**
- Create: `Dockerfile`, update `docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/tsconfig.server.json ./
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p uploads

EXPOSE 3000
CMD ["npm", "run", "start"]
```

- [ ] **Step 2: Update docker-compose.yml for full deployment**

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: grouptalk
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/grouptalk
      JWT_SECRET: ${JWT_SECRET:-change-this-in-production}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      NEXT_PUBLIC_SOCKET_URL: http://localhost:3000
    depends_on:
      - db
    volumes:
      - uploads:/app/uploads

volumes:
  pgdata:
  uploads:
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile docker-compose.yml
git commit -m "feat: Docker deployment — Dockerfile and docker-compose for full stack"
```

---

## Task 17: End-to-End Smoke Test

- [ ] **Step 1: Start the full stack locally**

```bash
docker-compose up -d db
cp .env.example .env  # fill in real OPENAI_API_KEY
npx prisma migrate deploy
npm run dev
```

- [ ] **Step 2: Verify teacher flow**

1. Open http://localhost:3000
2. Register as teacher
3. Create activity with PDF upload
4. Copy join code

- [ ] **Step 3: Verify student flow**

1. Open http://localhost:3000 in incognito
2. Join with activity code + student number + name
3. Repeat with 3-4 students

- [ ] **Step 4: Verify group assignment + chat**

1. As teacher: start grouping, adjust if needed, confirm
2. As students: verify redirect to chat room
3. Send messages, verify real-time delivery
4. Verify AI responds (based on role configuration)

- [ ] **Step 5: Verify concept map + export**

1. As teacher: end discussion
2. Generate concept maps
3. Edit concept map (drag nodes, add/delete)
4. Export all data types, verify file contents

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: finalize GroupTalk v1 — all features implemented and smoke tested"
```
