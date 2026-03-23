import React, { useState, useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

/* ══════════════════════════════════════════════════
   ⚙️  EMAILJS CONFIG — YAHAN APNI VALUES BHAREIN
   Setup guide: EMAILJS_SETUP_GUIDE.md padho
══════════════════════════════════════════════════ */
const EMAILJS_CONFIG = {
  SERVICE_ID:    "service_XXXXXXX",       // EmailJS Service ID
  TEMPLATE_ID:   "template_XXXXXXX",      // EmailJS Template ID
  PUBLIC_KEY:    "XXXXXXXXXXXXXXXXXXXX",   // EmailJS Public Key
  MANAGER_EMAIL: "manager@yourcompany.com", // Manager ki email
};

/* ── Agent email — assignee naam se fallback ── */
const AGENT_EMAILS = {
  "Alice":      "alice@yourcompany.com",
  "Bob":        "bob@yourcompany.com",
  "Carol":      "carol@yourcompany.com",
  "Dave":       "dave@yourcompany.com",
  "Eve":        "eve@yourcompany.com",
  "Unassigned": "support@yourcompany.com",
};

/*
 ╔══════════════════════════════════════════════════════╗
 ║  TICKET-ID SPECIFIC EMAIL MAP                        ║
 ║  Har ticket ID ke liye alag To + CC email set karo.  ║
 ║  Agar ID yahan nahi mila → AGENT_EMAILS se fallback  ║
 ╚══════════════════════════════════════════════════════╝
*/
const TICKET_EMAILS = {
  1: { to: "alice@yourcompany.com",    cc: "it-lead@yourcompany.com"       },
  2: { to: "bob@yourcompany.com",      cc: "hr@yourcompany.com"            },
  3: { to: "carol@yourcompany.com",    cc: "dba@yourcompany.com"           },
  4: { to: "dave@yourcompany.com",     cc: "infra@yourcompany.com"         },
  5: { to: "eve@yourcompany.com",      cc: "messaging-team@yourcompany.com"},
  // Naye tickets ke liye neeche add karo:
  // 6: { to: "agent@company.com", cc: "team@company.com" },
};

/*
  resolveEmail — priority order:
  1. TICKET_EMAILS[ticket.id]   ← ticket-ID specific (sabse pehle check)
  2. AGENT_EMAILS[assignedTo]   ← assignee naam fallback
  3. MANAGER_EMAIL              ← last resort
*/
const resolveEmail = (ticket) => {
  const specific = TICKET_EMAILS[ticket.id];
  if (specific) {
    return {
      to:     specific.to,
      cc:     [specific.cc, EMAILJS_CONFIG.MANAGER_EMAIL].filter(Boolean).join(", "),
      source: `Ticket-ID #${ticket.id} (direct mapping)`,
    };
  }
  const agentMail = AGENT_EMAILS[ticket.assignedTo] || AGENT_EMAILS["Unassigned"];
  return {
    to:     agentMail,
    cc:     EMAILJS_CONFIG.MANAGER_EMAIL,
    source: `Agent fallback (${ticket.assignedTo})`,
  };
};

/* ─── INITIAL DATA ─── */
const now = new Date();
const initialTickets = [
  { id:1, title:"Login Issue", type:"Incident", status:"New", priority:"High", assignedTo:"Alice", createdBy:"User1", slaHours:2, createdAt:new Date(now.getTime()-1*3600000), description:"Cannot login after the latest update. Multiple users affected on Chrome and Safari.", comments:[], alertSent10:false, alertSent0:false },
  { id:2, title:"Request Laptop", type:"Service Request", status:"In Progress", priority:"Medium", assignedTo:"Bob", createdBy:"User2", slaHours:24, createdAt:new Date(now.getTime()-10*3600000), description:"Need a new laptop for onboarding. MacBook Pro 14 preferred.", comments:[{user:"Bob",text:"Ordered from procurement.",time:"09:30 AM"}], alertSent10:false, alertSent0:false },
  { id:3, title:"DB Backup Failure", type:"Incident", status:"New", priority:"Critical", assignedTo:"Carol", createdBy:"User3", slaHours:1, createdAt:new Date(now.getTime()-0.5*3600000), description:"Nightly DB backup failed at 2 AM. Requires immediate attention.", comments:[], alertSent10:false, alertSent0:false },
  { id:4, title:"VPN Access Setup", type:"Service Request", status:"Resolved", priority:"Low", assignedTo:"Dave", createdBy:"User4", slaHours:8, createdAt:new Date(now.getTime()-5*3600000), description:"New employee needs VPN credentials.", comments:[{user:"Dave",text:"Access granted and credentials sent.",time:"11:00 AM"}], alertSent10:false, alertSent0:false },
  { id:5, title:"Email Not Syncing", type:"Incident", status:"In Progress", priority:"High", assignedTo:"Eve", createdBy:"User5", slaHours:4, createdAt:new Date(now.getTime()-2*3600000), description:"Outlook is not syncing emails since this morning.", comments:[], alertSent10:false, alertSent0:false },
];

const initialTasks = [
  { id:101, title:"Update server certificates", linkedTicket:null, dueDate:"2026-03-30", priority:"High", assignedTo:"Alice", status:"Todo", notes:"SSL certs expire end of month." },
  { id:102, title:"Write runbook for DB restore", linkedTicket:3, dueDate:"2026-03-25", priority:"Critical", assignedTo:"Carol", status:"In Progress", notes:"Linked to DB Backup Failure ticket." },
  { id:103, title:"Onboarding checklist review", linkedTicket:2, dueDate:"2026-03-28", priority:"Medium", assignedTo:"Bob", status:"Todo", notes:"Ensure laptop is ready before start date." },
  { id:104, title:"Email gateway migration docs", linkedTicket:5, dueDate:"2026-04-02", priority:"High", assignedTo:"Eve", status:"Todo", notes:"Document current config before migration." },
];

/* ─── EMAIL SENDER — Ticket ID se email resolve karke bhejta hai ─── */
const sendSLAEmail = async ({ ticket, alertType, remPct, timeStr }) => {
  const { to, cc } = resolveEmail(ticket);
  const isWarning  = alertType === "10%";

  const templateParams = {
    to_email:        to,
    cc_email:        cc,
    assignee_name:   ticket.assignedTo,
    ticket_id:       `TICKET-${String(ticket.id).padStart(6, "0")}`,
    ticket_title:    ticket.title,
    ticket_priority: ticket.priority,
    ticket_status:   ticket.status,
    ticket_type:     ticket.type,
    sla_hours:       ticket.slaHours,
    alert_type:      isWarning ? "⚠️ SLA WARNING — 10% Remaining" : "🔴 SLA BREACH — Time Expired",
    time_remaining:  timeStr,
    sla_remaining:   remPct,
    alert_message:   isWarning
      ? `Ticket "${ticket.title}" (ID: ${ticket.id}) is approaching SLA breach. Only ${remPct}% time (${timeStr}) remains. Please take immediate action before the SLA is breached.`
      : `CRITICAL: Ticket "${ticket.title}" (ID: ${ticket.id}) has BREACHED its ${ticket.slaHours}-hour SLA. Immediate escalation required. Please update the status and inform the customer.`,
  };

  return emailjs.send(
    EMAILJS_CONFIG.SERVICE_ID,
    EMAILJS_CONFIG.TEMPLATE_ID,
    templateParams,
    EMAILJS_CONFIG.PUBLIC_KEY
  );
};

/* ─── SVG BEE LOGO ─── */
function BeeLogo({ size=36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="36" rx="13" ry="17" fill="#F5A623"/>
      <rect x="19" y="30" width="26" height="5" rx="2.5" fill="#1A1A1A" opacity="0.72"/>
      <rect x="19" y="39" width="26" height="5" rx="2.5" fill="#1A1A1A" opacity="0.72"/>
      <rect x="20" y="48" width="24" height="3.5" rx="1.75" fill="#1A1A1A" opacity="0.28"/>
      <circle cx="32" cy="18" r="9" fill="#F5A623"/>
      <circle cx="28.5" cy="16.5" r="2.5" fill="#1A1A1A"/>
      <circle cx="35.5" cy="16.5" r="2.5" fill="#1A1A1A"/>
      <circle cx="29.2" cy="15.8" r="1" fill="#fff"/>
      <circle cx="36.2" cy="15.8" r="1" fill="#fff"/>
      <path d="M30 22 Q32 24 34 22" stroke="#1A1A1A" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <line x1="27" y1="10" x2="22" y2="4" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="21" cy="3.5" r="2.2" fill="#F5A623" stroke="#1A1A1A" strokeWidth="1.2"/>
      <line x1="37" y1="10" x2="42" y2="4" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="43" cy="3.5" r="2.2" fill="#F5A623" stroke="#1A1A1A" strokeWidth="1.2"/>
      <ellipse cx="16" cy="25" rx="10" ry="5.5" fill="#C8E6FF" opacity="0.88" transform="rotate(-22 16 25)"/>
      <ellipse cx="48" cy="25" rx="10" ry="5.5" fill="#C8E6FF" opacity="0.88" transform="rotate(22 48 25)"/>
      <ellipse cx="14" cy="33" rx="7.5" ry="4" fill="#C8E6FF" opacity="0.6" transform="rotate(-15 14 33)"/>
      <ellipse cx="50" cy="33" rx="7.5" ry="4" fill="#C8E6FF" opacity="0.6" transform="rotate(15 50 33)"/>
      <path d="M32 53 L28.5 61 L32 57.5 L35.5 61 Z" fill="#D4820A"/>
    </svg>
  );
}

/* ─── CSS ─── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
:root {
  --bg:#0d0f14;--bg2:#13161e;--bg3:#1a1f2b;--bg4:#222838;
  --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.13);
  --text:#f0f2f5;--text2:#8891a4;--text3:#525c6e;
  --honey:#F5A623;--honey2:#e8930a;--honey-glow:rgba(245,166,35,0.15);
  --red:#ff5c5c;--orange:#ff9f43;--green:#26d07c;--blue:#5b8af5;
  --radius:14px;--radius-sm:8px;--shadow:0 4px 28px rgba(0,0,0,0.4);
}
*{box-sizing:border-box;margin:0;padding:0;}
.hive-app{font-family:'Plus Jakarta Sans',sans-serif;background:#04060e;min-height:100vh;color:var(--text);position:relative;overflow-x:hidden;}
.hive-layout{display:flex;min-height:100vh;position:relative;z-index:1;}

/* METEOR SKY */
.hive-sky{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
.hive-stars{position:absolute;inset:0;}
.hive-star{position:absolute;border-radius:50%;background:#fff;animation:starTwinkle ease-in-out infinite;}
@keyframes starTwinkle{0%,100%{opacity:0.2;transform:scale(1);}50%{opacity:1;transform:scale(1.3);}}
.hive-meteor{position:absolute;top:0;width:2px;border-radius:2px;background:linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.9) 40%,rgba(245,166,35,0.7) 70%,rgba(245,166,35,0) 100%);animation:meteorFall linear infinite;transform-origin:top center;}
@keyframes meteorFall{0%{transform:translateY(-120px) translateX(0) rotate(145deg);opacity:0;}5%{opacity:1;}80%{opacity:0.8;}100%{transform:translateY(110vh) translateX(60vw) rotate(145deg);opacity:0;}}
.hive-meteor::after{content:'';position:absolute;top:0;left:-3px;width:8px;height:100%;background:radial-gradient(ellipse at center,rgba(245,166,35,0.15) 0%,transparent 70%);border-radius:4px;}
.hive-sky-grad{position:absolute;inset:0;background:radial-gradient(ellipse at 15% 40%,rgba(20,10,50,0.6) 0%,transparent 55%),radial-gradient(ellipse at 85% 70%,rgba(5,20,50,0.5) 0%,transparent 55%);}

/* SIDEBAR */
.hive-sidebar{width:220px;background:rgba(13,15,20,0.88);backdrop-filter:blur(14px);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:24px 16px;position:sticky;top:0;height:100vh;flex-shrink:0;}
.hive-brand{display:flex;align-items:center;gap:10px;margin-bottom:32px;padding:0 4px;}
.hive-brand-title{font-size:17px;font-weight:800;color:var(--honey);letter-spacing:-0.03em;line-height:1;}
.hive-brand-sub{font-size:10px;color:var(--text3);font-weight:500;letter-spacing:0.04em;text-transform:uppercase;margin-top:2px;}
.hive-nav{display:flex;flex-direction:column;gap:4px;}
.hive-nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;transition:all 0.18s;border:none;background:transparent;font-family:'Plus Jakarta Sans',sans-serif;width:100%;text-align:left;}
.hive-nav-item:hover{background:var(--bg3);color:var(--text);}
.hive-nav-item.active{background:var(--honey-glow);color:var(--honey);border:1px solid rgba(245,166,35,0.2);}
.hive-nav-icon{font-size:15px;width:18px;text-align:center;}
.hive-nav-badge{margin-left:auto;background:rgba(255,92,92,0.2);color:#ff9090;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700;}
.hive-sidebar-footer{margin-top:auto;padding-top:16px;border-top:1px solid var(--border);}
.hive-user{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:var(--radius-sm);background:var(--bg3);border:1px solid var(--border);}
.hive-user-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--honey),#e8930a);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;}
.hive-user-name{font-size:12px;font-weight:600;color:var(--text);}
.hive-user-role{font-size:10px;color:var(--text3);}

/* MAIN */
.hive-main{flex:1;padding:28px 28px 40px;min-width:0;}
.hive-page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;}
.hive-page-title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.02em;}
.hive-page-sub{font-size:13px;color:var(--text2);margin-top:3px;}
.hive-new-btn{display:flex;align-items:center;gap:6px;padding:9px 18px;background:var(--honey);color:#1a1000;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.18s;white-space:nowrap;}
.hive-new-btn:hover{background:var(--honey2);transform:translateY(-1px);box-shadow:0 6px 20px rgba(245,166,35,0.3);}

/* STATS */
.hive-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
.hive-stat{background:rgba(19,22,30,0.75);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;position:relative;overflow:hidden;cursor:pointer;transition:all 0.2s;user-select:none;}
.hive-stat:hover{border-color:var(--border2);transform:translateY(-2px);box-shadow:var(--shadow);}
.hive-stat.active-stat{box-shadow:0 0 0 3px rgba(245,166,35,0.1);}
.hive-stat-accent{position:absolute;top:0;left:0;right:0;height:3px;border-radius:var(--radius) var(--radius) 0 0;}
.hive-stat-active-bar{position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 var(--radius) var(--radius);}
.hive-stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.hive-stat-label{font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:0.07em;}
.hive-stat-icon{font-size:16px;}
.hive-stat-num{font-size:30px;font-weight:800;letter-spacing:-0.04em;line-height:1;}
.hive-stat-hint{font-size:10px;color:var(--text3);margin-top:5px;letter-spacing:0.02em;}

/* FILTER */
.hive-active-filter{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;margin-bottom:14px;font-size:12px;font-weight:600;border:1px solid;}
.hive-active-filter-x{cursor:pointer;font-size:13px;opacity:0.7;line-height:1;}
.hive-filterbar{display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap;}
.hive-search-wrap{position:relative;flex:1;min-width:180px;}
.hive-search{width:100%;background:rgba(19,22,30,0.8);border:1px solid var(--border);border-radius:9px;padding:8px 14px 8px 36px;color:var(--text);font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;}
.hive-search::placeholder{color:var(--text3);}
.hive-search:focus{border-color:rgba(245,166,35,0.4);}
.hive-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:14px;pointer-events:none;}
.hive-fsel{background:rgba(19,22,30,0.8);border:1px solid var(--border);border-radius:9px;padding:8px 12px;color:var(--text2);font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;cursor:pointer;}
.hive-fsel option{background:#1a1f2b;}

/* KANBAN */
.hive-board{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
.hive-col{background:rgba(19,22,30,0.72);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:var(--radius);padding:16px;min-height:300px;}
.hive-col-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.hive-col-left{display:flex;align-items:center;gap:8px;}
.hive-col-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.hive-col-name{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text2);}
.hive-col-count{font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;background:var(--bg3);color:var(--text2);border:1px solid var(--border);}

/* TICKET CARD */
.hive-card{background:rgba(26,31,43,0.82);backdrop-filter:blur(6px);border:1px solid var(--border);border-radius:11px;padding:13px 13px 11px;margin-bottom:8px;cursor:pointer;transition:all 0.18s;position:relative;}
.hive-card:hover{border-color:var(--border2);transform:translateY(-2px);box-shadow:var(--shadow);}
.hive-card:hover .hive-card-del{opacity:1;}
.hive-card.overdue{border-color:rgba(255,92,92,0.4);background:rgba(255,92,92,0.06);}
.hive-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:7px;}
.hive-card-title{font-size:13px;font-weight:600;color:var(--text);line-height:1.35;flex:1;}
.hive-card-id{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;white-space:nowrap;padding-right:22px;}
.hive-card-del{position:absolute;top:9px;right:9px;width:22px;height:22px;border-radius:6px;background:rgba(255,92,92,0.1);border:1px solid rgba(255,92,92,0.2);color:var(--red);display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;opacity:0;transition:all 0.15s;z-index:2;}
.hive-card-del:hover{background:rgba(255,92,92,0.28);}
.hive-card-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px;}
.hive-chip{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;border:1px solid transparent;}
.chip-incident{background:rgba(255,92,92,0.12);color:#ff9090;border-color:rgba(255,92,92,0.22);}
.chip-service{background:rgba(91,138,245,0.12);color:#8eaeff;border-color:rgba(91,138,245,0.22);}
.chip-task{background:rgba(167,139,250,0.12);color:#c4b5fd;border-color:rgba(167,139,250,0.22);}
.chip-change{background:rgba(38,208,124,0.12);color:#6ee7a0;border-color:rgba(38,208,124,0.22);}
.chip-critical{background:rgba(255,50,50,0.18);color:#ff7070;border-color:rgba(255,50,50,0.3);}
.chip-high{background:rgba(255,92,92,0.12);color:#ffaaaa;border-color:rgba(255,92,92,0.2);}
.chip-medium{background:rgba(255,159,67,0.12);color:#ffc080;border-color:rgba(255,159,67,0.22);}
.chip-low{background:rgba(38,208,124,0.1);color:#86efac;border-color:rgba(38,208,124,0.18);}
.hive-card-footer{display:flex;align-items:center;justify-content:space-between;}
.hive-mini-user{display:flex;align-items:center;gap:5px;}
.hive-mini-av{width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,var(--honey),#c87800);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0;}
.hive-mini-name{font-size:11px;color:var(--text2);}
.hive-timer{font-size:11px;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:6px;border:1px solid var(--border);}
.hive-timer.ok{color:var(--green);border-color:rgba(38,208,124,0.22);background:rgba(38,208,124,0.06);}
.hive-timer.warn{color:var(--orange);border-color:rgba(255,159,67,0.25);background:rgba(255,159,67,0.07);}
.hive-timer.over{color:var(--red);border-color:rgba(255,92,92,0.3);background:rgba(255,92,92,0.08);animation:blink 1s steps(1) infinite;}
@keyframes blink{50%{opacity:0.45;}}
.hive-sla-bar-wrap{height:3px;background:rgba(255,255,255,0.08);border-radius:2px;margin:8px 0 2px;overflow:hidden;}
.hive-sla-bar{height:100%;border-radius:2px;transition:width 1s linear;}
.hive-empty{text-align:center;padding:28px 16px;color:var(--text3);font-size:12px;border:1px dashed var(--border);border-radius:10px;}
.hive-empty-icon{font-size:22px;margin-bottom:6px;opacity:0.35;}

/* TASKS */
.task-stats-row{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
.task-stat-pill{background:rgba(19,22,30,0.8);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:12px;color:var(--text2);}
.task-stat-pill strong{color:var(--text);font-size:18px;font-weight:800;display:block;letter-spacing:-0.02em;}
.task-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.task-form-wrap{background:rgba(19,22,30,0.9);backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px;}
.task-form-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:18px;}
.task-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;}
.task-form-full{grid-column:span 3;}
.task-section-label{font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:0.09em;margin:18px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--border);}
.task-grid{display:flex;flex-direction:column;gap:10px;}
.task-card{background:rgba(19,22,30,0.82);backdrop-filter:blur(8px);border:1px solid var(--border);border-radius:12px;padding:16px 18px;transition:all 0.18s;}
.task-card:hover{border-color:var(--border2);transform:translateY(-1px);box-shadow:var(--shadow);}
.task-card.done{opacity:0.5;}
.task-card-top{display:flex;align-items:flex-start;gap:12px;}
.task-check{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--border2);background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.18s;margin-top:1px;}
.task-check.checked{background:var(--green);border-color:var(--green);}
.task-check-icon{color:#fff;font-size:11px;font-weight:700;}
.task-body{flex:1;min-width:0;}
.task-title{font-size:14px;font-weight:600;color:var(--text);}
.task-title.done{text-decoration:line-through;color:var(--text3);}
.task-meta{display:flex;align-items:center;gap:8px;margin-top:7px;flex-wrap:wrap;}
.task-due{font-size:11px;color:var(--text3);}
.task-due.overdue-due{color:var(--red);}
.task-linked{font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(91,138,245,0.12);color:#8eaeff;border:1px solid rgba(91,138,245,0.2);}
.task-notes{font-size:12px;color:var(--text3);margin-top:6px;line-height:1.5;}
.task-actions{display:flex;gap:6px;margin-left:auto;flex-shrink:0;}
.task-action-btn{background:var(--bg3);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:5px 11px;font-size:11px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.18s;}
.task-action-btn:hover{color:var(--text);border-color:var(--border2);}
.task-action-btn.del:hover{color:var(--red);border-color:rgba(255,92,92,0.3);background:rgba(255,92,92,0.08);}

/* MAIL ALERT MODAL */
.mail-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;z-index:1200;padding:20px;backdrop-filter:blur(8px);}
.mail-modal{background:var(--bg2);border-radius:20px;width:100%;max-width:540px;box-shadow:0 0 0 1px rgba(245,166,35,0.2),0 32px 80px rgba(0,0,0,0.7);overflow:hidden;}
.mail-modal.breach{box-shadow:0 0 0 1px rgba(255,92,92,0.3),0 32px 80px rgba(0,0,0,0.7);}
.mail-modal-header{padding:20px 24px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--border);}
.mail-modal-header.warn{background:linear-gradient(135deg,rgba(245,166,35,0.12),rgba(232,147,10,0.06));}
.mail-modal-header.breach{background:linear-gradient(135deg,rgba(255,92,92,0.12),rgba(200,40,40,0.06));}
.mail-hdr-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.mail-hdr-icon.warn{background:rgba(245,166,35,0.18);border:1px solid rgba(245,166,35,0.3);}
.mail-hdr-icon.breach{background:rgba(255,92,92,0.18);border:1px solid rgba(255,92,92,0.3);}
.mail-hdr-title{font-size:16px;font-weight:800;letter-spacing:-0.01em;}
.mail-hdr-title.warn{color:var(--honey);}
.mail-hdr-title.breach{color:var(--red);}
.mail-hdr-sub{font-size:12px;margin-top:2px;}
.mail-hdr-sub.warn{color:rgba(245,166,35,0.55);}
.mail-hdr-sub.breach{color:rgba(255,92,92,0.55);}
.mail-body{padding:20px 24px;}
.mail-ticket-box{border-radius:10px;padding:12px 14px;margin-bottom:14px;}
.mail-ticket-box.warn{background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.15);}
.mail-ticket-box.breach{background:rgba(255,92,92,0.06);border:1px solid rgba(255,92,92,0.18);}
.mail-ticket-id{font-size:10px;font-family:'JetBrains Mono',monospace;font-weight:600;margin-bottom:4px;letter-spacing:0.05em;}
.mail-ticket-id.warn{color:var(--honey);}
.mail-ticket-id.breach{color:var(--red);}
.mail-ticket-title{font-size:15px;font-weight:700;color:var(--text);}
.mail-ticket-meta{display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;font-size:11px;color:var(--text2);}
.mail-ticket-meta strong{color:var(--text);}
.mail-sla-row{display:flex;align-items:center;gap:10px;border-radius:10px;padding:12px 14px;margin-bottom:14px;}
.mail-sla-row.warn{background:rgba(255,159,67,0.08);border:1px solid rgba(255,159,67,0.2);}
.mail-sla-row.breach{background:rgba(255,92,92,0.08);border:1px solid rgba(255,92,92,0.25);}
.mail-sla-icon{font-size:20px;flex-shrink:0;}
.mail-sla-text{font-size:13px;color:var(--text2);line-height:1.55;}
.mail-sla-text strong.warn{color:var(--orange);}
.mail-sla-text strong.breach{color:var(--red);}
.mail-preview{background:var(--bg3);border-radius:10px;padding:14px 16px;margin-bottom:4px;border:1px solid var(--border);}
.mail-preview-label{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:10px;}
.mail-row{display:flex;gap:8px;margin-bottom:5px;font-size:12px;}
.mail-row-k{color:var(--text3);width:55px;flex-shrink:0;font-weight:600;}
.mail-row-v{color:var(--text2);}
.mail-row-v.email{color:var(--blue);}
.mail-divider{height:1px;background:var(--border);margin:10px 0;}
.mail-subject{font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;}
.mail-body-text{font-size:12px;color:var(--text2);line-height:1.7;}
.mail-footer{display:flex;gap:10px;padding:16px 24px;border-top:1px solid var(--border);background:rgba(0,0,0,0.2);}
.mail-send-btn{flex:1;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.18s;display:flex;align-items:center;justify-content:center;gap:8px;}
.mail-send-btn.warn{background:linear-gradient(135deg,var(--honey),var(--honey2));color:#1a1000;}
.mail-send-btn.breach{background:linear-gradient(135deg,#ff4444,#cc2222);color:#fff;}
.mail-send-btn:hover{opacity:0.88;transform:translateY(-1px);}
.mail-send-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
.mail-dismiss-btn{background:var(--bg3);border:1px solid var(--border2);color:var(--text2);border-radius:10px;padding:11px 20px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.18s;}
.mail-dismiss-btn:hover{color:var(--text);}
.mail-spinner{width:14px;height:14px;border:2px solid rgba(0,0,0,0.2);border-top-color:#1a1000;border-radius:50%;animation:spin 0.7s linear infinite;}
.mail-spinner.breach{border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;}
@keyframes spin{to{transform:rotate(360deg);}}

/* SLA alert dot */
.sla-dot{width:7px;height:7px;border-radius:50%;background:var(--red);display:inline-block;margin-left:4px;animation:pdot 1s ease-in-out infinite;}
@keyframes pdot{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.5);opacity:0.5;}}

/* MODAL */
.hive-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px;backdrop-filter:blur(4px);}
.hive-modal{background:var(--bg2);border:1px solid var(--border2);border-radius:18px;padding:28px;width:100%;max-width:580px;max-height:88vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,0.5);position:relative;}
.hive-modal::-webkit-scrollbar{width:5px;}
.hive-modal::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px;}
.hive-modal-header{margin-bottom:20px;padding-right:40px;}
.hive-modal-id{font-size:11px;color:var(--honey);font-family:'JetBrains Mono',monospace;font-weight:600;margin-bottom:5px;letter-spacing:0.05em;}
.hive-modal-title{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.02em;margin-bottom:8px;}
.hive-modal-desc{font-size:13px;color:var(--text2);line-height:1.65;}
.hive-modal-actions{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;align-items:center;}
.hive-modal-actions-label{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.07em;font-weight:600;white-space:nowrap;}
.hive-modal-status-btn{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.18s;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);}
.hive-modal-status-btn:hover{color:var(--text);background:var(--bg4);}
.hive-modal-status-btn.current{color:var(--honey);border-color:rgba(245,166,35,0.35);background:var(--honey-glow);}
.hive-modal-del-btn{margin-left:auto;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.18s;border:1px solid rgba(255,92,92,0.3);background:rgba(255,92,92,0.08);color:var(--red);}
.hive-modal-del-btn:hover{background:rgba(255,92,92,0.2);}
.hive-modal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:22px;}
.hive-mfield{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 12px;}
.hive-mfield-label{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;font-weight:600;}
.hive-mfield-val{font-size:13px;color:var(--text);font-weight:600;}
.hive-divider{height:1px;background:var(--border);margin:18px 0;}
.hive-sec-label{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.09em;font-weight:700;margin-bottom:12px;}
.hive-comment{background:var(--bg3);border-radius:9px;padding:10px 12px;margin-bottom:8px;border-left:2px solid var(--honey);}
.hive-comment-who{font-size:12px;font-weight:700;color:var(--honey);}
.hive-comment-text{font-size:13px;color:var(--text2);margin-top:3px;line-height:1.5;}
.hive-comment-time{font-size:10px;color:var(--text3);margin-top:4px;}
.hive-no-comments{font-size:12px;color:var(--text3);padding:14px;text-align:center;background:var(--bg3);border-radius:9px;margin-bottom:10px;}
.hive-comment-row{display:flex;gap:8px;margin-top:12px;}
.hive-comment-input{flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:9px;padding:9px 13px;color:var(--text);font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;}
.hive-comment-input:focus{border-color:rgba(245,166,35,0.45);}
.hive-comment-input::placeholder{color:var(--text3);}
.hive-btn-honey{background:var(--honey);color:#1a1000;border:none;border-radius:9px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.18s;white-space:nowrap;}
.hive-btn-honey:hover{background:var(--honey2);}
.hive-btn-ghost{background:var(--bg3);border:1px solid var(--border2);color:var(--text2);border-radius:9px;padding:9px 18px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.18s;margin-top:14px;}
.hive-btn-ghost:hover{color:var(--text);}
.hive-modal-close{position:absolute;top:18px;right:18px;width:30px;height:30px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);color:var(--text2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all 0.18s;}
.hive-modal-close:hover{background:rgba(255,92,92,0.15);color:var(--red);}

/* FORM */
.hive-form-wrap{background:rgba(19,22,30,0.9);backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:var(--radius);padding:28px;max-width:680px;}
.hive-form-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;}
.hive-form-title{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-0.02em;}
.hive-form-cancel{display:flex;align-items:center;gap:5px;background:var(--bg3);border:1px solid var(--border2);color:var(--text2);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.18s;}
.hive-form-cancel:hover{color:var(--text);}
.hive-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
.hive-fg{display:flex;flex-direction:column;gap:5px;}
.hive-flabel{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;}
.hive-finput{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:9px 13px;color:var(--text);font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color 0.18s;}
.hive-finput:focus{border-color:rgba(245,166,35,0.45);}
.hive-finput::placeholder{color:var(--text3);}
.hive-ftextarea{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:10px 13px;color:var(--text);font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;resize:vertical;min-height:90px;width:100%;transition:border-color 0.18s;margin-top:4px;}
.hive-ftextarea:focus{border-color:rgba(245,166,35,0.45);}
.hive-ftextarea::placeholder{color:var(--text3);}
.hive-form-btns{display:flex;gap:10px;margin-top:18px;align-items:center;}

/* CONFIRM */
.hive-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:1100;padding:20px;backdrop-filter:blur(4px);}
.hive-confirm-box{background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:26px 28px;width:100%;max-width:360px;box-shadow:0 24px 60px rgba(0,0,0,0.5);text-align:center;}
.hive-confirm-icon{font-size:32px;margin-bottom:10px;}
.hive-confirm-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;}
.hive-confirm-sub{font-size:13px;color:var(--text2);margin-bottom:22px;line-height:1.5;}
.hive-confirm-btns{display:flex;gap:10px;justify-content:center;}
.hive-confirm-del{background:rgba(255,92,92,0.15);border:1px solid rgba(255,92,92,0.35);color:var(--red);border-radius:9px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
.hive-confirm-del:hover{background:rgba(255,92,92,0.28);}
.hive-confirm-cancel{background:var(--bg3);border:1px solid var(--border2);color:var(--text2);border-radius:9px;padding:9px 22px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}

/* CHARTS */
.hive-charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.hive-chart-card{background:rgba(19,22,30,0.8);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:var(--radius);padding:22px;}
.hive-chart-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;}
.hive-chart-sub{font-size:11px;color:var(--text3);margin-bottom:18px;}

/* TOAST */
.hive-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);border-radius:10px;padding:11px 22px;font-size:13px;font-weight:600;box-shadow:var(--shadow);z-index:2000;animation:toastIn 0.25s ease;white-space:nowrap;}
.hive-toast.success{background:#1a3a25;border:1px solid rgba(38,208,124,0.35);color:var(--green);}
.hive-toast.error{background:#3a1a1a;border:1px solid rgba(255,92,92,0.35);color:var(--red);}
.hive-toast.info{background:var(--bg2);border:1px solid var(--border2);color:var(--text);}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}

@media(max-width:1024px){.hive-board{grid-template-columns:1fr 1fr;}.hive-stats{grid-template-columns:1fr 1fr;}.task-form-grid{grid-template-columns:1fr 1fr;}.task-form-full{grid-column:span 2;}}
@media(max-width:700px){.hive-sidebar{display:none;}.hive-board{grid-template-columns:1fr;}.hive-form-grid{grid-template-columns:1fr;}.hive-modal-grid{grid-template-columns:1fr 1fr;}.hive-charts-grid{grid-template-columns:1fr;}.task-form-grid{grid-template-columns:1fr;}.task-form-full{grid-column:span 1;}}
`;

/* ─── CONSTANTS ─── */
const typeChip = { Incident:"chip-incident","Service Request":"chip-service",Task:"chip-task","Change Request":"chip-change" };
const priChip  = { Critical:"chip-critical",High:"chip-high",Medium:"chip-medium",Low:"chip-low" };
const colCfg   = { New:{dot:"#ff5c5c"},"In Progress":{dot:"#ff9f43"},Resolved:{dot:"#26d07c"},Closed:{dot:"#5b8af5"} };
const statCfg  = [
  {key:"New",label:"New",icon:"🔴",color:"#ff5c5c"},
  {key:"In Progress",label:"In Progress",icon:"🟠",color:"#ff9f43"},
  {key:"Resolved",label:"Resolved",icon:"🟢",color:"#26d07c"},
  {key:"total",label:"Total",icon:"🐝",color:"#F5A623"},
];
const STATUSES = ["New","In Progress","Resolved","Closed"];

/* ─── HELPERS ─── */
const pad = n => String(Math.floor(Math.max(0,n))).padStart(2,"0");
const formatTime = secs => `${pad(secs/3600)}h ${pad((secs%3600)/60)}m ${pad(secs%60)}s`;

/* ─── METEOR SKY ─── */
function MeteorSky() {
  const [meteors,setMeteors]=useState([]);
  const [stars,setStars]=useState([]);
  useEffect(()=>{
    setStars(Array.from({length:120},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,size:0.8+Math.random()*1.6,dur:2+Math.random()*4,delay:Math.random()*5})));
    let id=0;
    const spawn=()=>{const mid=id++;setMeteors(p=>[...p.filter(m=>m.id>mid-18),{id:mid,startX:5+Math.random()*70,dur:1.8+Math.random()*2.5,len:60+Math.random()*120}]);};
    spawn();
    const iv=setInterval(spawn,700);
    return ()=>clearInterval(iv);
  },[]);
  return (
    <div className="hive-sky">
      <div className="hive-stars">{stars.map(s=><div key={s.id} className="hive-star" style={{left:`${s.x}%`,top:`${s.y}%`,width:s.size,height:s.size,animationDuration:`${s.dur}s`,animationDelay:`${s.delay}s`}}/>)}</div>
      {meteors.map(m=><div key={m.id} className="hive-meteor" style={{left:`${m.startX}%`,height:`${m.len}px`,animationDuration:`${m.dur}s`}}/>)}
      <div className="hive-sky-grad"/>
    </div>
  );
}

/* ─── MAIL ALERT MODAL ─── */
function MailAlertModal({ alert, onSend, onDismiss }) {
  const [sending, setSending] = useState(false);
  if (!alert) return null;

  const { ticket, alertType } = alert;
  const totalSecs = ticket.slaHours * 3600;
  const elapsed   = (Date.now() - ticket.createdAt.getTime()) / 1000;
  const remSecs   = Math.max(totalSecs - elapsed, 0);
  const remPct    = Math.round((remSecs / totalSecs) * 100);
  const timeStr   = alertType === "0%" ? "EXPIRED" : formatTime(remSecs);
  const isBreach  = alertType === "0%";
  const cls       = isBreach ? "breach" : "warn";

  /* Resolve email by Ticket ID */
  const emailInfo = resolveEmail(ticket);

  const handleSend = async () => {
    setSending(true);
    try {
      await sendSLAEmail({ ticket, alertType, remPct, timeStr });
      onSend(`📧 Email sent → ${emailInfo.to} (via ${emailInfo.source})`);
    } catch (err) {
      console.error("EmailJS error:", err);
      onSend(`❌ Email failed: ${err?.text || err?.message || "Check EmailJS config"}`);
    }
    setSending(false);
  };

  return (
    <div className="mail-overlay" onClick={e=>e.target===e.currentTarget&&onDismiss()}>
      <div className={`mail-modal ${cls}`}>

        {/* Header */}
        <div className={`mail-modal-header ${cls}`}>
          <div className={`mail-hdr-icon ${cls}`}>{isBreach?"🔴":"⚠️"}</div>
          <div>
            <div className={`mail-hdr-title ${cls}`}>
              {isBreach ? "SLA Breach Alert" : "SLA Warning — 10% Remaining"}
            </div>
            <div className={`mail-hdr-sub ${cls}`}>
              {isBreach
                ? "SLA has expired — immediate escalation required"
                : `Only ${remPct}% SLA time remaining — threshold crossed`}
            </div>
          </div>
        </div>

        <div className="mail-body">
          {/* Ticket info */}
          <div className={`mail-ticket-box ${cls}`}>
            <div className={`mail-ticket-id ${cls}`}>TICKET-{String(ticket.id).padStart(6,"0")}</div>
            <div className="mail-ticket-title">{ticket.title}</div>
            <div className="mail-ticket-meta">
              <span><strong>{ticket.priority}</strong> priority</span>
              <span>•</span>
              <span>Assigned: <strong>{ticket.assignedTo}</strong></span>
              <span>•</span>
              <span>SLA: <strong>{ticket.slaHours}h</strong></span>
            </div>
          </div>

          {/* SLA warning */}
          <div className={`mail-sla-row ${cls}`}>
            <div className="mail-sla-icon">{isBreach?"🚨":"⏱️"}</div>
            <div className="mail-sla-text">
              {isBreach
                ? <><strong className="breach">SLA BREACHED — Time expired!</strong><br/>This ticket has exceeded its {ticket.slaHours}h SLA window. Immediate escalation needed.</>
                : <><strong className="warn">{remPct}% remaining ({timeStr})</strong><br/>Ticket is approaching SLA breach. Alert email will be sent to assignee and manager.</>
              }
            </div>
          </div>

          {/* Email preview */}
          <div className="mail-preview">
            <div className="mail-preview-label">📨 Email Preview</div>
            <div className="mail-row">
              <span className="mail-row-k">To:</span>
              <span className="mail-row-v email">{emailInfo.to}</span>
            </div>
            <div className="mail-row">
              <span className="mail-row-k">CC:</span>
              <span className="mail-row-v email">{emailInfo.cc}</span>
            </div>
            <div className="mail-row">
              <span className="mail-row-k">From:</span>
              <span className="mail-row-v">alerts@ticketshive.com</span>
            </div>
            <div className="mail-row">
              <span className="mail-row-k">Source:</span>
              <span className="mail-row-v" style={{color:"var(--text3)",fontSize:11}}>{emailInfo.source}</span>
            </div>
            <div className="mail-divider"/>
            <div className="mail-subject">
              {isBreach ? `🚨 SLA BREACHED: "${ticket.title}"` : `⚠️ SLA Warning: "${ticket.title}" — ${remPct}% Time Left`}
            </div>
            <div className="mail-body-text">
              Hi {ticket.assignedTo},<br/><br/>
              {isBreach
                ? `CRITICAL: Ticket "${ticket.title}" (ID: ${ticket.id}) has breached its ${ticket.slaHours}h SLA. Immediate action and escalation is required. Please update status and notify the customer.`
                : `Ticket "${ticket.title}" (ID: ${ticket.id}) has only ${timeStr} (${remPct}%) remaining before SLA breach. Please take immediate action to resolve this ticket.`
              }<br/><br/>
              Priority: {ticket.priority} | Status: {ticket.status} | Type: {ticket.type}<br/>
              — Tickets Hive Automated Alerts
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="mail-footer">
          <button className={`mail-send-btn ${cls}`} onClick={handleSend} disabled={sending}>
            {sending
              ? <><div className={`mail-spinner ${isBreach?"breach":""}`}/> Sending...</>
              : <>📧 Send Alert Email</>
            }
          </button>
          <button className="mail-dismiss-btn" onClick={onDismiss}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

/* ─── TICKET CARD ─── */
function TicketCard({ ticket, onSelect, onDelete }) {
  const totalSecs = ticket.slaHours*3600;
  const [rem,setRem] = useState(totalSecs - Math.floor((Date.now()-ticket.createdAt.getTime())/1000));
  useEffect(()=>{ const iv=setInterval(()=>setRem(p=>p-1),1000); return ()=>clearInterval(iv); },[]);
  const overdue    = rem<=0;
  const pct        = Math.max(rem,0)/totalSecs;
  const timerClass = overdue||pct<0.1?"over":pct<0.2?"warn":"ok";
  const barColor   = overdue||pct<0.1?"#ff5c5c":pct<0.2?"#ff9f43":"#26d07c";
  const hrs  = Math.floor(Math.max(rem,0)/3600);
  const mins = Math.floor((Math.max(rem,0)%3600)/60);
  const secs = Math.max(rem,0)%60;
  return (
    <div className={`hive-card${overdue?" overdue":""}`} onClick={()=>onSelect(ticket)}>
      <div className="hive-card-del" onClick={e=>{e.stopPropagation();onDelete(ticket);}}>✕</div>
      <div className="hive-card-top">
        <div className="hive-card-title">{ticket.title}</div>
        <div className="hive-card-id">#{String(ticket.id).slice(-4)}</div>
      </div>
      <div className="hive-card-tags">
        <span className={`hive-chip ${typeChip[ticket.type]||"chip-task"}`}>{ticket.type}</span>
        <span className={`hive-chip ${priChip[ticket.priority]||"chip-low"}`}>{ticket.priority}</span>
      </div>
      <div className="hive-sla-bar-wrap"><div className="hive-sla-bar" style={{width:`${Math.round(pct*100)}%`,background:barColor}}/></div>
      <div className="hive-card-footer">
        <div className="hive-mini-user">
          <div className="hive-mini-av">{ticket.assignedTo.charAt(0).toUpperCase()}</div>
          <span className="hive-mini-name">{ticket.assignedTo}</span>
        </div>
        <span className={`hive-timer ${timerClass}`}>
          {overdue?"OVERDUE":`${pad(hrs)}:${pad(mins)}:${pad(secs)}`}
        </span>
      </div>
    </div>
  );
}

/* ─── TICKET MODAL ─── */
function TicketModal({ ticket, onClose, addComment, updateStatus, onDelete }) {
  const [txt,setTxt]=useState("");
  if(!ticket) return null;
  const post=()=>{ if(!txt.trim()) return; addComment(ticket.id,{user:"CurrentUser",text:txt,time:new Date().toLocaleTimeString()}); setTxt(""); };
  return (
    <div className="hive-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="hive-modal">
        <div className="hive-modal-close" onClick={onClose}>✕</div>
        <div className="hive-modal-header">
          <div className="hive-modal-id">TICKET-{String(ticket.id).padStart(6,"0")}</div>
          <div className="hive-modal-title">{ticket.title}</div>
          <div className="hive-modal-desc">{ticket.description}</div>
        </div>
        <div className="hive-modal-actions">
          <span className="hive-modal-actions-label">Move to:</span>
          {STATUSES.map(s=><button key={s} className={`hive-modal-status-btn${ticket.status===s?" current":""}`} onClick={()=>{updateStatus(ticket.id,s);onClose();}}>{s}</button>)}
          <button className="hive-modal-del-btn" onClick={()=>{onDelete(ticket);onClose();}}>🗑 Delete</button>
        </div>
        <div className="hive-modal-grid">
          {[["Type",ticket.type],["Status",ticket.status],["Priority",ticket.priority],["Assigned To",ticket.assignedTo],["Created By",ticket.createdBy],["SLA",`${ticket.slaHours}h`]]
            .map(([l,v])=><div className="hive-mfield" key={l}><div className="hive-mfield-label">{l}</div><div className="hive-mfield-val">{v}</div></div>)}
        </div>
        <div className="hive-divider"/>
        <div className="hive-sec-label">Comments ({ticket.comments.length})</div>
        {ticket.comments.length===0
          ? <div className="hive-no-comments">No comments yet — be the first!</div>
          : ticket.comments.map((c,i)=><div className="hive-comment" key={i}><div className="hive-comment-who">{c.user}</div><div className="hive-comment-text">{c.text}</div><div className="hive-comment-time">{c.time}</div></div>)}
        <div className="hive-comment-row">
          <input className="hive-comment-input" value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Write a comment…" onKeyDown={e=>e.key==="Enter"&&post()}/>
          <button className="hive-btn-honey" onClick={post}>Post</button>
        </div>
        <button className="hive-btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* ─── CREATE TICKET FORM ─── */
function CreateForm({ addTicket, onCancel }) {
  const [f,setF]=useState({title:"",type:"Incident",priority:"Medium",assignedTo:"",sla:4,description:""});
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const submit=e=>{ e.preventDefault(); addTicket({id:Date.now(),title:f.title,type:f.type,priority:f.priority,assignedTo:f.assignedTo||"Unassigned",createdBy:"CurrentUser",slaHours:parseFloat(f.sla)||4,status:"New",createdAt:new Date(),description:f.description,comments:[],alertSent10:false,alertSent0:false}); onCancel(); };
  return (
    <div className="hive-form-wrap">
      <div className="hive-form-header"><div className="hive-form-title">🐝 New Ticket</div><button className="hive-form-cancel" onClick={onCancel}>✕ Cancel</button></div>
      <form onSubmit={submit}>
        <div className="hive-form-grid">
          <div className="hive-fg" style={{gridColumn:"span 2"}}><label className="hive-flabel">Title *</label><input className="hive-finput" value={f.title} onChange={set("title")} placeholder="Brief description of the issue" required/></div>
          <div className="hive-fg"><label className="hive-flabel">Type</label><select className="hive-finput" value={f.type} onChange={set("type")}><option>Incident</option><option>Service Request</option><option>Task</option><option>Change Request</option></select></div>
          <div className="hive-fg"><label className="hive-flabel">Priority</label><select className="hive-finput" value={f.priority} onChange={set("priority")}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
          <div className="hive-fg"><label className="hive-flabel">Assigned To</label><input className="hive-finput" value={f.assignedTo} onChange={set("assignedTo")} placeholder="Agent name"/></div>
          <div className="hive-fg"><label className="hive-flabel">SLA (hours)</label><input className="hive-finput" type="number" min="0.5" step="0.5" value={f.sla} onChange={set("sla")}/></div>
        </div>
        <div className="hive-fg"><label className="hive-flabel">Description *</label><textarea className="hive-ftextarea" value={f.description} onChange={set("description")} placeholder="Full details…" required/></div>
        <div className="hive-form-btns"><button className="hive-btn-honey" type="submit">Create Ticket →</button><button type="button" className="hive-btn-ghost" style={{marginTop:0}} onClick={onCancel}>Cancel</button></div>
      </form>
    </div>
  );
}

/* ─── TASKS TAB ─── */
function TasksTab({ tasks, setTasks, tickets, showToast }) {
  const [showForm,setShowForm]=useState(false);
  const [f,setF]=useState({title:"",priority:"Medium",assignedTo:"",dueDate:"",linkedTicket:"",notes:""});
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const submit=e=>{ e.preventDefault(); setTasks(p=>[...p,{id:Date.now(),title:f.title,priority:f.priority,assignedTo:f.assignedTo||"Unassigned",dueDate:f.dueDate,linkedTicket:f.linkedTicket?parseInt(f.linkedTicket):null,notes:f.notes,status:"Todo"}]); setF({title:"",priority:"Medium",assignedTo:"",dueDate:"",linkedTicket:"",notes:""}); setShowForm(false); showToast("✅ Task created!","success"); };
  const toggleDone=id=>setTasks(p=>p.map(t=>t.id===id?{...t,status:t.status==="Done"?"Todo":"Done"}:t));
  const deleteTask=id=>{ setTasks(p=>p.filter(t=>t.id!==id)); showToast("🗑️ Task deleted","info"); };
  const moveTask=(id,status)=>{ setTasks(p=>p.map(t=>t.id===id?{...t,status}:t)); showToast(`🔄 Task → ${status}`,"info"); };
  const today=new Date().toISOString().split("T")[0];
  const todo=tasks.filter(t=>t.status!=="Done");
  const done=tasks.filter(t=>t.status==="Done");
  const renderTask=task=>{
    const isDone=task.status==="Done";
    const isOverdue=task.dueDate&&task.dueDate<today&&!isDone;
    const linked=task.linkedTicket?tickets.find(t=>t.id===task.linkedTicket):null;
    return (
      <div key={task.id} className={`task-card${isDone?" done":""}`}>
        <div className="task-card-top">
          <div className={`task-check${isDone?" checked":""}`} onClick={()=>toggleDone(task.id)}>{isDone&&<span className="task-check-icon">✓</span>}</div>
          <div className="task-body">
            <div className={`task-title${isDone?" done":""}`}>{task.title}</div>
            <div className="task-meta">
              <span className={`hive-chip ${priChip[task.priority]||"chip-low"}`}>{task.priority}</span>
              {task.dueDate&&<span className={`task-due${isOverdue?" overdue-due":""}`}>📅 {isOverdue?"⚠ ":""}{task.dueDate}</span>}
              {task.assignedTo&&<span style={{fontSize:11,color:"var(--text2)"}}>👤 {task.assignedTo}</span>}
              {linked&&<span className="task-linked">🎫 #{String(linked.id).slice(-4)} {linked.title}</span>}
            </div>
            {task.notes&&<div className="task-notes">{task.notes}</div>}
          </div>
          <div className="task-actions">
            {!isDone&&task.status==="Todo"&&<button className="task-action-btn" onClick={()=>moveTask(task.id,"In Progress")}>▶ Start</button>}
            {!isDone&&task.status==="In Progress"&&<button className="task-action-btn" onClick={()=>moveTask(task.id,"Done")}>✓ Done</button>}
            {isDone&&<button className="task-action-btn" onClick={()=>moveTask(task.id,"Todo")}>↩ Reopen</button>}
            <button className="task-action-btn del" onClick={()=>deleteTask(task.id)}>✕</button>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div>
      <div className="task-stats-row">
        {[{l:"Total",v:tasks.length},{l:"Pending",v:todo.length},{l:"Completed",v:done.length},{l:"Overdue",v:tasks.filter(t=>t.dueDate&&t.dueDate<today&&t.status!=="Done").length}]
          .map(({l,v})=><div key={l} className="task-stat-pill"><strong>{v}</strong>{l}</div>)}
      </div>
      <div className="task-header"><div/><button className="hive-new-btn" onClick={()=>setShowForm(v=>!v)}>{showForm?"✕ Cancel":"＋ New Task"}</button></div>
      {showForm&&(
        <div className="task-form-wrap">
          <div className="task-form-title">📋 New Task</div>
          <form onSubmit={submit}>
            <div className="task-form-grid">
              <div className="hive-fg task-form-full"><label className="hive-flabel">Title *</label><input className="hive-finput" value={f.title} onChange={set("title")} placeholder="Task title" required/></div>
              <div className="hive-fg"><label className="hive-flabel">Priority</label><select className="hive-finput" value={f.priority} onChange={set("priority")}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
              <div className="hive-fg"><label className="hive-flabel">Assigned To</label><input className="hive-finput" value={f.assignedTo} onChange={set("assignedTo")} placeholder="Agent name"/></div>
              <div className="hive-fg"><label className="hive-flabel">Due Date</label><input className="hive-finput" type="date" value={f.dueDate} onChange={set("dueDate")}/></div>
              <div className="hive-fg task-form-full"><label className="hive-flabel">Link to Ticket (optional)</label>
                <select className="hive-finput" value={f.linkedTicket} onChange={set("linkedTicket")}>
                  <option value="">— No ticket —</option>
                  {tickets.filter(t=>t.status!=="Closed").map(t=><option key={t.id} value={t.id}>#{String(t.id).slice(-4)} {t.title}</option>)}
                </select></div>
              <div className="hive-fg task-form-full"><label className="hive-flabel">Notes</label><input className="hive-finput" value={f.notes} onChange={set("notes")} placeholder="Optional notes…"/></div>
            </div>
            <div className="hive-form-btns"><button className="hive-btn-honey" type="submit">Create Task →</button><button type="button" className="hive-btn-ghost" style={{marginTop:0}} onClick={()=>setShowForm(false)}>Cancel</button></div>
          </form>
        </div>
      )}
      {todo.length>0&&<><div className="task-section-label">Active ({todo.length})</div><div className="task-grid">{todo.map(renderTask)}</div></>}
      {done.length>0&&<><div className="task-section-label" style={{marginTop:24}}>Completed ({done.length})</div><div className="task-grid">{done.map(renderTask)}</div></>}
      {tasks.length===0&&<div className="hive-empty" style={{marginTop:20}}><div className="hive-empty-icon">📋</div><div>No tasks yet — create one!</div></div>}
    </div>
  );
}

/* ─── CHARTS ─── */
const CHART_COLORS=["#ff5c5c","#ff9f43","#26d07c","#5b8af5"];
function Charts({ tickets }) {
  const pieData=STATUSES.map(s=>({name:s,value:tickets.filter(t=>t.status===s).length}));
  const barData=["Incident","Service Request","Task","Change Request"].map(t=>({type:t.replace(" Request"," Req."),count:tickets.filter(x=>x.type===t).length}));
  const Tip=({active,payload,label})=>{ if(!active||!payload?.length) return null; return <div style={{background:"#1a1f2b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#f0f2f5"}}>{label&&<div style={{marginBottom:4,color:"#8891a4"}}>{label}</div>}{payload.map(p=><div key={p.name}><span style={{color:p.color}}>{p.name||"Count"}: </span>{p.value}</div>)}</div>; };
  return (
    <div className="hive-charts-grid">
      <div className="hive-chart-card"><div className="hive-chart-title">By Status</div><div className="hive-chart-sub">Distribution across workflow stages</div>
        <PieChart width={260} height={240}><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={48}>{pieData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i]}/>)}</Pie><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11,color:"#8891a4"}}/></PieChart>
      </div>
      <div className="hive-chart-card"><div className="hive-chart-title">By Type</div><div className="hive-chart-sub">Tickets grouped by category</div>
        <ResponsiveContainer width="100%" height={240}><BarChart data={barData} margin={{top:8,right:8,left:-20,bottom:0}}><XAxis dataKey="type" tick={{fill:"#525c6e",fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#525c6e",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip content={<Tip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/><Bar dataKey="count" name="Count" fill="#F5A623" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── CONFIRM ─── */
function ConfirmDialog({ title, sub, onConfirm, onCancel }) {
  return (
    <div className="hive-confirm-overlay" onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div className="hive-confirm-box">
        <div className="hive-confirm-icon">🗑️</div>
        <div className="hive-confirm-title">{title}</div>
        <div className="hive-confirm-sub">{sub}</div>
        <div className="hive-confirm-btns"><button className="hive-confirm-cancel" onClick={onCancel}>Cancel</button><button className="hive-confirm-del" onClick={onConfirm}>Delete</button></div>
      </div>
    </div>
  );
}

/* ─── MAIN APP ─── */
export default function App() {
  const [tickets,   setTickets]  = useState(initialTickets);
  const [tasks,     setTasks]    = useState(initialTasks);
  const [selected,  setSelected] = useState(null);
  const [tab,       setTab]      = useState("Tickets");
  const [search,    setSearch]   = useState("");
  const [filters,   setFilters]  = useState({status:"",type:"",priority:""});
  const [toDelete,  setToDelete] = useState(null);
  const [mailAlert, setMailAlert]= useState(null);  // { ticket, alertType: "10%" | "0%" }
  const [toast,     setToast]    = useState({msg:"",type:"info"});
  const alertedRef = useRef(new Set());

  /* Initialize EmailJS once */
  useEffect(()=>{ emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY); },[]);

  const showToast = (msg, type="info") => { setToast({msg,type}); setTimeout(()=>setToast({msg:"",type:"info"}),3000); };

  /* ── SLA WATCHER — checks every 3 seconds ── */
  useEffect(()=>{
    const iv = setInterval(()=>{
      setTickets(prev=>{
        let changed=false;
        const next=prev.map(t=>{
          if(t.status==="Resolved"||t.status==="Closed") return t;
          const totalSecs=t.slaHours*3600;
          const elapsed=(Date.now()-t.createdAt.getTime())/1000;
          const remPct=(totalSecs-elapsed)/totalSecs;

          // 10% warning — fire once
          if(remPct<=0.10 && remPct>0 && !t.alertSent10 && !alertedRef.current.has(`${t.id}-10`)){
            alertedRef.current.add(`${t.id}-10`);
            setMailAlert({ticket:t, alertType:"10%"});
            changed=true;
            return {...t, alertSent10:true};
          }
          // 0% breach — fire once
          if(remPct<=0 && !t.alertSent0 && !alertedRef.current.has(`${t.id}-0`)){
            alertedRef.current.add(`${t.id}-0`);
            setMailAlert({ticket:t, alertType:"0%"});
            changed=true;
            return {...t, alertSent0:true};
          }
          return t;
        });
        return changed?next:prev;
      });
    },3000);
    return ()=>clearInterval(iv);
  },[]);

  const addComment  = (id,c)=>setTickets(p=>p.map(t=>t.id===id?{...t,comments:[...t.comments,c]}:t));
  const addTicket   = t=>{ setTickets(p=>[...p,t]); showToast("✅ Ticket created!","success"); };
  const updateStatus= (id,status)=>{ setTickets(p=>p.map(t=>t.id===id?{...t,status}:t)); setSelected(p=>p&&p.id===id?{...p,status}:p); showToast(`🔄 Moved to "${status}"`,"info"); };
  const confirmDelete=ticket=>setToDelete(ticket);
  const doDelete=()=>{ if(!toDelete) return; setTickets(p=>p.filter(t=>t.id!==toDelete.id)); if(selected?.id===toDelete.id) setSelected(null); showToast("🗑️ Ticket deleted","info"); setToDelete(null); };

  const filtered=tickets.filter(t=>
    (!filters.status||t.status===filters.status)&&
    (!filters.type||t.type===filters.type)&&
    (!filters.priority||t.priority===filters.priority)&&
    (!search||t.title.toLowerCase().includes(search.toLowerCase())||t.assignedTo.toLowerCase().includes(search.toLowerCase()))
  );

  const handleStatClick=key=>{ setFilters(p=>({...p,status:key==="total"?"":p.status===key?"":key})); setTab("Tickets"); };
  const activeStatColor=statCfg.find(s=>s.key===filters.status)?.color;
  const pendingTasks=tasks.filter(t=>t.status!=="Done").length;
  const slaAlertCount=tickets.filter(t=>{ if(t.status==="Resolved"||t.status==="Closed") return false; const pct=(t.slaHours*3600-(Date.now()-t.createdAt.getTime())/1000)/(t.slaHours*3600); return pct<=0.1; }).length;

  const navItems=[
    {label:"Tickets",icon:"🎫"},
    {label:"Tasks",icon:"📋",badge:pendingTasks||null},
    {label:"Create Ticket",icon:"➕"},
    {label:"Charts",icon:"📊"},
  ];

  return (
    <>
      <style>{css}</style>
      <div className="hive-app">
        <MeteorSky/>
        <div className="hive-layout">

          {/* SIDEBAR */}
          <aside className="hive-sidebar">
            <div className="hive-brand"><BeeLogo size={40}/><div><div className="hive-brand-title">Tickets Hive</div><div className="hive-brand-sub">Support Desk</div></div></div>
            <nav className="hive-nav">
              {navItems.map(({label,icon,badge})=>(
                <button key={label} className={`hive-nav-item${tab===label?" active":""}`} onClick={()=>setTab(label)}>
                  <span className="hive-nav-icon">{icon}</span>{label}
                  {badge>0&&<span className="hive-nav-badge">{badge}</span>}
                </button>
              ))}
              {slaAlertCount>0&&<div style={{margin:"8px 12px 0",fontSize:11,color:"var(--red)",display:"flex",alignItems:"center",gap:6}}><span className="sla-dot"/>{slaAlertCount} SLA alert{slaAlertCount>1?"s":""}</div>}
            </nav>
            <div className="hive-sidebar-footer"><div className="hive-user"><div className="hive-user-av">CU</div><div><div className="hive-user-name">CurrentUser</div><div className="hive-user-role">Support Agent</div></div></div></div>
          </aside>

          {/* MAIN */}
          <main className="hive-main">
            <div className="hive-page-header">
              <div>
                <div className="hive-page-title">{tab==="Tickets"&&"All Tickets"}{tab==="Tasks"&&"Tasks"}{tab==="Create Ticket"&&"New Ticket"}{tab==="Charts"&&"Analytics"}</div>
                <div className="hive-page-sub">{tab==="Tickets"&&`${filtered.length} ticket${filtered.length!==1?"s":""} found`}{tab==="Tasks"&&`${tasks.length} total · ${pendingTasks} pending`}{tab==="Create Ticket"&&"Fill in the details below"}{tab==="Charts"&&"Visual overview of your queue"}</div>
              </div>
              {tab!=="Create Ticket"&&tab!=="Tasks"&&<button className="hive-new-btn" onClick={()=>setTab("Create Ticket")}>＋ New Ticket</button>}
            </div>

            {/* STAT CARDS */}
            <div className="hive-stats">
              {statCfg.map(({key,label,icon,color})=>{
                const count=key==="total"?tickets.length:tickets.filter(t=>t.status===key).length;
                const isActive=key==="total"?!filters.status:filters.status===key;
                return (
                  <div key={key} className={`hive-stat${isActive?" active-stat":""}`}
                    style={{borderColor:isActive?color:undefined,borderWidth:isActive?"1.5px":undefined}}
                    onClick={()=>handleStatClick(key)}>
                    <div className="hive-stat-accent" style={{background:color}}/>
                    <div className="hive-stat-top"><div className="hive-stat-label">{label}</div><div className="hive-stat-icon">{icon}</div></div>
                    <div className="hive-stat-num" style={{color}}>{count}</div>
                    <div className="hive-stat-hint" style={{color:isActive?color:undefined}}>{isActive?"✓ Active filter":"Click to filter"}</div>
                    {isActive&&<div className="hive-stat-active-bar" style={{background:color}}/>}
                  </div>
                );
              })}
            </div>

            {/* TICKETS */}
            {tab==="Tickets"&&(
              <>
                {filters.status&&<div className="hive-active-filter" style={{background:`${activeStatColor}15`,borderColor:`${activeStatColor}40`,color:activeStatColor}}><span>Showing: {filters.status}</span><span className="hive-active-filter-x" onClick={()=>setFilters(p=>({...p,status:""}))}>✕</span></div>}
                <div className="hive-filterbar">
                  <div className="hive-search-wrap"><span className="hive-search-icon">🔍</span><input className="hive-search" placeholder="Search tickets or assignee…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
                  {[{k:"status",opts:[["","All Status"],["New","New"],["In Progress","In Progress"],["Resolved","Resolved"],["Closed","Closed"]]},{k:"type",opts:[["","All Types"],["Incident","Incident"],["Service Request","Service Request"],["Task","Task"],["Change Request","Change Request"]]},{k:"priority",opts:[["","All Priority"],["Critical","Critical"],["High","High"],["Medium","Medium"],["Low","Low"]]}]
                    .map(({k,opts})=><select key={k} className="hive-fsel" value={filters[k]} onChange={e=>setFilters(p=>({...p,[k]:e.target.value}))}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>)}
                </div>
                <div className="hive-board">
                  {STATUSES.map(status=>{ const cfg=colCfg[status]; const cols=filtered.filter(t=>t.status===status); return (
                    <div key={status} className="hive-col">
                      <div className="hive-col-head"><div className="hive-col-left"><div className="hive-col-dot" style={{background:cfg.dot}}/><span className="hive-col-name">{status}</span></div><span className="hive-col-count">{cols.length}</span></div>
                      {cols.map(t=><TicketCard key={t.id} ticket={t} onSelect={setSelected} onDelete={confirmDelete}/>)}
                      {cols.length===0&&<div className="hive-empty"><div className="hive-empty-icon">📭</div><div>No tickets here</div></div>}
                    </div>
                  );})}
                </div>
              </>
            )}

            {tab==="Tasks"&&<TasksTab tasks={tasks} setTasks={setTasks} tickets={tickets} showToast={showToast}/>}
            {tab==="Create Ticket"&&<CreateForm addTicket={addTicket} onCancel={()=>setTab("Tickets")}/>}
            {tab==="Charts"&&<Charts tickets={tickets}/>}
          </main>
        </div>

        {selected&&<TicketModal ticket={tickets.find(t=>t.id===selected.id)||selected} onClose={()=>setSelected(null)} addComment={addComment} updateStatus={updateStatus} onDelete={t=>{confirmDelete(t);setSelected(null);}}/>}
        {toDelete&&<ConfirmDialog title="Delete this ticket?" sub={`"${toDelete.title}" will be permanently removed.`} onConfirm={doDelete} onCancel={()=>setToDelete(null)}/>}

        {/* REAL MAIL ALERT */}
        {mailAlert&&(
          <MailAlertModal
            alert={mailAlert}
            onSend={msg=>{ showToast(msg, msg.startsWith("❌")?"error":"success"); setMailAlert(null); }}
            onDismiss={()=>setMailAlert(null)}
          />
        )}

        {toast.msg&&<div className={`hive-toast ${toast.type}`}>{toast.msg}</div>}
      </div>
    </>
  );
}