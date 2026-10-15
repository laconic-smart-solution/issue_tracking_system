# Frontend Setup & Component Guide

## ၁။ ခြုံငုံသုံးသပ်ချက် (Overview)

ဤ Frontend Dashboard သည် **IT Support Issue Tracking System** ၏ Agent/Admin ဘက်မှ အသုံးပြုမည့် Interface ဖြစ်ပြီး **Next.js 16 (App Router) + Tailwind CSS + Shadcn UI** ဖြင့် တည်ဆောက်ထားပါသည်။ LINE Group Bot မှ တက်လာသော Ticket များကို Real-time ကြည့်ရှုပြီး ဖြေရှင်းနိုင်ရန် ရည်ရွယ်ထားသည်။

* **Framework:** Next.js 16.3.7 (App Router + Turbopack)
* **UI Library:** Tailwind CSS v4 + Shadcn UI
* **Real-time:** Socket.io Client
* **HTTP Client:** Axios
* **Date Utility:** date-fns
* **Dev Server URL:** `http://localhost:3000`

---

## ၂။ ဖိုင်နှင့် ဖိုဒါ တည်ဆောက်ပုံ (Directory Structure)

```
D:\Issue Tracking System\frontend\
├── app\
│   ├── layout.tsx                      # Root layout: Sidebar, SocketProvider, TooltipProvider
│   ├── page.tsx                        # / → /dashboard (Auto-redirect)
│   ├── globals.css                     # Global Tailwind + Shadcn base styles
│   ├── dashboard\
│   │   └── page.tsx                    # Dashboard: KPI Stats + New Ticket Table
│   └── tickets\
│       ├── page.tsx                    # Ticket List: Filter Bar + Full Ticket Table
│       └── [id]\
│           └── page.tsx                # Ticket Detail: Chat Panel + Info Panel + History
├── components\
│   ├── layout\
│   │   ├── Sidebar.tsx                 # Navigation sidebar (dark theme)
│   │   └── TopBar.tsx                  # Page header + Real-time alert banner + Connection status
│   ├── providers\
│   │   └── SocketProvider.tsx          # Socket.io React Context (new ticket / SLA warning events)
│   ├── dashboard\
│   │   └── StatsCards.tsx              # KPI Stats Cards (Open, Critical, Unassigned, Resolved Today)
│   ├── tickets\
│   │   ├── TicketBadge.tsx             # <PriorityBadge /> and <StatusBadge /> with color coding
│   │   ├── SLATimer.tsx                # Live SLA Countdown Timer (green/orange/red pulse)
│   │   ├── TicketFiltersBar.tsx        # Multi-filter bar (Company, Module, Priority, Status, Agent, Search)
│   │   ├── TicketTable.tsx             # Ticket list table with priority row highlighting
│   │   └── ChatPanel.tsx               # Message thread + LINE Reply + Internal Note + Screenshot viewer
│   └── ui\                             # Shadcn UI Components (auto-generated)
│       ├── button.tsx
│       ├── badge.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── table.tsx
│       ├── textarea.tsx
│       ├── separator.tsx
│       ├── scroll-area.tsx
│       └── tooltip.tsx
├── lib\
│   ├── types.ts                        # TypeScript interface definitions (Ticket, Company, User, etc.)
│   ├── api.ts                          # Axios API client (all backend endpoints)
│   └── utils.ts                        # Shadcn utility (cn function)
├── .env.local                          # Frontend environment variables
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## ၃။ ပတ်ဝန်းကျင် ပြင်ဆင်ခြင်း (.env.local)

ဖိုင်တည်နေရာ: `D:\Issue Tracking System\frontend\.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> Backend Server ၏ IP Address သို့မဟုတ် Domain ပြောင်းလဲပါက ဤ ဖိုင်တွင်သာ ပြင်ဆင်ရန် လိုအပ်ပါသည်။

---

## ၄။ Pages အသေးစိတ် ဖော်ပြချက်

### ၄.၁ Dashboard Page (`/dashboard`)

**ဖိုင်:** `app/dashboard/page.tsx`

| Section | ဖော်ပြချက် |
| :--- | :--- |
| **KPI Stats Cards** | Total Open Tickets, Critical Open, Unassigned, Resolved Today — Backend `/api/meta/stats` မှ ရယူ |
| **New Ticket Table** | Status = `NEW` ဖြစ်သော လက်ရှိ သတ်မှတ်ချိန်ပေးမရသေးသော Ticket များ |
| **Real-time Refresh** | Socket.io `ticket:created` event ရောက်သည်နှင့် Stats + Table အလိုအလျောက် ပြောင်းလဲ |
| **Manual Refresh** | "Refresh" ခလုတ်ဖြင့် ကိုယ်တိုင် ပြန်လည် ဆွဲယူနိုင် |

---

### ၄.၂ Ticket List Page (`/tickets`)

**ဖိုင်:** `app/tickets/page.tsx`

| Section | ဖော်ပြချက် |
| :--- | :--- |
| **Filter Bar** | Company, ERP Module, Priority, Status, Assignee, Free-text Search — ပေါင်းစပ် filter လုပ်နိုင် |
| **Filter Reset** | Filter တစ်ခုမဆို ရွေးချယ်ပြီးနောက် "Clear" ခလုတ်ဖြင့် ချက်ချင်း reset ပြုလုပ်နိုင် |
| **Ticket Count** | Filter ရလဒ်အရ ကျန်ရှိသော Ticket အရေအတွက် ပြသ |
| **Real-time New** | Socket.io မှ Ticket အသစ်ရောက်ပါက Table အလိုအလျောက် ပြောင်းလဲ |

**TicketTable Features:**
* Critical Ticket rows → ဘယ်ဘက်ကြောင်းကို **နီ** ဖြင့် Highlight
* High Ticket rows → ဘယ်ဘက်ကြောင်းကို **လိမ်မော်ရောင်** ဖြင့် Highlight
* SLA Countdown Badge တစ်ခုချင်းစီတွင် ပြသ (မပြီးဆုံးသေးသော Ticket များအတွက်)
* Ticket No ကို Click ပြီး Detail Page သို့ သွားနိုင်

---

### ၄.၃ Ticket Detail Page (`/tickets/[id]`)

**ဖိုင်:** `app/tickets/[id]/page.tsx`

Split-pane Layout ဖြင့် ဖွဲ့စည်းထားသည်:

```
┌─────────────────────────────┬─────────────────┐
│  LEFT PANE (flex-1)         │  RIGHT PANE     │
│  ─────────────────          │  (w-72)         │
│  Sub-header: Priority,      │  Update Status  │
│  Status, SLA Timer          │  ─────────────  │
│                             │  Company Info   │
│  Title & Sender             │  ERP Module     │
│  ─────────────────          │  Assigned To    │
│                             │  ─────────────  │
│  [Chat] [History] Tabs      │  SLA Deadlines  │
│                             │  ─────────────  │
│  Message Thread             │  Timestamps     │
│  ─────────────────          │  (Created /     │
│  Reply Box (LINE / Note)    │   Resolved /    │
│                             │   Closed)       │
└─────────────────────────────┴─────────────────┘
```

#### Chat Tab:
* **Customer Messages** → ဘယ်ဘက် (White border bubble)
* **Agent Replies** → ညာဘက် (Blue bubble)
* **Internal Notes** → Yellow background bubble (🔒 Internal Note label ပါ)
* **BOT/System Messages** → Gray bubble
* **Error Screenshots** → Inline image preview (click to open full size in new tab)
* **Reply Box Toggle:** "💬 Reply to LINE" (Customer ဆီ Send ရမည်) / "🔒 Internal Note" (Agent တွင်း မှတ်ချက်) နှစ်မျိုးခွဲ
* `Ctrl+Enter` ကီးဖြင့် မြန်မြန် Send လုပ်နိုင်

#### History Tab:
* Status ပြောင်းခြင်း၊ Assign ပြောင်းခြင်း၊ Priority ပြောင်းခြင်း — မည်သူက မည်သည့်အချိန်တွင် ဆောင်ရွက်ခဲ့သည်ကို Audit Trail ပြသ

---

## ၅။ Components အသေးစိတ် ဖော်ပြချက်

### ၅.၁ PriorityBadge / StatusBadge (`TicketBadge.tsx`)

Priority နှင့် Status တန်ဖိုးများကို အရောင်ခွဲ၍ Badge ပုံစံ ပြသသော Component:

| Priority | Badge | Color |
| :--- | :--- | :--- |
| CRITICAL | 🔴 CRITICAL | Red |
| HIGH | 🟠 HIGH | Orange |
| MEDIUM | 🟡 MEDIUM | Yellow |
| LOW | 🟢 LOW | Green |

| Status | Badge | Color |
| :--- | :--- | :--- |
| NEW | New | Blue |
| ASSIGNED | Assigned | Purple |
| IN_PROGRESS | In Progress | Indigo |
| PENDING_CLIENT | Pending Client | Yellow |
| RESOLVED | Resolved | Green |
| CLOSED | Closed | Gray |

---

### ၅.၂ SLATimer (`SLATimer.tsx`)

Ticket ၏ SLA Deadline အချိန်ကို Real-time Countdown ဖြင့် ပြသ:

| ကျန်ရှိသောအချိန် | Badge Color | သတိပေးပုံ |
| :--- | :--- | :--- |
| > 30 မိနစ် | 🟢 Green | ပုံမှန် |
| ≤ 30 မိနစ် | 🟠 Orange | Warning |
| ≤ 10 မိနစ် | 🔴 Red + Pulse | Critical Alert |
| ကုန်ဆုံးသွားပြီ | 🔴 SLA Breached! | Breached |

**Props:**
```tsx
<SLATimer
  deadline="2026-09-30T14:00:00Z"   // ISO timestamp
  priority="CRITICAL"                 // TicketPriority
  label="Resolve by"                  // Optional label
/>
```

---

### ၅.၃ SocketProvider (`SocketProvider.tsx`)

App တစ်ခုလုံးအတွက် Real-time WebSocket Connection ကို React Context ဖြင့် စီမံသည်:

```tsx
// Component တစ်ခုတွင် သုံးပုံ:
const { isConnected, newTicketAlert, slaWarning } = useSocket();
```

| Context Value | အမျိုးအစား | ဖော်ပြချက် |
| :--- | :--- | :--- |
| `socket` | `Socket\|null` | Socket.io client instance |
| `isConnected` | `boolean` | Live connection status |
| `newTicketAlert` | `Ticket\|null` | အသစ်ရောက်သော Ticket Object |
| `slaWarning` | `SocketSLAWarning\|null` | SLA Warning payload |
| `clearNewTicketAlert()` | `() => void` | Alert ကို ဖယ်ရှားရန် |
| `clearSlaWarning()` | `() => void` | SLA Warning ကို ဖယ်ရှားရန် |

**TopBar တွင် ပေါ်လာမည့် Real-time Alerts:**
* 🔵 New Ticket: `"🎫 New Ticket: #TK-202609-0001 — Alpha Retail Group"`
* 🔴 SLA Warning: `"🚨 SLA Warning: Ticket #TK-202609-0001 (8min left)"`

---

## ၆။ API Client (`lib/api.ts`)

Backend REST API များကို ခေါ်ယူနိုင်သော Axios-based functions:

```ts
// Tickets
getTickets(filters?: TicketFilters): Promise<Ticket[]>
getTicketById(id: string): Promise<Ticket>
replyToTicket(id, text, isInternalNote, userId?): Promise<void>
updateTicketStatus(id, status, userId?): Promise<Ticket>

// Meta (Dropdown data)
getCompanies(): Promise<Company[]>
getModules(): Promise<ErpModule[]>
getAgents(): Promise<User[]>
getDashboardStats(): Promise<DashboardStats>
```

---

## ၇။ Frontend Server Commands

```powershell
# Development Mode (Auto-reload)
cd "D:\Issue Tracking System\frontend"
npm run dev

# Production Build (error check + optimization)
npm run build

# Start Production Mode
npm start
```

**URLs:**
* Local: `http://localhost:3000`
* Network (LAN access): `http://192.168.x.x:3000`

---

## ၈။ လတ်တလောတွင် ရသော Pages

| Route | Page |
| :--- | :--- |
| `/` | `/dashboard` သို့ Auto-redirect |
| `/dashboard` | KPI Stats + New Tickets |
| `/tickets` | Full Ticket List + Filters |
| `/tickets/:id` | Chat + Info + History |

---

## ၉။ ဆက်လက်ဆောက်ရမည့် Pages (Phase 2 / Future)

| Route | ရည်ရွယ်ချက် |
| :--- | :--- |
| `/companies` | Company Manager (Bind LINE Group, CRUD) |
| `/agents` | Agent Manager (Skills, Online Status) |
| `/reports` | SLA Report & Analytics Charts |
| `/settings` | SLA Config Editor, ERP Module Management |
