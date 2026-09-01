import { createClient, createMessage, getModel } from './lib/anthropic-client.js';

// Run an agent with the given system prompt, tools, and initial message. The agent will continue to run until it produces a final answer or exceeds the maximum number of turns.
export async function runAgent({
  systemPrompt,
  tools,
  executeTool,
  initialMessage,
  maxTurns = 15,
  onStep,
  toolContext = {},
}) {
  const anthropic = createClient();
  const messages = [{ role: 'user', content: initialMessage }];

  // A formatting/display bug in onStep must never abort the agent loop mid-turn
  function safeOnStep(step) {
    try {
      onStep(step);
    } catch (err) {
      console.error('onStep handler failed:', err.message);
    }
  }

  // Run the agent for a maximum number of turns
  for (let turn = 0; turn < maxTurns; turn++) {
    safeOnStep({ type: 'turn_start', turn: turn + 1 });
    safeOnStep({ type: 'api_start' });
    const response = await createMessage(anthropic, {
      model: getModel(),
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });
    safeOnStep({ type: 'api_end' });

    if (response.stop_reason === 'tool_use') {
      const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

      const toolResults = [];
      for (const toolBlock of toolBlocks) {
        safeOnStep({
          type: 'tool_call',
          tool: toolBlock.name,
          input: toolBlock.input,
        });
        const result = await executeTool(toolBlock.name, toolBlock.input, toolContext);
        safeOnStep({ type: 'tool_result', tool: toolBlock.name, result });
        toolResults.push({ tool_use_id: toolBlock.id, result });
      }

      // Add the tool results to the messages and continue to the next turn
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: toolResults.map(({ tool_use_id, result }) => ({
          type: 'tool_result',
          tool_use_id,
          content: JSON.stringify(result),
        })),
      });
    } else {
      const text = response.content.find((b) => b.type === 'text')?.text ?? '';
      safeOnStep({ type: 'final_answer', text });
      return { answer: text, turns: turn + 1, messages };
    }
  }

  throw new Error(`Agent exceeded max turns (${maxTurns})`);
}
