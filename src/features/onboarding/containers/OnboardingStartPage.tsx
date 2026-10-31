import { useEffect, useId, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import type { StartChoice } from '@/api/schemas/profile';
import { Button } from '@/components/ui/Button';
import { FocusedLayout } from '@/components/ui/FocusedLayout';
import { RadioCardGroup } from '@/components/ui/RadioCardGroup';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { selectCurrentUserId, useSessionStore } from '@/store/useSessionStore';
import { CONTINUE_HINT } from '../logic/levels';
import { findStartChoice, START_OPTIONS, START_PROMPT } from '../logic/startChoices';
import { getStartUnitIndex } from '../logic/startUnit';
import { CONTENT_MAX_WIDTH } from './layout';
import styles from './OnboardingStartPage.module.scss';

export function OnboardingStartPage() {
  useDocumentTitle('Onboarding');
  const navigate = useNavigate();
  const userId = useSessionStore(selectCurrentUserId);
  const level = useProfileStore(selectProfile(userId)).onboarding.level;
  const completeOnboarding = useProfileStore((store) => store.completeOnboarding);

  const [choice, setChoice] = useState<StartChoice | null>(null);
  const promptId = useId();
  const hintId = useId();
  const promptRef = useRef<HTMLElement>(null);
  const hasContinued = useRef(false);

  useEffect(() => {
    promptRef.current?.focus();
  }, []);

  // Without a draft level the flow did not start at step 1 (reload, direct visit).
  if (level === null) return <Navigate to="/onboarding/level" replace />;

  const handleContinue = () => {
    if (!choice || hasContinued.current) return; // aria-disabled does not block clicks
    hasContinued.current = true; // Enter can repeat; complete and navigate once
    completeOnboarding(userId, {
      level,
      startChoice: choice,
      startUnitIndex: getStartUnitIndex(level, choice),
    });
    void navigate('/learn', { replace: true });
  };

  const handleBack = () => {
    // The draft level is already in the profile, so step 1 preselects it.
    void navigate('/onboarding/level', { replace: true });
  };

  return (
    <FocusedLayout
      contentMaxWidth={CONTENT_MAX_WIDTH}
      footerMaxWidth="none"
      header={
        <Button variant="secondary" size="sm" className={styles['back']} onClick={handleBack}>
          Back
        </Button>
      }
      footer={
        <div className={styles['footer']}>
          <Button
            size="lg"
            className={styles['continue']}
            aria-disabled={choice ? undefined : true}
            aria-describedby={choice ? undefined : hintId}
            onClick={handleContinue}
          >
            Continue
          </Button>
          {choice ? null : (
            <span id={hintId} className={styles['hint']}>
              {CONTINUE_HINT}
            </span>
          )}
        </div>
      }
    >
      <div className={styles['page']}>
        {/* Stable name for the group, same pattern as step 1. */}
        <span id={promptId} className={styles['hidden']}>
          {START_PROMPT}
        </span>
        <div className={styles['row']}>
          <SpeechBubble role="heading" message={START_PROMPT} ref={promptRef} />
        </div>
        <RadioCardGroup
          size="lg"
          aria-labelledby={promptId}
          options={START_OPTIONS}
          value={choice}
          onChange={(value) => setChoice(findStartChoice(value))}
          onActivate={handleContinue}
        />
      </div>
    </FocusedLayout>
  );
}
