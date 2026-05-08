import { motion, AnimatePresence } from 'framer-motion';
import { LoadingStage, AppReadinessState } from '../hooks/useAppReadiness';
import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps {
  readinessState: AppReadinessState;
  onRetry: () => void;
}

const ease = [0.4, 0, 0.2, 1] as const;

const STAGE_MESSAGES: Partial<Record<LoadingStage, { en: string; ar: string }>> = {
  [LoadingStage.INITIAL]:          { en: 'Starting up…',         ar: 'جارٍ البدء…' },
  [LoadingStage.AUTH_CHECKING]:    { en: 'Verifying account…',   ar: 'التحقق من الحساب…' },
  [LoadingStage.AUTH_COMPLETE]:    { en: 'Loading catalog…',     ar: 'جارٍ تحميل الكتالوج…' },
  [LoadingStage.CATALOG_LOADING]:  { en: 'Loading catalog…',     ar: 'جارٍ تحميل الكتالوج…' },
  [LoadingStage.CATALOG_COMPLETE]: { en: 'Preparing resources…', ar: 'جارٍ تجهيز الموارد…' },
  [LoadingStage.ASSETS_LOADING]:   { en: 'Preparing resources…', ar: 'جارٍ تجهيز الموارد…' },
  [LoadingStage.ASSETS_COMPLETE]:  { en: 'Almost ready…',        ar: 'اللمسات الأخيرة…' },
  [LoadingStage.ERROR]:            { en: 'Something went wrong',  ar: 'حدث خطأ أثناء التحميل' },
};

const FALLBACK_MSG = { en: 'Loading…', ar: 'جارٍ التحميل…' };

export function LoadingOverlay({ readinessState, onRetry }: LoadingOverlayProps) {
  const {
    shouldShowOverlay,
    stage,
    error,
    retryCount,
    progress,
    authReady,
    catalogReady,
    assetsReady,
  } = readinessState;

  const message = STAGE_MESSAGES[stage] ?? FALLBACK_MSG;
  const isError = stage === LoadingStage.ERROR;

  return (
    <AnimatePresence mode="wait">
      {shouldShowOverlay && (
        <motion.div
          key="loading-overlay"
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease }}
          role="status"
          aria-live="polite"
          aria-busy={!isError}
          aria-label={isError ? 'Loading error occurred' : 'Loading United Pharmacies'}
        >
          {/* ── Card ── */}
          <motion.div
            className={styles.card}
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.45, ease }}
          >
            {/* ── Ring Spinner ── */}
            <motion.div
              className={styles.spinnerWrapper}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease }}
              aria-hidden="true"
            >
              <div className={styles.ringOuter} />
              <div className={styles.ringInner} />
              <div className={styles.crossIcon} />
              <div className={styles.pulseDot} />
            </motion.div>

            {/* ── Brand + Stage Text ── */}
            <motion.div
              className={styles.brandRow}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.35, ease }}
            >
              <span className={styles.brandName}>United Pharmacies</span>

              <AnimatePresence mode="wait">
                <motion.p
                  key={stage}
                  className={styles.stageText}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease }}
                >
                  {message.en}
                </motion.p>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.p
                  key={`ar-${stage}`}
                  className={styles.stageSubtext}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease }}
                >
                  {message.ar}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            {/* ── Progress ── */}
            <motion.div
              className={styles.progressSection}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28, duration: 0.35, ease }}
            >
              <div className={styles.progressLabel}>
                <span className={styles.progressPercent}>{progress}%</span>
                <span className={styles.progressStatus}>
                  {progress < 33 ? 'Authenticating' : progress < 66 ? 'Loading data' : progress < 100 ? 'Finalizing' : 'Complete'}
                </span>
              </div>
              <div className={styles.progressTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <motion.div
                  className={styles.progressFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* ── Pipeline Steps ── */}
            <motion.div
              className={styles.pipeline}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.36, duration: 0.35, ease }}
              aria-hidden="true"
            >
              <PipelineStep
                label="Account"
                isComplete={authReady}
                isActive={stage === LoadingStage.AUTH_CHECKING && !authReady}
              />
              <PipelineStep
                label="Catalog"
                isComplete={catalogReady}
                isActive={
                  authReady &&
                  (stage === LoadingStage.CATALOG_LOADING || stage === LoadingStage.AUTH_COMPLETE) &&
                  !catalogReady
                }
              />
              <PipelineStep
                label="Assets"
                isComplete={assetsReady}
                isActive={
                  catalogReady &&
                  (stage === LoadingStage.ASSETS_LOADING || stage === LoadingStage.CATALOG_COMPLETE) &&
                  !assetsReady
                }
              />
            </motion.div>

            {/* ── Error Block ── */}
            <AnimatePresence>
              {error && isError && (
                <motion.div
                  className={styles.errorBox}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3, ease }}
                >
                  <div className={styles.errorIcon} aria-hidden="true">⚠️</div>
                  <p className={styles.errorTitle}>Loading Timed Out</p>
                  <p className={styles.errorBody}>{error.message}</p>

                  <motion.button
                    onClick={onRetry}
                    disabled={retryCount >= 3}
                    className={styles.retryButton}
                    whileHover={{ scale: retryCount < 3 ? 1.02 : 1 }}
                    whileTap={{ scale: retryCount < 3 ? 0.98 : 1 }}
                    aria-label={
                      retryCount >= 3
                        ? 'Maximum retries reached'
                        : `Retry loading, attempt ${retryCount + 1} of 3`
                    }
                  >
                    {retryCount >= 3 ? 'Max retries reached' : `Try again (${retryCount + 1} / 3)`}
                  </motion.button>

                  <p className={styles.supportLine}>
                    Need help?&nbsp;
                    <a href="mailto:united.pharmacy.eg@gmail.com" className={styles.supportLink}>
                      united.pharmacy.eg@gmail.com
                    </a>
                    &nbsp;·&nbsp;
                    <a href="tel:+201012255595" className={styles.supportLink}>010 12255595</a>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Pipeline Step sub-component ── */
interface PipelineStepProps {
  label: string;
  isComplete: boolean;
  isActive: boolean;
}

function PipelineStep({ label, isComplete, isActive }: PipelineStepProps) {
  const cls = [
    styles.pipelineStep,
    isComplete ? styles.stepComplete : '',
    isActive ? styles.stepActive : '',
  ].join(' ').trim();

  return (
    <div className={cls}>
      <div className={styles.stepDot} />
      <span className={styles.stepLabel}>{label}</span>
    </div>
  );
}