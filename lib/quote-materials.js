// generated_quotes.tool_call_log already holds the identify_materials tool's
// structured result ({ name, quantity, notes, confidence } per material) for
// every quote — reused here instead of parsing the drafted prose in
// generated_quotes.content or running a second sub-LLM extraction, since
// the structured data is already sitting there, already correct.
export function extractMaterialsFromToolCallLog(toolCallLog) {
  if (!Array.isArray(toolCallLog)) return []

  for (const entry of toolCallLog) {
    if (entry?.type === 'tool_result' && entry?.tool === 'identify_materials' && Array.isArray(entry?.result?.materials)) {
      return entry.result.materials
    }
  }

  return []
}
