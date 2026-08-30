/**
 * NIRAMAALAI SaaS Billing Software — Final Master Release Gate
 * scripts/verify-final-release.ts
 *
 * Final authoritative command (npm run verify:final-release) executing all
 * production gates, unit tests, typechecks, financial reconciliations,
 * adversarial matrices, production builds, and health checks.
 */

import { execSync } from 'child_process';
import path from 'path';

export async function runFinalReleaseGate() {
  console.log('=================================================================');
  console.log('│         NIRAMAALAI SAAS BILLING — FINAL RELEASE GATE          │');
  console.log('=================================================================\n');

  const cwd = process.cwd();
  const gateResults: Array<{ name: string; command: string; passed: boolean }> = [];

  const gates = [
    { name: 'TypeScript Strict Mode', command: 'npx tsc --noEmit' },
    { name: 'Unit Test Suite (139 Tests)', command: 'npx vitest run' },
    { name: 'Production Readiness Invariants Gate', command: 'npx tsx scripts/verify-production-readiness.ts' },
    { name: 'Master Product Quality Gate (30 Subsystems)', command: 'npx tsx scripts/verify-final-product.ts' },
    { name: 'Phase 4A Adversarial Financial Matrix', command: 'npx tsx scripts/verify-phase4a-adversarial-matrix.ts' },
    { name: 'Phase 4B Financial Reconciliation & Concurrency', command: 'npx tsx scripts/verify-phase4b-financial-reconciliation.ts' },
    { name: 'Phase 4E Real-World UAT Simulation (10 Steps)', command: 'npx tsx scripts/run-uat-simulation.ts' },
    { name: 'Next.js Production Build Bundle', command: 'npm run build' },
  ];

  for (const g of gates) {
    console.log(`Executing ${g.name}...`);
    try {
      execSync(g.command, { cwd, encoding: 'utf8', stdio: 'pipe' });
      gateResults.push({ name: g.name, command: g.command, passed: true });
      console.log(`✅ PASS: ${g.name}\n`);
    } catch (err: any) {
      gateResults.push({ name: g.name, command: g.command, passed: false });
      console.error(`❌ FAIL: ${g.name}\n`);
    }
  }

  const totalGates = gateResults.length;
  const passedGates = gateResults.filter((r) => r.passed).length;
  const passVerdict = totalGates === passedGates;

  console.log('=================================================================');
  console.log('│             NIRAMAALAI FINAL RELEASE GATE RESULTS             │');
  console.log('=================================================================');
  for (const r of gateResults) {
    const padName = r.name.padEnd(45, ' ');
    console.log(`│ ${padName} ${r.passed ? 'PASS ✅' : 'FAIL ❌'} │`);
  }
  console.log('=================================================================\n');

  if (passVerdict) {
    console.log('=================================================================');
    console.log('│                                                               │');
    console.log('│                 *** STAGING_CANDIDATE_APPROVED ***            │');
    console.log('│                                                               │');
    console.log('│ Application code is ready for production staging deployment.   │');
    console.log('│ Production launch is pending real-world UAT & ops review.      │');
    console.log('│                                                               │');
    console.log('=================================================================\n');
  } else {
    console.log('=================================================================');
    console.log('│                 FINAL RELEASE GATE REJECTED                   │');
    console.log('=================================================================\n');
  }

  const report = {
    system: 'NIRAMAALAI SaaS Billing Software',
    buildStatus: passVerdict ? 'FINAL_RELEASE_APPROVED' : 'RELEASE_REJECTED',
    timestamp: new Date().toISOString(),
    totalGates,
    passedGates,
    passVerdict,
    readinessStatement:
      'Application code is ready for production staging; production launch is pending real-world UAT, infrastructure/security review, and operational validation.',
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(passVerdict ? 0 : 1);
}

if (require.main === module) {
  runFinalReleaseGate().catch((err) => {
    console.error('Final Release Gate execution failed:', err);
    process.exit(1);
  });
}
