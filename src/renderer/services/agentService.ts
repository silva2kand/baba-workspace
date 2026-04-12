export const AGENTS = [
  {
    id: "legal",
    icon: "⚖",
    name: "Legal Agent",
    tasks: [
      "Find all unresolved legal issues",
      "Scan contract deadlines",
      "Draft letter to council",
      "Draft formal demand to debtor",
      "Flag high-risk items"
    ],
    role: "Scan all data for legal risks, disputes, contract issues, council notices, deadlines."
  },
  {
    id: "acct",
    icon: "📊",
    name: "Accounting Agent",
    tasks: [
      "Build renewal calendar (90 days)",
      "Flag overdue invoices",
      "Cashflow summary",
      "VAT deadline check",
      "Draft invoice chaser"
    ],
    role: "Analyse bills, invoices, cashflow, renewals. Flag overdue. Track VAT."
  },
  {
    id: "supplier",
    icon: "🏭",
    name: "Supplier Agent",
    tasks: [
      "Cluster suppliers by spend",
      "Find renegotiation targets",
      "Draft renegotiation email",
      "Find missing rebates"
    ],
    role: "Analyse supplier spend, terms, pricing. Find renegotiation opportunities."
  },
  {
    id: "deals",
    icon: "🏠",
    name: "Deal & Property Agent",
    tasks: [
      "Find empty/closing premises",
      "Scan auction listings",
      "Subletting potential",
      "Liquidation stock scan"
    ],
    role: "Scout deal opportunities: empty premises, auctions, subletting, liquidation."
  },
  {
    id: "content",
    icon: "📝",
    name: "Content Agent",
    tasks: [
      "Generate 10 content ideas",
      "Draft social media post",
      "Build 30-day calendar",
      "Write product description"
    ],
    role: "Generate content ideas, draft posts, campaigns grounded in real business data."
  },
  {
    id: "comms",
    icon: "💬",
    name: "Comms Agent",
    tasks: [
      "Find unanswered messages (7d+)",
      "Summarise WhatsApp conversations",
      "Draft follow-up email",
      "Build contact map"
    ],
    role: "Analyse email and WhatsApp threads. Find unanswered messages. Draft follow-ups."
  },
  {
    id: "pa",
    icon: "📋",
    name: "PA & Admin Agent",
    tasks: [
      "List upcoming renewals (90 days)",
      "Council correspondence summary",
      "Insurance review dates",
      "Vehicle MOT reminders"
    ],
    role: "Track admin: bills, insurance, council, vehicles, licences. Surface renewals."
  },
  {
    id: "money",
    icon: "💰",
    name: "Money Engine",
    tasks: [
      "Full money analysis",
      "Find all savings opportunities",
      "Property cashflow",
      "Online income ideas"
    ],
    role: "Full money analysis: savings, cashflow, property, online income opportunities."
  }
];

export const AGENT_SYSTEM = `You are {name}, a specialist business intelligence agent inside Baba Desktop.
Role: {role}
Brain Index has {total} indexed items.
RULES:
- Never send messages without approval
- Never move money
- Never sign documents
- Always end with "Awaiting your approval before any action"
Format: Findings / Risks / Opportunities / Recommended Actions (all marked requires approval)`;

export async function runAgent(agentId, task, brainStats, provider, model, callAiFn) {
  const info = AGENTS.find(a => a.id === agentId) || { name: agentId, id: agentId };
  const role = AGENTS.find(a => a.id === agentId)?.role || "General business analysis";
  
  const sys_p = AGENT_SYSTEM
    .replace("{name}", info.name)
    .replace("{role}", role)
    .replace("{total}", brainStats?.total || 0);

  const msgs = [{
    role: "user",
    content: `Task: ${task}\nBrain stats: ${JSON.stringify(brainStats)}`
  }];

  return await callAiFn(provider, model, msgs, sys_p, 3000);
}