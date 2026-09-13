import { describe, it, expect } from 'vitest'
import { extractMaterialsFromToolCallLog } from './quote-materials.js'

describe('extractMaterialsFromToolCallLog', () => {
  it('returns [] for missing/malformed input', () => {
    expect(extractMaterialsFromToolCallLog(null)).toEqual([])
    expect(extractMaterialsFromToolCallLog(undefined)).toEqual([])
    expect(extractMaterialsFromToolCallLog('not an array')).toEqual([])
    expect(extractMaterialsFromToolCallLog([])).toEqual([])
  })

  it('finds the identify_materials tool_result among other steps', () => {
    const log = [
      { type: 'turn_start', turn: 1 },
      { type: 'tool_call', tool: 'identify_materials', input: {} },
      { type: 'tool_result', tool: 'identify_materials', result: { materials: [{ name: 'Consumer unit 10-way RCBO', quantity: '1', notes: null, confidence: 'certain' }] } },
      { type: 'tool_call', tool: 'draft_section', input: { section: 'introduction' } },
      { type: 'tool_result', tool: 'draft_section', result: { section: 'introduction', status: 'drafted' } },
    ]
    expect(extractMaterialsFromToolCallLog(log)).toEqual([{ name: 'Consumer unit 10-way RCBO', quantity: '1', notes: null, confidence: 'certain' }])
  })

  it('returns [] when no identify_materials tool_result is present', () => {
    const log = [{ type: 'tool_call', tool: 'draft_section', input: {} }]
    expect(extractMaterialsFromToolCallLog(log)).toEqual([])
  })

  it('returns [] when identify_materials result is malformed (no materials array)', () => {
    const log = [{ type: 'tool_result', tool: 'identify_materials', result: { error: true, message: 'boom' } }]
    expect(extractMaterialsFromToolCallLog(log)).toEqual([])
  })
})
