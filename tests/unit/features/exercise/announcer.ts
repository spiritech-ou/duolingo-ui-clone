import { screen } from '@testing-library/react';

/**
 * The footer's result announcement (a `role="status"` region). The question area has its own
 * status region for playback failures, so a bare `getByRole('status')` is ambiguous.
 */
export function getAnnouncer(): HTMLElement {
  const found = screen.getAllByRole('status').find((region) => !region.closest('main'));
  if (!found) throw new Error('The footer announcer is not rendered.');
  return found;
}
