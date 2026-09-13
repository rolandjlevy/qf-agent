// generated_quotes.tool_call_log already holds the identify_materials tool's
// structured result ({ name, quantity, notes, confidence } per material) for
// every quote — reused here instead of parsing the drafted prose in
// generated_quotes.content or running a second sub-LLM extraction, since
// the structured data is already sitting there, already correct.
//
// identify_materials can legitimately be called more than once in a run (its
// own tool description allows re-calling it with an updated job_description
// after an ask_user answer), and tools/identify-materials.js's
// `toolContext.materials = materials` is last-write-wins — draft_section and
// save_quote both end up using the LAST call's list. Returning the first
// match here would show the trader a materials list that no longer matches
// what was actually drafted and saved, so this scans in reverse instead.
export function extractMaterialsFromToolCallLog(toolCallLog) {
  if (!Array.isArray(toolCallLog)) return []

  for (let i = toolCallLog.length - 1; i >= 0; i--) {
    const entry = toolCallLog[i]
    if (entry?.type === 'tool_result' && entry?.tool === 'identify_materials' && Array.isArray(entry?.result?.materials)) {
      return entry.result.materials
    }
  }

  return []
}
