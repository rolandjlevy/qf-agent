import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./lib/anthropic-client.js', () => ({
  createClient: vi.fn(() => ({})),
  createMessage: vi.fn(),
  getModel: vi.fn(() => 'test-model'),
}));

const { createMessage } = await import('./lib/anthropic-client.js');
const { runAgent } = await import('./agent.js');

function toolUseResponse(blocks) {
  return {
    stop_reason: 'tool_use',
    content: blocks.map((b) => ({ type: 'tool_use', id: b.id ?? `id-${b.name}`, name: b.name, input: b.input ?? {} })),
  };
}

function finalResponse(text) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text }] };
}

beforeEach(() => {
  createMessage.mockReset();
});

describe('runAgent', () => {
  it('AC1.1 executes a single tool call and continues the loop', async () => {
    createMessage
      .mockResolvedValueOnce(toolUseResponse([{ name: 'lookup_price', input: { material_name: 'pipe' } }]))
      .mockResolvedValueOnce(finalResponse('done'));

    const executeTool = vi.fn().mockResolvedValue({ found: true, cheapest: 1 });
    const result = await runAgent({
      systemPrompt: 'sys',
      tools: [],
      executeTool,
      initialMessage: 'hello',
    });

    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(executeTool).toHaveBeenCalledWith('lookup_price', { material_name: 'pipe' }, {});
    expect(result.answer).toBe('done');
    expect(result.turns).toBe(2);
  });

  it('AC1.2 executes multiple tool calls in one turn and returns all results in a single message', async () => {
    createMessage
      .mockResolvedValueOnce(
        toolUseResponse([
          { name: 'lookup_price', input: { material_name: 'pipe' } },
          { name: 'lookup_price', input: { material_name: 'valve' } },
        ]),
      )
      .mockResolvedValueOnce(finalResponse('done'));

    const executeTool = vi.fn().mockResolvedValue({ found: false });
    const result = await runAgent({
      systemPrompt: 'sys',
      tools: [],
      executeTool,
      initialMessage: 'hello',
    });

    expect(executeTool).toHaveBeenCalledTimes(2);

    // The message immediately after the two tool_use blocks must carry both
    // tool_result entries together — splitting them across messages is what
    // causes a real 400 from the Anthropic API.
    const toolResultMessage = result.messages.find(
      (m) => Array.isArray(m.content) && m.content[0]?.type === 'tool_result',
    );
    expect(toolResultMessage.content).toHaveLength(2);
    expect(toolResultMessage.content.every((c) => c.type === 'tool_result')).toBe(true);
  });

  it('AC1.3 returns the final answer once stop_reason is not tool_use', async () => {
    createMessage.mockResolvedValueOnce(finalResponse('all done'));

    const result = await runAgent({
      systemPrompt: 'sys',
      tools: [],
      executeTool: vi.fn(),
      initialMessage: 'hello',
    });

    expect(result.answer).toBe('all done');
    expect(result.turns).toBe(1);
    expect(createMessage).toHaveBeenCalledTimes(1);
  });

  it('AC1.4 calls onStep with the documented event sequence', async () => {
    createMessage
      .mockResolvedValueOnce(toolUseResponse([{ name: 'ask_user', input: { question: 'q' } }]))
      .mockResolvedValueOnce(finalResponse('done'));

    const events = [];
    await runAgent({
      systemPrompt: 'sys',
      tools: [],
      executeTool: vi.fn().mockResolvedValue({ answer: 'a' }),
      initialMessage: 'hello',
      onStep: (step) => events.push(step.type),
    });

    expect(events).toEqual([
      'turn_start',
      'api_start',
      'api_end',
      'tool_call',
      'tool_result',
      'turn_start',
      'api_start',
      'api_end',
      'final_answer',
    ]);
  });

  it('AC1.5 continues the loop even if onStep throws', async () => {
    createMessage.mockResolvedValueOnce(finalResponse('done'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await runAgent({
      systemPrompt: 'sys',
      tools: [],
      executeTool: vi.fn(),
      initialMessage: 'hello',
      onStep: () => {
        throw new Error('boom');
      },
    });

    expect(result.answer).toBe('done');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('AC1.6 throws once maxTurns is exceeded', async () => {
    createMessage.mockResolvedValue(
      toolUseResponse([{ name: 'lookup_price', input: { material_name: 'pipe' } }]),
    );

    await expect(
      runAgent({
        systemPrompt: 'sys',
        tools: [],
        executeTool: vi.fn().mockResolvedValue({}),
        initialMessage: 'hello',
        maxTurns: 2,
      }),
    ).rejects.toThrow('Agent exceeded max turns (2)');
  });

  it('AC1.7 passes the same toolContext to every executeTool call across turns', async () => {
    createMessage
      .mockResolvedValueOnce(toolUseResponse([{ name: 'lookup_price', input: { material_name: 'a' } }]))
      .mockResolvedValueOnce(toolUseResponse([{ name: 'lookup_price', input: { material_name: 'b' } }]))
      .mockResolvedValueOnce(finalResponse('done'));

    const toolContext = { traderProfile: { business_name: 'Acme' } };
    const executeTool = vi.fn().mockResolvedValue({});

    await runAgent({
      systemPrompt: 'sys',
      tools: [],
      executeTool,
      initialMessage: 'hello',
      toolContext,
    });

    expect(executeTool).toHaveBeenCalledTimes(2);
    for (const call of executeTool.mock.calls) {
      expect(call[2]).toBe(toolContext);
    }
  });
});
