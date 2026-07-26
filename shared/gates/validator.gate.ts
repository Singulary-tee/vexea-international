/**
 * ValidatorGate — Centralized Input Format, Sanitization, and Content Gate
 * Responsible for verifying user input across all input fields (emails, passwords, codenames, chat text, amounts).
 */

export type InputFieldType = 
  | 'email'
  | 'password'
  | 'codename'
  | 'display_name'
  | 'chat_text'
  | 'user_text'
  | 'numerical_amount';

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  error: string | null;
}

// Basic list of prohibited patterns/terms for harassment & dangerous content filtering
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi
];

const PROFANITY_TERMS = [
  // Banned terms checked in a case-insensitive manner
  "nigger", "faggot", "chink", "kike", "spic"
];

export class ValidatorGate {
  /**
   * Main gate method attached to all input boxes across the app.
   */
  public static validate(type: InputFieldType, value: string): ValidationResult {
    const rawStr = value ?? '';
    const trimmed = rawStr.trim();

    // 1. Universal Anti-XSS / Security Check
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(rawStr)) {
        return {
          isValid: false,
          sanitizedValue: '',
          error: 'DANGEROUS CODE INJECTION DETECTED'
        };
      }
    }

    // 2. Type-specific validation
    switch (type) {
      case 'email': {
        if (!trimmed) {
          return { isValid: false, sanitizedValue: '', error: 'EMAIL IS REQUIRED' };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          return { isValid: false, sanitizedValue: trimmed, error: 'INVALID EMAIL FORMAT' };
        }
        return { isValid: true, sanitizedValue: trimmed.toLowerCase(), error: null };
      }

      case 'password': {
        if (!rawStr) {
          return { isValid: false, sanitizedValue: '', error: 'PASSWORD IS REQUIRED' };
        }
        if (rawStr.length < 6) {
          return { isValid: false, sanitizedValue: rawStr, error: 'PASSWORD MUST BE AT LEAST 6 CHARACTERS' };
        }
        if (rawStr.length > 128) {
          return { isValid: false, sanitizedValue: rawStr, error: 'PASSWORD EXCEEDS MAXIMUM LENGTH' };
        }
        return { isValid: true, sanitizedValue: rawStr, error: null };
      }

      case 'codename':
      case 'display_name': {
        if (!trimmed) {
          return { isValid: false, sanitizedValue: '', error: 'NAME IS REQUIRED' };
        }
        if (trimmed.length < 3 || trimmed.length > 20) {
          return { isValid: false, sanitizedValue: trimmed, error: 'CODENAME MUST BE 3-20 CHARACTERS' };
        }
        const nameRegex = /^[a-zA-Z0-9_]+$/;
        if (!nameRegex.test(trimmed)) {
          return { isValid: false, sanitizedValue: trimmed, error: 'ONLY LETTERS, NUMBERS, AND UNDERSCORES ALLOWED' };
        }
        // Profanity check
        const lowerName = trimmed.toLowerCase();
        for (const term of PROFANITY_TERMS) {
          if (lowerName.includes(term)) {
            return { isValid: false, sanitizedValue: trimmed, error: 'PROFANITY / HARASSMENT DETECTED IN CODENAME' };
          }
        }
        return { isValid: true, sanitizedValue: trimmed, error: null };
      }

      case 'chat_text':
      case 'user_text': {
        if (!trimmed) {
          return { isValid: false, sanitizedValue: '', error: 'MESSAGE CANNOT BE EMPTY' };
        }
        if (trimmed.length > 250) {
          return { isValid: false, sanitizedValue: trimmed.slice(0, 250), error: 'MESSAGE EXCEEDS 250 CHARACTER LIMIT' };
        }
        // Profanity filter replacement / rejection
        const lowerText = trimmed.toLowerCase();
        for (const term of PROFANITY_TERMS) {
          if (lowerText.includes(term)) {
            return { isValid: false, sanitizedValue: trimmed, error: 'ABUSIVE LANGUAGE / HARASSMENT BLOCKED BY GATE' };
          }
        }
        return { isValid: true, sanitizedValue: trimmed, error: null };
      }

      case 'numerical_amount': {
        const num = Number(trimmed);
        if (isNaN(num) || !isFinite(num)) {
          return { isValid: false, sanitizedValue: '0', error: 'VALUE MUST BE A VALID NUMBER' };
        }
        if (num < 0) {
          return { isValid: false, sanitizedValue: '0', error: 'AMOUNT CANNOT BE NEGATIVE' };
        }
        return { isValid: true, sanitizedValue: String(num), error: null };
      }

      default:
        return { isValid: true, sanitizedValue: trimmed, error: null };
    }
  }
}
