import { describe, expect, it } from 'vitest';
import { exerciseSchema, lessonSchema, practiceSchema } from '@/api/schemas/lesson';

function exercise(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ex-1',
    type: 'picture-choice',
    english: 'tea',
    isNewWord: true,
    options: [
      { id: 'o-1', estonian: 'tee', picture: { emoji: '🍵', alt: 'A cup of tea' } },
      { id: 'o-2', estonian: 'kohv', picture: { emoji: '☕', alt: 'A cup of coffee' } },
      { id: 'o-3', estonian: 'leib', picture: { emoji: '🍞', alt: 'A loaf of bread' } },
    ],
    correctOptionId: 'o-1',
    ...overrides,
  };
}

function option(id: string, estonian: string) {
  return { id, estonian, picture: { emoji: '🍵', alt: 'A picture' } };
}

function issuePaths(result: ReturnType<typeof exerciseSchema.safeParse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('exerciseSchema', () => {
  it('accepts a valid picture-choice exercise', () => {
    expect(exerciseSchema.parse(exercise())).toEqual(exercise());
  });

  it('accepts Estonian letters unchanged', () => {
    const options = [
      option('o-1', 'õun'),
      option('o-2', 'jäätis'),
      option('o-3', 'žiraff'),
    ];
    const parsed = exerciseSchema.parse(exercise({ options, correctOptionId: 'o-3' }));
    expect(parsed.options.map((o) => o.estonian)).toEqual(['õun', 'jäätis', 'žiraff']);
  });

  it('accepts the correct option in any position', () => {
    expect(exerciseSchema.safeParse(exercise({ correctOptionId: 'o-3' })).success).toBe(true);
  });

  it('rejects an empty english word', () => {
    const result = exerciseSchema.safeParse(exercise({ english: '' }));
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('english');
  });

  it('rejects an empty estonian word', () => {
    const options = [option('o-1', ''), option('o-2', 'kohv'), option('o-3', 'leib')];
    const result = exerciseSchema.safeParse(exercise({ options }));
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('options.0.estonian');
  });

  it.each([0, 1, 2, 4])('rejects %i options', (count) => {
    const options = Array.from({ length: count }, (_, i) => option(`o-${i + 1}`, `sõna${i + 1}`));
    expect(exerciseSchema.safeParse(exercise({ options })).success).toBe(false);
  });

  it('rejects duplicate option ids', () => {
    const options = [option('o-1', 'tee'), option('o-1', 'kohv'), option('o-3', 'leib')];
    const result = exerciseSchema.safeParse(exercise({ options }));
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('options');
  });

  it('rejects a correctOptionId that is not among the options', () => {
    const result = exerciseSchema.safeParse(exercise({ correctOptionId: 'o-9' }));
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('correctOptionId');
  });

  it('rejects an unknown exercise type', () => {
    expect(exerciseSchema.safeParse(exercise({ type: 'translate' })).success).toBe(false);
  });

  it('rejects a non-boolean isNewWord', () => {
    expect(exerciseSchema.safeParse(exercise({ isNewWord: 'yes' })).success).toBe(false);
  });

  it('rejects an option without a picture', () => {
    const options = [
      { id: 'o-1', estonian: 'tee' },
      option('o-2', 'kohv'),
      option('o-3', 'leib'),
    ];
    expect(exerciseSchema.safeParse(exercise({ options })).success).toBe(false);
  });
});

describe('lessonSchema', () => {
  const lesson = {
    id: 'lesson-1',
    title: 'Basics',
    exercises: [exercise(), exercise({ id: 'ex-2', isNewWord: false })],
  };

  it('accepts a lesson and keeps the exercise order', () => {
    const parsed = lessonSchema.parse(lesson);
    expect(parsed.exercises.map((e) => e.id)).toEqual(['ex-1', 'ex-2']);
  });

  it('accepts a lesson with no exercises (empty-lesson state)', () => {
    expect(lessonSchema.safeParse({ ...lesson, exercises: [] }).success).toBe(true);
  });

  it('rejects a lesson containing an invalid exercise', () => {
    const exercises = [exercise({ correctOptionId: 'nope' })];
    expect(lessonSchema.safeParse({ ...lesson, exercises }).success).toBe(false);
  });

  it.each(['id', 'title', 'exercises'] as const)('rejects a lesson without %s', (key) => {
    const rest = Object.fromEntries(Object.entries(lesson).filter(([name]) => name !== key));
    expect(lessonSchema.safeParse(rest).success).toBe(false);
  });
});

describe('practiceSchema', () => {
  const practice = {
    id: 'practice',
    title: 'Practice',
    exercises: [exercise({ isNewWord: false })],
  };

  it('accepts the lesson shape with id "practice"', () => {
    expect(practiceSchema.parse(practice)).toEqual(practice);
  });

  it('rejects any other id', () => {
    expect(practiceSchema.safeParse({ ...practice, id: 'lesson-1' }).success).toBe(false);
  });

  it('applies the exercise rules', () => {
    const exercises = [exercise({ english: '' })];
    expect(practiceSchema.safeParse({ ...practice, exercises }).success).toBe(false);
  });
});
