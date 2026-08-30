/**
 * NIRAMAALAI SaaS Billing Software — Master Release Candidate Verification Suite
 * scripts/verify-release.ts
 *
 * Single authoritative release verification command (npm run verify:release)
 * executing all production gates, unit tests, typechecks, financial reconciliations,
 * adversarial matrices, and real-world UAT simulations.
 */

import { execSync } from 'child_process';
import path from 'path';

export async function runMasterReleaseVerification() {
  console.log('=================================================================');
  console.log('=== NIRAMAALAI SAAS BILLING SOFTWARE — MASTER RELEASE GATE ===');
  console.log('=================================================================\n');

  const cwd = process.cwd();
  const suiteResults: Array<{ name: string; command: string; passed: boolean; output: string }> = [];

  const suites = [
    { name: '1. Vitest Unit Test Suite (139 Tests)', command: 'npx vitest run' },
    { name: '2. TypeScript Strict Mode Typecheck', command: 'npx tsc --noEmit' },
    { name: '3. Production Readiness Invariants Gate', command: 'npx tsx scripts/verify-production-readiness.ts' },
    { name: '4. Master Product Quality Gate (30 Subsystems)', command: 'npx tsx scripts/verify-final-product.ts' },
    { name: '5. Phase 4A Deep Adversarial Financial Matrix', command: 'npx tsx scripts/verify-phase4a-adversarial-matrix.ts' },
    { name: '6. Phase 4B Financial Reconciliation & Concurrency', command: 'npx tsx scripts/verify-phase4b-financial-reconciliation.ts' },
    { name: '7. Phase 4E Real-World UAT Simulation (10 Steps)', command: 'npx tsx scripts/run-uat-simulation.ts' },
  ];

  for (const s of suites) {
    console.log(`Executing ${s.name}...`);
    try {
      const stdout = execSync(s.command, { cwd, encoding: 'utf8', stdio: 'pipe' });
      suiteResults.push({ name: s.name, command: s.command, passed: true, output: stdout });
      console.log(`✅ PASSED: ${s.name}\n`);
    } catch (err: any) {
      const output = err.stdout || err.stderr || err.message;
      suiteResults.push({ name: s.name, command: s.command, passed: false, output });
      console.error(`❌ FAILED: ${s.name}\n`);
    }
  }

  const totalSuites = suiteResults.length;
  const passedSuites = suiteResults.filter((r) => r.passed).length;
  const passVerdict = totalSuites === passedSuites;

  console.log('=================================================================');
  console.log('--- MASTER RELEASE CANDIDATE VERIFICATION SUMMARY ---');
  console.log('=================================================================');
  for (const r of suiteResults) {
    console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'}: ${r.name}`);
  }

  const finalReleaseReport = {
    system: 'NIRAMAALAI SaaS Billing Software',
    buildStatus: passVerdict ? 'RELEASE_CANDIDATE_APPROVED' : 'RELEASE_REJECTED',
    timestamp: new Date().toISOString(),
    totalSuites,
    passedSuites,
    passVerdict,
    readinessStatement:
      'Application code is ready for production staging; production launch is pending real-world UAT, infrastructure/security review, and operational validation.',
  };

  console.log('\nFinal Release Report:\n', JSON.stringify(finalReleaseReport, null, 2));
  process.exit(passVerdict ? 0 : 1);
}

if (require.main === module) {
  runMasterReleaseVerification().catch((err) => {
    console.error('Master Release Candidate verification failed:', err);
    process.exit(1);
  });
}
