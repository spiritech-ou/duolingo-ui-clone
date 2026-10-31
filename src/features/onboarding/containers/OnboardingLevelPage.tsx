import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Level } from '@/api/schemas/profile';
import { Button } from '@/components/ui/Button';
import { FocusedLayout } from '@/components/ui/FocusedLayout';
import { RadioCardGroup } from '@/components/ui/RadioCardGroup';
import { SignalBars } from '@/components/ui/SignalBars';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import {
  CONTINUE_HINT,
  findLevelOption,
  LEVEL_OPTIONS,
  LEVEL_PROMPT,
  LOWEST_LEVEL,
} from '../logic/levels';
import { getStartUnitIndex } from '../logic/startUnit';
import styles from './OnboardingLevelPage.module.scss';

/** Profile key used while nobody is signed in (the route guard arrives later); reads the defaults. */
const NO_USER_ID = '';

const RADIO_OPTIONS = LEVEL_OPTIONS.map((option) => ({
  value: String(option.level),
  label: option.label,
  icon: <SignalBars level={option.bars} />,
}));

export function OnboardingLevelPage() {
  useDocumentTitle('Onboarding');
  const navigate = useNavigate();
  const userId = useSessionStore((store) => store.session?.user.id ?? NO_USER_ID);
  const draftLevel = useProfileStore(selectProfile(userId)).onboarding.level;
  const saveDraftLevel = useProfileStore((store) => store.saveDraftLevel);
  const completeOnboarding = useProfileStore((store) => store.completeOnboarding);

  // Starts from the saved draft, so a reload or Back keeps the previous choice.
  const [level, setLevel] = useState<Level | null>(draftLevel);
  const promptId = useId();
  const hintId = useId();
  const promptRef = useRef<HTMLElement>(null);
  const hasContinued = useRef(false);

  useEffect(() => {
    promptRef.current?.focus();
  }, []);

  const selected = findLevelOption(level);

  const handleContinue = () => {
    if (!selected || hasContinued.current) return; // aria-disabled does not block clicks
    hasContinued.current = true; // Enter can repeat; navigate once
    if (selected.level === LOWEST_LEVEL) {
      completeOnboarding(userId, {
        level: selected.level,
        startChoice: 'scratch',
        startUnitIndex: getStartUnitIndex(selected.level, 'scratch'),
      });
      void navigate('/learn', { replace: true });
      return;
    }
    saveDraftLevel(userId, selected.level);
    void navigate('/onboarding/start');
  };

  return (
    <FocusedLayout
      footer={
        <div className={styles['footer']}>
          <Button
            size="lg"
            className={styles['continue']}
            aria-disabled={selected ? undefined : true}
            aria-describedby={selected ? undefined : hintId}
            onClick={handleContinue}
          >
            Continue
          </Button>
          {selected ? null : (
            <span id={hintId} className={styles['hint']}>
              {CONTINUE_HINT}
            </span>
          )}
        </div>
      }
    >
      <div className={styles['page']}>
        {/* Stable name for the group: the bubble text changes, this does not. */}
        <span id={promptId} className={styles['hidden']}>
          {LEVEL_PROMPT}
        </span>
        <SpeechBubble
          role="heading"
          message={selected?.reaction ?? LEVEL_PROMPT}
          {...(level !== null ? { bounceKey: level } : {})}
          ref={promptRef}
        />
        {/* Mounted from the start so the reaction is announced when it appears. */}
        <div role="status" aria-live="polite" aria-atomic="true" className={styles['hidden']}>
          {selected?.reaction ?? ''}
        </div>
        <RadioCardGroup
          aria-labelledby={promptId}
          options={RADIO_OPTIONS}
          value={selected ? String(selected.level) : null}
          onChange={(value) => setLevel(Number(value) as Level)} // values come from RADIO_OPTIONS
          onActivate={handleContinue}
        />
      </div>
    </FocusedLayout>
  );
}
