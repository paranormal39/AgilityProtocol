/**
 * Verification Report
 * 
 * Structured report for debug and demo output.
 * This is NOT part of the protocol schema - it's for internal/CLI use only.
 */

import { VerificationErrorCode } from './config.js';

export interface VerificationReportError {
  code: VerificationErrorCode;
  message: string;
  field?: string;
}

export interface VerificationReportCheck {
  name: string;
  pass: boolean;
  details?: string;
}

export interface VerificationReportMeta {
  nowEpoch: number;
  clockSkewSeconds: number;
  proofAgeSeconds?: number;
  replayKey?: string;
  replayTtlSeconds?: number;
  requestHash?: string;
  consentHash?: string;
}

export interface VerificationReport {
  ok: boolean;
  errors: VerificationReportError[];
  checks: VerificationReportCheck[];
  meta: VerificationReportMeta;
}

/**
 * Create an empty verification report.
 */
export function createVerificationReport(nowEpoch: number, clockSkewSeconds: number): VerificationReport {
  return {
    ok: true,
    errors: [],
    checks: [],
    meta: {
      nowEpoch,
      clockSkewSeconds,
    },
  };
}

/**
 * Add a check to the report.
 */
export function addCheck(
  report: VerificationReport,
  name: string,
  pass: boolean,
  details?: string
): void {
  report.checks.push({ name, pass, details });
  if (!pass) {
    report.ok = false;
  }
}

/**
 * Add an error to the report.
 */
export function addError(
  report: VerificationReport,
  code: VerificationErrorCode,
  message: string,
  field?: string
): void {
  report.errors.push({ code, message, field });
  report.ok = false;
}

/**
 * Format report for console output.
 */
export function formatReportForConsole(report: VerificationReport): string {
  const lines: string[] = [];
  
  lines.push(`Result: ${report.ok ? 'PASS' : 'FAIL'}`);
  lines.push('');
  
  lines.push('Checks:');
  for (const check of report.checks) {
    const status = check.pass ? '✓' : '✗';
    const details = check.details ? ` (${check.details})` : '';
    lines.push(`  ${status} ${check.name}${details}`);
  }
  
  if (report.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of report.errors) {
      const field = error.field ? ` [${error.field}]` : '';
      lines.push(`  - ${error.code}${field}: ${error.message}`);
    }
  }
  
  lines.push('');
  lines.push('Meta:');
  lines.push(`  nowEpoch: ${report.meta.nowEpoch}`);
  lines.push(`  clockSkewSeconds: ${report.meta.clockSkewSeconds}`);
  if (report.meta.proofAgeSeconds !== undefined) {
    lines.push(`  proofAgeSeconds: ${report.meta.proofAgeSeconds}`);
  }
  if (report.meta.replayKey) {
    lines.push(`  replayKey: ${report.meta.replayKey}`);
  }
  if (report.meta.replayTtlSeconds !== undefined) {
    lines.push(`  replayTtlSeconds: ${report.meta.replayTtlSeconds}`);
  }
  if (report.meta.requestHash) {
    lines.push(`  requestHash: ${report.meta.requestHash.slice(0, 16)}...`);
  }
  if (report.meta.consentHash) {
    lines.push(`  consentHash: ${report.meta.consentHash.slice(0, 16)}...`);
  }
  
  return lines.join('\n');
}
