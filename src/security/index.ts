/**
 * Security Module
 * 
 * Exports security utilities for time validation and replay protection.
 */

export {
  MAX_CLOCK_SKEW_SECONDS,
  MAX_PROOF_AGE_SECONDS,
  ENABLE_REPLAY_PROTECTION,
  ENABLE_XRPL_CONSENT_TX_VERIFY,
  ENABLE_CARDANO_SIGNDATA_VERIFY,
  getNow,
  getNowISO,
  isoToSeconds,
  VerificationErrorCode,
  validateTimeRange,
  type TimeValidationResult,
} from './config.js';

export { TimestampAdapter } from './TimestampAdapter.js';

export {
  type IReplayStore,
  InMemoryReplayStore,
} from './InMemoryReplayStore.js';

export {
  FileReplayStore,
  createReplayStore,
  getReplayStore,
  resetReplayStore,
  generateReplayKey,
  type ReplayStoreConfig,
} from './ReplayStoreFactory.js';

export {
  type VerificationReport,
  type VerificationReportError,
  type VerificationReportCheck,
  type VerificationReportMeta,
  createVerificationReport,
  addCheck,
  addError,
  formatReportForConsole,
} from './VerificationReport.js';
