import { describe, it, expect } from 'vitest';
import { ValidatorGate } from '../shared/gates/validator.gate';

describe('ValidatorGate Tests', () => {
  it('should validate emails correctly', () => {
    expect(ValidatorGate.validate('email', 'test@example.com').isValid).toBe(true);
    expect(ValidatorGate.validate('email', 'invalid-email').isValid).toBe(false);
    expect(ValidatorGate.validate('email', '').isValid).toBe(false);
  });

  it('should validate passwords correctly', () => {
    expect(ValidatorGate.validate('password', '123456').isValid).toBe(true);
    expect(ValidatorGate.validate('password', '123').isValid).toBe(false);
  });

  it('should validate codenames correctly', () => {
    expect(ValidatorGate.validate('codename', 'valid_name').isValid).toBe(true);
    expect(ValidatorGate.validate('codename', 'a!b').isValid).toBe(false);
    expect(ValidatorGate.validate('codename', 'nigger').isValid).toBe(false); // Profanity check
  });

  it('should validate numerical amounts correctly', () => {
    expect(ValidatorGate.validate('numerical_amount', '100').isValid).toBe(true);
    expect(ValidatorGate.validate('numerical_amount', '-10').isValid).toBe(false);
    expect(ValidatorGate.validate('numerical_amount', 'abc').isValid).toBe(false);
  });

  it('should detect XSS patterns', () => {
    expect(ValidatorGate.validate('chat_text', '<script>alert(1)</script>').isValid).toBe(false);
    expect(ValidatorGate.validate('chat_text', 'javascript:void(0)').isValid).toBe(false);
  });
});
