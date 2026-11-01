import { describe, expect, it } from 'vitest';
import { resolveShortcut } from '@/features/exercise/logic/sessionShortcuts';
import type { ShortcutInput, ShortcutKeyEvent } from '@/features/exercise/logic/sessionShortcuts';
import type { SessionPhase } from '@/features/exercise/logic/sessionTypes';

const key = (k: string, extra: Partial<ShortcutKeyEvent> = {}): ShortcutKeyEvent => ({
  key: k,
  // A QWERTY digit row by default: key "1" comes from the physical key Digit1.
  code: /^[0-9]$/.test(k) ? `Digit${k}` : k === 'Enter' ? 'Enter' : '',
  repeat: false,
  isComposing: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...extra,
});

const resolve = (
  k: string,
  extra: Partial<Omit<ShortcutInput, 'event'>> & { event?: Partial<ShortcutKeyEvent> } = {},
) => {
  const { event, ...rest } = extra;
  return resolveShortcut({
    event: key(k, event),
    phase: 'idle',
    optionIds: ['a', 'b', 'c'],
    selectedOptionId: null,
    isDialogOpen: false,
    isButtonFocused: false,
    ...rest,
  });
};

const NONE = { type: 'none' };
const FEEDBACK: SessionPhase[] = ['correct', 'wrong', 'skipped'];
const ENDS: SessionPhase[] = ['lessonOver', 'practiceComplete', 'outOfHearts'];

describe('resolveShortcut number keys', () => {
  it.each([
    ['1', 'a'],
    ['2', 'b'],
    ['3', 'c'],
  ])('key %s selects the card at that position in idle and selected', (k, optionId) => {
    expect(resolve(k)).toEqual({ type: 'select', optionId });
    expect(resolve(k, { phase: 'selected', selectedOptionId: 'b' })).toEqual({
      type: 'select',
      optionId,
    });
  });

  it.each([
    ['&', 'Digit1', 'a'],
    ['é', 'Digit2', 'b'],
    ['"', 'Digit3', 'c'],
    ['1', 'Numpad1', 'a'],
    ['2', 'Numpad2', 'b'],
    ['3', 'Numpad3', 'c'],
  ])('key %s on physical %s selects card %s without Shift (AZERTY, numpad)', (k, code, optionId) => {
    expect(resolve(k, { event: { code } })).toEqual({ type: 'select', optionId });
  });

  it('matches the physical key, not the character', () => {
    expect(resolve('1', { event: { code: 'KeyA' } })).toEqual(NONE);
    expect(resolve('1', { event: { code: '' } })).toEqual(NONE);
    expect(resolve('&', { event: { code: 'Digit4' } })).toEqual(NONE);
  });

  it('the selected card number keeps it selected (same select action)', () => {
    expect(resolve('2', { phase: 'selected', selectedOptionId: 'b' })).toEqual({
      type: 'select',
      optionId: 'b',
    });
  });

  it.each(['0', '4', '9', 'a', ' ', 'Escape', 'ArrowDown'])('ignores key %s', (k) => {
    expect(resolve(k)).toEqual(NONE);
  });

  it('ignores a number with no card at that position', () => {
    expect(resolve('3', { optionIds: ['a', 'b'] })).toEqual(NONE);
    expect(resolve('1', { optionIds: [] })).toEqual(NONE);
  });

  it.each([...FEEDBACK, ...ENDS])('ignores numbers in %s', (phase) => {
    expect(resolve('1', { phase })).toEqual(NONE);
  });

  it('still selects when a button has focus (only Enter defers)', () => {
    expect(resolve('1', { isButtonFocused: true })).toEqual({ type: 'select', optionId: 'a' });
  });
});

describe('resolveShortcut Enter', () => {
  it('does nothing in idle', () => {
    expect(resolve('Enter')).toEqual(NONE);
  });

  it('checks in selected when a card is selected', () => {
    expect(resolve('Enter', { phase: 'selected', selectedOptionId: 'a' })).toEqual({ type: 'check' });
  });

  it('does nothing in selected when CHECK would be disabled', () => {
    expect(resolve('Enter', { phase: 'selected', selectedOptionId: null })).toEqual(NONE);
  });

  it.each([...FEEDBACK, ...ENDS])('continues in %s', (phase) => {
    expect(resolve('Enter', { phase })).toEqual({ type: 'continue' });
  });

  it('leaves Enter to a focused button in every phase', () => {
    for (const phase of ['idle', 'selected', ...FEEDBACK, ...ENDS] as SessionPhase[]) {
      expect(resolve('Enter', { phase, selectedOptionId: 'a', isButtonFocused: true })).toEqual(NONE);
    }
  });
});

describe('resolveShortcut ignored input', () => {
  const cases: Array<[string, Partial<ShortcutKeyEvent>]> = [
    ['auto-repeat', { repeat: true }],
    ['composition', { isComposing: true }],
    ['Ctrl', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
    ['Alt', { altKey: true }],
    ['Shift', { shiftKey: true }],
  ];

  it.each(cases)('ignores number and Enter with %s', (_name, event) => {
    expect(resolve('1', { event })).toEqual(NONE);
    expect(resolve('Enter', { phase: 'selected', selectedOptionId: 'a', event })).toEqual(NONE);
    expect(resolve('Enter', { phase: 'correct', event })).toEqual(NONE);
  });

  it('ignores everything while a dialog is open', () => {
    expect(resolve('1', { isDialogOpen: true })).toEqual(NONE);
    expect(resolve('Enter', { phase: 'selected', selectedOptionId: 'a', isDialogOpen: true })).toEqual(NONE);
    expect(resolve('Enter', { phase: 'wrong', isDialogOpen: true })).toEqual(NONE);
  });

  it('Skip has no shortcut', () => {
    for (const k of ['s', 'S', 'Backspace', 'Delete', 'Tab', 'Escape']) {
      expect(resolve(k, { phase: 'selected', selectedOptionId: 'a' })).toEqual(NONE);
    }
  });
});
