# Backend Setup & API Documentation

## ၁။ ခြုံငုံသုံးသပ်ချက် (Overview)

ဤ Backend စနစ်သည် **Issue Tracking & IT Support System** အတွက် အဓိက အင်ဂျင်ဖြစ်ပြီး **LINE Messaging API (Group Bot)** နှင့် **Real-time Webapp Dashboard** နှစ်ခုစလုံးကို ချိတ်ဆက်ပေးထားပါသည်။

* **Technology Stack:** Node.js (v20+), TypeScript, Express, Oracle Database (`oracledb`), Socket.io, `@line/bot-sdk`
* **Database Connection:** `192.168.0.131:1521/LACONIC` (User: `ISSUE_TRACKING`)
* **Local Storage Path:** `D:/Issue Tracking System/backend/storage/uploads`
* **Server Port:** `5000` (Default)

---

## ၂။ ဖိုင်နှင့် ဖိုဒါ တည်ဆောက်ပုံ (Directory Structure)

```
D:\Issue Tracking System\backend\
├── src\
│   ├── config\
│   │   └── index.ts                 # Environment variables နှင့် Server configuration
│   ├── database\
│   │   ├── db.ts                    # PostgreSQL Connection Pool (pg.Pool)
│   │   ├── schema.sql               # PostgreSQL DDL Tables, Enums နှင့် Indexes များ
│   │   ├── init-db.ts               # Schema Auto-run script (npm run db:init)
│   │   └── seed.ts                  # ERP Modules & Sample Companies seed script (npm run db:seed)
│   ├── services\
│   │   ├── line.service.ts          # LINE Bot SDK (Reply, Push to Group, Download Content)
│   │   ├── storage.service.ts       # Windows Server Disk ပေါ်သို့ Screenshots သိမ်းဆည်းခြင်း
│   │   ├── ticket.service.ts        # Auto-assignment, Ticket Creation & Message Logs
│   │   └── sla.service.ts           # Priority အလိုက် SLA Deadlines တွက်ချက်ခြင်း
│   ├── controllers\
│   │   ├── webhook.controller.ts    # LINE Group Webhook (စာသားနှင့် ပုံများ ဖမ်းယူခြင်း)
│   │   ├── ticket.controller.ts     # Ticket စာရင်း filter လုပ်ခြင်း၊ Status ပြောင်းခြင်း၊ စာပြန်ခြင်း
│   │   └── meta.controller.ts       # Companies, Modules, Agents Dropdown & Dashboard Stats
│   ├── routes\
│   │   ├── webhook.routes.ts        # POST /api/webhook/line
│   │   ├── ticket.routes.ts         # /api/tickets API endpoints
│   │   └── meta.routes.ts           # /api/meta API endpoints
│   ├── sockets\
│   │   └── socket.server.ts         # Real-time WebSockets (Dashboard သို့ realtime event ပို့ခြင်း)
│   ├── app.ts                       # Express App, CORS & Static File Serving (/uploads)
│   └── server.ts                    # Server Entry Point & Socket.io initialization
├── storage\
│   └── uploads\                     # Download ရယူထားသော Screenshot များ သိမ်းဆည်းမည့်နေရာ
├── .env                             # Active Environment Configuration
├── .env.example                     # Environment Template
├── package.json
└── tsconfig.json
```

---

## ၃။ ပတ်ဝန်းကျင် ပြင်ဆင်ခြင်း (.env Configuration)

ဖိုင်တည်နေရာ: `D:\Issue Tracking System\backend\.env`

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Oracle Database Configuration
DB_USER=ISSUE_TRACKING
DB_PASSWORD=ISSUE_TRACKING
DB_CONNECT_STRING=192.168.0.131:1521/LACONIC

# Redis (Queue & SLA Monitoring)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# LINE Messaging API (LINE Developers Console မှ ရယူရန်)
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# Windows Server Storage Path
STORAGE_UPLOAD_DIR=D:/Issue Tracking System/backend/storage/uploads
```

---

## ၄။ Database Setup ပြုလုပ်နည်း (Database Initialization)

### ၄.၁ Table များ အလိုအလျောက် ဆောက်ခြင်း
PostgreSQL Server တွင် Database (ဥပမာ- `issue_tracking_db`) တည်ဆောက်ပြီးပါက အောက်ပါ command ကို run ပါ-
```powershell
cd "D:\Issue Tracking System\backend"
npm run db:init
```
> ဤ command သည် `src/database/schema.sql` ထဲရှိ Tables ၁၀ ခု (`companies`, `line_groups`, `users`, `erp_modules`, `agent_skills`, `tickets`, `ticket_messages`, `attachments`, `ticket_history`, `sla_config`) အားလုံးကို အလိုအလျောက် တည်ဆောက်ပေးပါသည်။

### ၄.၂ Seed Data ထည့်သွင်းခြင်း
ERP Modules (Accounting, Inventory, Sales, HR, POS) နှင့် နမူနာ ကုမ္ပဏီများကို ထည့်သွင်းရန်:
```powershell
npm run db:seed
```

---

## ၅။ REST API Endpoints စာရင်း

### ၅.၁ System & Health
* **`GET /health`**
  * Server အလုပ်လုပ်နေမှု အခြေအနေကို စစ်ဆေးခြင်း
  * Response: `{"status": "ok", "timestamp": "2026-09-30T..."}`

### ၅.၂ LINE Webhook
* **`POST /api/webhook/line`**
  * LINE Platform မှ Group Chat events များကို လက်ခံသော Webhook Endpoint
  * Commands:
    * `@bot bind <COMPANY_CODE>` (ဥပမာ- `@bot bind KBZ`) - LINE Group နှင့် Company ကို ချိတ်ဆက်ခြင်း
    * `#ticket [Description]` - Ticket အသစ် ဖွင့်ခြင်း
    * Follow-up Messages & Screenshots - ပွင့်နေဆဲ Ticket သို့ အလိုအလျောက် ပေါင်းထည့်ခြင်း

### ၅.၃ Tickets Management
* **`GET /api/tickets`**
  * Ticket စာရင်းများကို Multi-filter ဖြင့် ရယူခြင်း
  * Query Parameters:
    * `companyId` - သီးသန့် ကုမ္ပဏီအလိုက် စစ်ထုတ်ရန်
    * `moduleId` - ERP Module အလိုက် စစ်ထုတ်ရန်
    * `priority` - `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
    * `status` - `NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_CLIENT`, `RESOLVED`, `CLOSED`
    * `assigneeId` - တာဝန်ခံ အင်ဂျင်နီယာအလိုက် စစ်ထုတ်ရန်
    * `search` - Ticket No သို့မဟုတ် ခေါင်းစဉ် ရှာဖွေရန်
* **`GET /api/tickets/:id`**
  * Ticket တစ်ခုချင်းစီ၏ အသေးစိတ် အချက်အလက်၊ Customer Message များနှင့် Error Screenshots များကို ရယူခြင်း
* **`POST /api/tickets/:id/reply`**
  * Agent ဘက်မှ စာပြန်ခြင်း သို့မဟုတ် Internal Note ရေးသားခြင်း
  * Request Body:
    ```json
    {
      "messageText": "စစ်ဆေးပြီးပါပြီ၊ DB Table Lock ဖြေရှင်းထားပါသည်။",
      "isInternalNote": false,
      "userId": "agent-uuid-here"
    }
    ```
  * *မှတ်ချက်: `isInternalNote: false` ဖြစ်ပါက LINE Group ထဲသို့ Bot အနေဖြင့် အလိုအလျောက် စာပြန်ပို့ပေးပါသည်။*
* **`PATCH /api/tickets/:id/status`**
  * Ticket အခြေအနေ ပြောင်းလဲခြင်း (ဥပမာ- `IN_PROGRESS`, `RESOLVED`, `CLOSED`)

### ၅.၄ Meta Data & Analytics
* **`GET /api/meta/companies`** - တက်ကြွနေသော ကုမ္ပဏီများ စာရင်း
* **`GET /api/meta/modules`** - ERP Modules စာရင်း (Accounting, Inventory, etc.)
* **`GET /api/meta/agents`** - အင်ဂျင်နီယာများ စာရင်းနှင့် လက်ရှိ ကိုင်တွယ်ထားသော Ticket အရေအတွက်
* **`GET /api/meta/stats`** - Dashboard Summary (Total Open, Critical Open, Unassigned, Resolved Today)

---

## ၆။ Real-time WebSocket Events (Socket.io)

Frontend (Next.js Dashboard) မှ `http://localhost:5000` သို့ Socket.io ချိတ်ဆက်ထားပါက အောက်ပါ Events များကို Real-time လက်ခံရရှိမည်ဖြစ်သည်:

| Event Name | ဖော်ပြချက် | Payload |
| :--- | :--- | :--- |
| `ticket:created` | Customer က LINE မှ Ticket အသစ်တင်သည့်အခါ | Ticket Object အပြည့်အစုံ |
| `ticket:updated` | Ticket Status သို့မဟုတ် Assignee ပြောင်းလဲသည့်အခါ | Updated Ticket Object |
| `message:received` | Customer ထံမှ စာသား သို့မဟုတ် Screenshot အသစ် ရောက်သည့်အခါ | Message & Attachment Object |
| `sla:warning` | သတ်မှတ်ချိန်အတွင်း မဖြေရှင်းနိုင်ဘဲ SLA ကျော်လွန်တော့မည့်အခါ | Warning Alert Info |

---

## ၇။ Local Windows Server Storage စီမံခန့်ခွဲမှု

LINE Webhook မှ ရောက်ရှိလာသော Error Screenshot များကို အောက်ပါ လမ်းကြောင်းအတိုင်း ရက်စွဲနှင့် Ticket ID အလိုက် စနစ်တကျ သိမ်းဆည်းပါသည်:

```
D:\Issue Tracking System\backend\storage\uploads\{YYYY}\{MM}\{ticketId}\{uuid}.jpg
```

* **Web URL:** `http://localhost:5000/uploads/{YYYY}/{MM}/{ticketId}/{uuid}.jpg` ဖြင့် Dashboard တွင် တိုက်ရိုက် ကြည့်ရှုနိုင်ပါသည်။

---

## ၈။ Server Commands အကျဉ်းချုပ်

| Command | Action |
| :--- | :--- |
| `npm run dev` | Development Mode ဖြင့် Auto-reload စနစ်သုံး၍ Run ရန် |
| `npm run build` | TypeScript ဖိုင်များကို `dist/` သို့ JavaScript အဖြစ် Compile လုပ်ရန် |
| `npm start` | Production Mode ဖြင့် `dist/server.js` ကို Run ရန် |
| `npm run db:init` | Database Tables များကို တည်ဆောက်ရန် |
| `npm run db:seed` | Seed Data (Modules, Companies) ထည့်ရန် |
