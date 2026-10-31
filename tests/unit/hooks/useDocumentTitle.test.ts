import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  type DocumentTitleAdapter,
  useDocumentTitle,
} from '@/hooks/useDocumentTitle';

function fakeAdapter(supported = true): DocumentTitleAdapter & { titles: string[] } {
  const titles: string[] = [];
  return {
    titles,
    isSupported: () => supported,
    setTitle: (title) => {
      titles.push(title);
    },
  };
}

describe('useDocumentTitle', () => {
  afterEach(() => {
    document.title = '';
  });

  it.each(['Log in', 'Onboarding', 'Learn', 'Lesson', 'Practice', 'Page not found'])(
    'sets "%s | Spiritech"',
    (name) => {
      const adapter = fakeAdapter();
      const { result } = renderHook(() => useDocumentTitle(name, { adapter }));
      expect(adapter.titles).toEqual([`${name} | Spiritech`]);
      expect(result.current.isSupported).toBe(true);
    },
  );

  it('updates when the screen name changes and not on plain re-render', () => {
    const adapter = fakeAdapter();
    const { rerender } = renderHook(({ name }) => useDocumentTitle(name, { adapter }), {
      initialProps: { name: 'Learn' },
    });
    rerender({ name: 'Learn' });
    rerender({ name: 'Practice' });
    expect(adapter.titles).toEqual(['Learn | Spiritech', 'Practice | Spiritech']);
  });

  it('is a safe no-op when unsupported', () => {
    const adapter = fakeAdapter(false);
    const { result } = renderHook(() => useDocumentTitle('Learn', { adapter }));
    expect(result.current.isSupported).toBe(false);
    expect(adapter.titles).toEqual([]);
  });

  it('writes document.title by default', () => {
    const { rerender } = renderHook(({ name }) => useDocumentTitle(name), {
      initialProps: { name: 'Log in' },
    });
    expect(document.title).toBe('Log in | Spiritech');
    rerender({ name: 'Page not found' });
    expect(document.title).toBe('Page not found | Spiritech');
  });
});
