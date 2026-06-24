import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runAgent({
  systemPrompt,
  tools,
  executeTool,
  initialMessage,
  maxTurns = 15,
  onStep,
}) {
  const messages = [{ role: 'user', content: initialMessage }]

  for (let turn = 0; turn < maxTurns; turn++) {
    onStep({ type: 'turn_start', turn: turn + 1 })

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    })

    if (response.stop_reason === 'tool_use') {
      const toolBlocks = response.content.filter((b) => b.type === 'tool_use')

      const toolResults = []
      for (const toolBlock of toolBlocks) {
        onStep({ type: 'tool_call', tool: toolBlock.name, input: toolBlock.input })
        const result = await executeTool(toolBlock.name, toolBlock.input)
        onStep({ type: 'tool_result', tool: toolBlock.name, result })
        toolResults.push({ tool_use_id: toolBlock.id, result })
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({
        role: 'user',
        content: toolResults.map(({ tool_use_id, result }) => ({
          type: 'tool_result',
          tool_use_id,
          content: JSON.stringify(result),
        })),
      })
    } else {
      const text = response.content.find((b) => b.type === 'text')?.text ?? ''
      onStep({ type: 'final_answer', text })
      return { answer: text, turns: turn + 1, messages }
    }
  }

  throw new Error(`Agent exceeded max turns (${maxTurns})`)
}
