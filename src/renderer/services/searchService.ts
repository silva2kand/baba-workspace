import { useAppStore } from '../stores/appStore';

export interface SearchResult {
  type: 'task' | 'email' | 'case' | 'wiki' | 'brain' | 'chat' | 'approval';
  id: string;
  title: string;
  description: string;
  relevance: number;
  metadata?: any;
}

/**
 * Cross-entity search across all app data
 */
export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const lowercaseQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search tasks
  const tasks = useAppStore.getState().tasks;
  for (const task of tasks) {
    if (
      task.title?.toLowerCase().includes(lowercaseQuery) ||
      task.description?.toLowerCase().includes(lowercaseQuery)
    ) {
      results.push({
        type: 'task',
        id: task.id,
        title: task.title,
        description: task.description || 'No description',
        relevance: calculateRelevance([task.title, task.description], lowercaseQuery),
        metadata: { status: task.status, agentId: task.agentId },
      });
    }
  }

  // Search emails
  const emails = useAppStore.getState().emails;
  for (const email of emails) {
    if (
      email.subject?.toLowerCase().includes(lowercaseQuery) ||
      email.from?.toLowerCase().includes(lowercaseQuery) ||
      email.preview?.toLowerCase().includes(lowercaseQuery)
    ) {
      results.push({
        type: 'email',
        id: email.id,
        title: email.subject,
        description: `From: ${email.from} | ${email.preview}`,
        relevance: calculateRelevance([email.subject, email.from, email.preview], lowercaseQuery),
        metadata: { category: email.category, priority: email.priority, date: email.date },
      });
    }
  }

  // Search cases
  try {
    const cases = await window.babaAPI?.storeFieldGet?.('cases');
    if (Array.isArray(cases)) {
      for (const caseItem of cases) {
        if (
          caseItem.title?.toLowerCase().includes(lowercaseQuery) ||
          caseItem.description?.toLowerCase().includes(lowercaseQuery)
        ) {
          results.push({
            type: 'case',
            id: caseItem.id,
            title: caseItem.title,
            description: caseItem.description || 'No description',
            relevance: calculateRelevance([caseItem.title, caseItem.description], lowercaseQuery),
            metadata: { domain: caseItem.domain, risk: caseItem.risk, status: caseItem.status },
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to search cases:', err);
  }

  // Search wiki entries
  const wikiEntries = useAppStore.getState().wikiEntries;
  for (const entry of wikiEntries) {
    if (
      entry.title?.toLowerCase().includes(lowercaseQuery) ||
      entry.content?.toLowerCase().includes(lowercaseQuery) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    ) {
      results.push({
        type: 'wiki',
        id: entry.id,
        title: entry.title,
        description: entry.content.substring(0, 150) + '...',
        relevance: calculateRelevance([entry.title, entry.content, ...(entry.tags || [])], lowercaseQuery),
        metadata: { category: entry.category, tags: entry.tags },
      });
    }
  }

  // Search Brain Index
  try {
    const brainResults = await window.babaAPI?.brainSearch?.(query);
    if (Array.isArray(brainResults)) {
      for (const brain of brainResults) {
        results.push({
          type: 'brain',
          id: brain.id || `brain-${Date.now()}`,
          title: brain.title || 'Brain Entry',
          description: brain.content?.substring(0, 150) || '',
          relevance: brain.relevance || 0.5,
          metadata: { category: brain.category, source: brain.source },
        });
      }
    }
  } catch (err) {
    console.error('Failed to search brain:', err);
  }

  // Search chat threads
  const chats = useAppStore.getState().activeChats;
  for (const chat of chats) {
    if (
      chat.title?.toLowerCase().includes(lowercaseQuery) ||
      chat.messages?.some(msg => msg.content?.toLowerCase().includes(lowercaseQuery))
    ) {
      results.push({
        type: 'chat',
        id: chat.id,
        title: chat.title,
        description: `${chat.messages?.length || 0} messages`,
        relevance: calculateRelevance([chat.title, ...(chat.messages?.map(m => m.content) || [])], lowercaseQuery),
        metadata: { model: chat.model, agent: chat.agent, messageCount: chat.messages?.length },
      });
    }
  }

  // Search approvals
  const approvals = useAppStore.getState().approvals;
  for (const approval of approvals) {
    if (
      approval.title?.toLowerCase().includes(lowercaseQuery) ||
      approval.description?.toLowerCase().includes(lowercaseQuery)
    ) {
      results.push({
        type: 'approval',
        id: approval.id,
        title: approval.title,
        description: approval.description,
        relevance: calculateRelevance([approval.title, approval.description], lowercaseQuery),
        metadata: { type: approval.type, preparedBy: approval.preparedBy, status: approval.status },
      });
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  return results;
}

/**
 * Calculate relevance score (0-1) based on query match
 */
function calculateRelevance(fields: (string | undefined)[], query: string): number {
  let maxScore = 0;

  for (const field of fields) {
    if (!field) continue;

    const lowercaseField = field.toLowerCase();
    let score = 0;

    // Exact match gets highest score
    if (lowercaseField === query) {
      score = 1.0;
    }
    // Starts with query gets high score
    else if (lowercaseField.startsWith(query)) {
      score = 0.9;
    }
    // Contains query gets medium score
    else if (lowercaseField.includes(query)) {
      score = 0.7;
    }
    // Word boundary match gets good score
    else {
      const words = lowercaseField.split(/\s+/);
      if (words.some(word => word.startsWith(query))) {
        score = 0.8;
      }
    }

    maxScore = Math.max(maxScore, score);
  }

  return maxScore;
}
