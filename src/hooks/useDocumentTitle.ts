import { useEffect } from 'react';

export const TITLE_SUFFIX = ' | Spiritech';

export interface DocumentTitleAdapter {
  isSupported: () => boolean;
  setTitle: (title: string) => void;
}

export const browserDocumentTitle: DocumentTitleAdapter = {
  isSupported: () => typeof document !== 'undefined',
  setTitle: (title) => {
    document.title = title;
  },
};

export interface UseDocumentTitleOptions {
  adapter?: DocumentTitleAdapter;
}

export interface UseDocumentTitleResult {
  isSupported: boolean;
}

export function formatDocumentTitle(screenName: string): string {
  return `${screenName}${TITLE_SUFFIX}`;
}

/** Sets the document title to "<screenName> | Spiritech". Safe no-op without a document. */
export function useDocumentTitle(
  screenName: string,
  { adapter = browserDocumentTitle }: UseDocumentTitleOptions = {},
): UseDocumentTitleResult {
  const isSupported = adapter.isSupported();

  useEffect(() => {
    if (!adapter.isSupported()) return;
    adapter.setTitle(formatDocumentTitle(screenName));
  }, [adapter, screenName]);

  return { isSupported };
}
