# 🐝 TicketsHive — Support Desk

A sleek IT helpdesk and ticket management system built with React + Vite.

---

## ✨ Features

- 🎫 **Kanban Board** — Ticket columns: NEW, IN PROGRESS, RESOLVED, CLOSED
- 🔍 **Smart Filtering** — Search by title/assignee + filter by Status, Type, Priority
- ⏱️ **Live SLA Timers** — Real-time countdown per ticket
- 📊 **Analytics Dashboard** — Donut chart (by status) + Bar chart (by type)
- ✅ **Task Manager** — Separate task list with badge count
- 🆕 **Create Ticket Modal** — Title, Type, Priority, Assignee, SLA, Description

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + JSX |
| Bundler | Vite |
| Charts | Recharts |
| Linting | ESLint |

---

## 🚀 Getting Started

```bash
git clone https://github.com/your-username/tickets-hive.git
cd tickets-hive
npm install
npm run dev
```

---

## 📁 Project Structure

```
tickets-hive/
├── public/
├── src/
│   ├── assets/
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

---

## 🎟️ Ticket Fields

| Field | Options |
|---|---|
| Type | Incident, Service Request, Task, Change Request |
| Priority | Low, Medium, High, Critical |
| Status | New, In Progress, Resolved, Closed |
| SLA | Custom hours — countdown starts at creation |
| Assigned To | Agent name |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
