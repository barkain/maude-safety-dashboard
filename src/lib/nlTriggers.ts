/**
 * Shared NL detection constants — used by both the search API route and the
 * HomeSearch client component so that client and server always agree on whether
 * a query needs LLM intent parsing.
 */

/**
 * Phrases that imply the user wants structured filters (risk tier, death flag,
 * sort order, geography, etc.) — things a pure keyword search can't handle.
 * Keep this list tight; false-positives send simple queries through the LLM path.
 */
export const NL_TRIGGERS: readonly string[] = [
  'high risk', 'low risk', 'medium risk', 'high-risk',
  'with death', 'with recall', 'with injur', 'with malfunction',
  'recalled',
  'sort by', 'ranked', 'most dangerous', 'worst', 'highest risk',
  'compare', ' vs ', ' versus ',
]

/**
 * Question-word patterns that signal free-form natural language.
 * Deliberately excludes "show", "find", "list" — these are common keyword-search
 * verbs that don't imply structured filtering.
 */
export const QUESTION_RE = /^(what|which|how many|are there|give me)\b/i

export function needsLLM(query: string): boolean {
  const q = query.toLowerCase()
  if (NL_TRIGGERS.some((t) => q.includes(t))) return true
  if (QUESTION_RE.test(q.trim())) return true
  return false
}
