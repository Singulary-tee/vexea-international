import { describe, it, expect } from 'vitest';
import { LLMCommanderFeedback } from '../server/ai/LLMCommanderFeedback';

describe('LLMCommanderFeedback Tests', () => {
  it('should format empty feedback correctly', () => {
    const feedback = new LLMCommanderFeedback();
    const prompt = feedback.formatFeedbackPromptBlock();
    expect(prompt).toContain('[PREVIOUS CYCLE TOOL EXECUTION RESULTS]');
    expect(prompt).toContain('No tool calls executed in prior cycle.');
  });

  it('should record and format successful tool executions', () => {
    const feedback = new LLMCommanderFeedback();
    feedback.recordResult('move_group', { group_id: 'G1', target_zone: 'BRIDGE' }, 'SUCCESS');

    const prompt = feedback.formatFeedbackPromptBlock();
    expect(prompt).toContain('[SUCCESS] move_group');
    expect(prompt).toContain('"group_id":"G1"');
    expect(prompt).toContain('"target_zone":"BRIDGE"');
  });

  it('should record and format rejected tool executions with reason', () => {
    const feedback = new LLMCommanderFeedback();
    feedback.recordResult('spawn_units', { count: 5, unit_type: 'recon_drone' }, 'REJECTED', 'Insufficient AP');

    const prompt = feedback.formatFeedbackPromptBlock();
    expect(prompt).toContain('[REJECTED] spawn_units');
    expect(prompt).toContain('Insufficient AP');
  });

  it('should clear buffer correctly', () => {
    const feedback = new LLMCommanderFeedback();
    feedback.recordResult('hold_position', { group_id: 'G1' }, 'SUCCESS');
    feedback.clear();

    const prompt = feedback.formatFeedbackPromptBlock();
    expect(prompt).toContain('No tool calls executed in prior cycle.');
  });
});
