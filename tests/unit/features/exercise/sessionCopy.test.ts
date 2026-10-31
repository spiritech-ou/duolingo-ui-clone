import { describe, expect, it } from 'vitest';
import {
  getCorrectAnnouncement,
  getHeartsLeftText,
  getIncorrectAnnouncement,
  getPraise,
  getQuestionText,
  getSkippedAnnouncement,
} from '@/features/exercise/logic/sessionCopy';

describe('getPraise', () => {
  it('rotates in order and repeats after the fourth', () => {
    const expected = ['Great job!', 'Nice one!', 'Perfect!', 'Well done!'];
    expect([0, 1, 2, 3].map(getPraise)).toEqual(expected);
    expect([4, 5, 6, 7].map(getPraise)).toEqual(expected);
    expect(getPraise(9)).toBe('Nice one!');
  });

  it('treats a negative index as the first', () => {
    expect(getPraise(-3)).toBe('Great job!');
  });
});

describe('getHeartsLeftText', () => {
  it('covers none, one and many', () => {
    expect(getHeartsLeftText(0)).toBe('No hearts left');
    expect(getHeartsLeftText(1)).toBe('1 heart left');
    expect(getHeartsLeftText(2)).toBe('2 hearts left');
    expect(getHeartsLeftText(5)).toBe('5 hearts left');
  });

  it('never reports a negative count', () => {
    expect(getHeartsLeftText(-1)).toBe('No hearts left');
  });
});

describe('getQuestionText', () => {
  it('uses curly quotes around the English word', () => {
    expect(getQuestionText('tea')).toBe('Which one of these is “tea”?');
  });
});

describe('announcements', () => {
  it('announces a correct answer with the praise', () => {
    expect(getCorrectAnnouncement('Great job!')).toBe('Correct. Great job!');
  });

  it('announces an incorrect answer with the hearts left in a lesson', () => {
    expect(getIncorrectAnnouncement({ mode: 'lesson', estonian: 'tee', hearts: 3 })).toBe(
      'Incorrect. Correct solution: tee. 3 hearts left.',
    );
    expect(getIncorrectAnnouncement({ mode: 'lesson', estonian: 'õun', hearts: 1 })).toBe(
      'Incorrect. Correct solution: õun. 1 heart left.',
    );
    expect(getIncorrectAnnouncement({ mode: 'lesson', estonian: 'tee', hearts: 0 })).toBe(
      'Incorrect. Correct solution: tee. No hearts left.',
    );
  });

  it('announces a skipped exercise with the hearts left in a lesson', () => {
    expect(getSkippedAnnouncement({ mode: 'lesson', estonian: 'tee', hearts: 4 })).toBe(
      'Skipped. Correct solution: tee. 4 hearts left.',
    );
  });

  it('omits the heart sentence in practice', () => {
    expect(getIncorrectAnnouncement({ mode: 'practice', estonian: 'tee', hearts: 2 })).toBe(
      'Incorrect. Correct solution: tee.',
    );
    expect(getSkippedAnnouncement({ mode: 'practice', estonian: 'tee', hearts: 2 })).toBe(
      'Skipped. Correct solution: tee.',
    );
  });
});
