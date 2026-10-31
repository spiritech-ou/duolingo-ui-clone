import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/client';
import {
  CONNECTIVITY_MESSAGE,
  getFailureKind,
  getFailureMessage,
  getLoadScreenCopy,
  getLoadingTitle,
  OTHER_FAILURE_MESSAGE,
} from '@/features/exercise/logic/loadStates';

const http = (status: number) => new ApiError({ kind: 'http', status, message: 'x' });
const network = new ApiError({ kind: 'network', message: 'x' });
const invalid = new ApiError({ kind: 'invalid-payload', message: 'x' });

describe('loadStates', () => {
  it('names the loading screen after the mode', () => {
    expect(getLoadingTitle('lesson')).toBe('Getting your lesson ready…');
    expect(getLoadingTitle('practice')).toBe('Getting your practice ready…');
  });

  it('treats a lesson 404 as not found, and nothing else', () => {
    expect(getFailureKind(http(404), 'lesson')).toBe('notFound');
    expect(getFailureKind(http(500), 'lesson')).toBe('error');
    expect(getFailureKind(network, 'lesson')).toBe('error');
    expect(getFailureKind(invalid, 'lesson')).toBe('error');
  });

  it('never gives practice a not-found screen', () => {
    expect(getFailureKind(http(404), 'practice')).toBe('error');
  });

  it('maps connectivity failures and other failures to their own messages', () => {
    expect(getFailureMessage(network)).toBe(CONNECTIVITY_MESSAGE);
    expect(getFailureMessage(http(503))).toBe(OTHER_FAILURE_MESSAGE);
    expect(getFailureMessage(invalid)).toBe(OTHER_FAILURE_MESSAGE);
  });

  it('writes the copy of every screen for both modes', () => {
    expect(getLoadScreenCopy('error', 'lesson', network)).toEqual({
      title: "We couldn't load this lesson",
      message: CONNECTIVITY_MESSAGE,
    });
    expect(getLoadScreenCopy('error', 'practice', http(500))).toEqual({
      title: "We couldn't load this practice",
      message: OTHER_FAILURE_MESSAGE,
    });
    expect(getLoadScreenCopy('error', 'lesson')).toEqual({ title: "We couldn't load this lesson" });
    expect(getLoadScreenCopy('notFound', 'lesson')).toEqual({
      title: "We couldn't find this lesson",
    });
    expect(getLoadScreenCopy('empty', 'lesson').title).toBe('This lesson has no exercises yet');
    expect(getLoadScreenCopy('empty', 'practice').title).toBe('This practice has no exercises yet');
  });
});
