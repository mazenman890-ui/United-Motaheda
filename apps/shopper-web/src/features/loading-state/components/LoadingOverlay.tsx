import { motion, AnimatePresence } from 'framer-motion';
import { LoadingStage, AppReadinessState } from '../hooks/useAppReadiness';
import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps {
  readinessState: AppReadinessState;
  onRetry: () => void;
}

const EASING = [0.4, 0, 0.2, 1] as const; // Native feel easing

export function LoadingOverlay({ readinessState, onRetry }: LoadingOverlayProps) {
  const { shouldShowOverlay, stage, error, retryCount, progress, authReady, catalogReady, assetsReady } = readinessState;

  const getStageMessage = (stg: LoadingStage) => {
    const messages = {
      [LoadingStage.AUTH_CHECKING]: {
        ar: 'التحقق من الحساب...',
        en: 'Verifying Account...',
      },
      [LoadingStage.AUTH_COMPLETE]: {
        ar: 'جاري تحميل الكتالوج...',
        en: 'Loading Catalog...',
      },
      [LoadingStage.CATALOG_COMPLETE]: {
        ar: 'جاري تحميل الموارد...',
        en: 'Loading Resources...',
      },
      [LoadingStage.ASSETS_COMPLETE]: {
        ar: 'الانتهاء من التحضير...',
        en: 'Finalizing...',
      },
      [LoadingStage.ERROR]: {
        ar: 'حدث خطأ في التحميل',
        en: 'Loading Error',
      },
    };

    return messages[stg] || { ar: 'جاري التحميل...', en: 'Loading...' };
  };

  const stageMessage = getStageMessage(stage);

  return (
    <AnimatePresence mode="wait">
      {shouldShowOverlay && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASING }}
          className={styles.overlay}
          aria-busy={stage !== LoadingStage.ERROR}
          role="status"
          aria-label={stage === LoadingStage.ERROR ? 'Loading error' : 'Loading application'}
          aria-live="polite"
        >
          <motion.div
            className={styles.container}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
          >
            {/* Spinner */}
            <motion.div
              className={styles.spinnerContainer}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3, ease: EASING }}
            >
              <div className={styles.spinner} aria-hidden="true" />
            </motion.div>

            {/* Progress Text */}
            <motion.div
              className={styles.textContent}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3, ease: EASING }}
            >
              <h2 className={styles.heading} dir="auto">
                {stageMessage.en}
              </h2>
              <p className={styles.subheading} dir="auto">
                {stageMessage.ar}
              </p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              className={styles.progressBarContainer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3, ease: EASING }}
            >
              <motion.div
                className={styles.progressBar}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Loading progress: ${progress}%`}
              />
            </motion.div>

            {/* Stage Indicators */}
            <motion.div
              className={styles.stageIndicators}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.3, ease: EASING }}
            >
              <StageIndicator
                label="Account"
                isComplete={authReady}
                isActive={stage === LoadingStage.AUTH_CHECKING}
              />
              <StageIndicator
                label="Catalog"
                isComplete={catalogReady}
                isActive={stage === LoadingStage.CATALOG_LOADING}
              />
              <StageIndicator
                label="Assets"
                isComplete={assetsReady}
                isActive={stage === LoadingStage.ASSETS_LOADING}
              />
            </motion.div>

            {/* Error State */}
            {error && stage === LoadingStage.ERROR && (
              <motion.div
                className={styles.errorContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: EASING }}
              >
                <p className={styles.errorMessage} dir="auto">
                  {error.message}
                </p>

                <motion.button
                  onClick={onRetry}
                  className={styles.retryButton}
                  disabled={retryCount >= 3}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2, ease: EASING }}
                  aria-label={
                    retryCount >= 3
                      ? 'Maximum retry attempts reached'
                      : `Retry loading (attempt ${retryCount + 1} of 3)`
                  }
                >
                  {retryCount >= 3
                    ? 'Maximum Retries Reached'
                    : `Retry (${retryCount + 1}/3)`}
                </motion.button>

                <p className={styles.supportMessage} dir="auto">
                  For help, contact: <strong>united.pharmacy.eg@gmail.com</strong>
                  <br />
                  <a href="tel:+201012255595" className={styles.supportLink}>
                    📞 010 12255595
                  </a>
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface StageIndicatorProps {
  label: string;
  isComplete: boolean;
  isActive: boolean;
}

function StageIndicator({ label, isComplete, isActive }: StageIndicatorProps) {
  const EASING = [0.4, 0, 0.2, 1] as const;
  
  return (
    <div className={`${styles.stageIndicator} ${isComplete ? styles.complete : ''} ${isActive ? styles.active : ''}`}>
      <motion.div
        className={styles.indicatorDot}
        animate={{
          scale: isActive ? 1.2 : 1,
          opacity: isComplete ? 1 : isActive ? 0.8 : 0.3,
        }}
        transition={{ duration: 0.3, ease: EASING }}
      />
      <span className={styles.indicatorLabel}>{label}</span>
    </div>
  );
}
