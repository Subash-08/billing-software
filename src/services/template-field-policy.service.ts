/**
 * Template Field Policy Domain Service
 * src/services/template-field-policy.service.ts
 *
 * Architecture Invariants:
 * 1. Template is presentation-ONLY. It determines visibility flags (VISIBLE / HIDDEN),
 *    never calculates monetary totals or tax values.
 * 2. 5-Level Policy Enforcement:
 *    - REQUIRED: Must be VISIBLE. Saving a template with a REQUIRED field set to HIDDEN throws error.
 *    - FORBIDDEN: Must be HIDDEN. Saving a template with a FORBIDDEN field set to VISIBLE throws error.
 *    - NOT_APPLICABLE: Resolves to HIDDEN.
 *    - CONDITIONAL: Resolves dynamically from TransactionContext (AUTO flag).
 *    - OPTIONAL: Respects user choice in template editor.
 */

import { IInvoiceTemplate } from '@/db/models/invoice-template.model';
import { IInvoice } from '@/db/models/invoice.model';
import { getDocumentComplianceProfile } from '@/engine/template/document-compliance.profile';
import { TransactionContext } from '@/engine/policy/transaction.context';
import { ApplicationError } from '@/lib/errors';

export class TemplatePolicyViolationError extends ApplicationError {
  constructor(message: string) {
    super(message, 'TEMPLATE_POLICY_VIOLATION', 400);
  }
}

export class TemplateFieldPolicyService {
  /**
   * Validates template configuration before saving to DB.
   * Throws TemplatePolicyViolationError if statutory REQUIRED fields are HIDDEN or FORBIDDEN fields are VISIBLE.
   */
  public static validateTemplateConfig(
    template: Partial<IInvoiceTemplate>,
    documentType: IInvoice['documentType'] = 'TAX_INVOICE'
  ): void {
    const profile = getDocumentComplianceProfile(documentType);
    const vis = template.fieldVisibility || {};

    for (const [field, level] of Object.entries(profile.fieldPolicies)) {
      const userValue = (vis as Record<string, string>)[field];

      if (level === 'REQUIRED' && userValue === 'HIDDEN') {
        throw new TemplatePolicyViolationError(
          `Field '${field}' is legally REQUIRED on ${documentType} and cannot be marked HIDDEN in the template.`
        );
      }

      if (level === 'FORBIDDEN' && userValue === 'VISIBLE') {
        throw new TemplatePolicyViolationError(
          `Field '${field}' is statutory FORBIDDEN on ${documentType} and cannot be marked VISIBLE in the template.`
        );
      }
    }
  }

  /**
   * Resolves effective visibility flags (boolean true/false) for document rendering.
   * Converts 'AUTO' values into true/false dynamically using the TransactionContext.
   */
  public static resolveEffectiveVisibility(
    template: IInvoiceTemplate,
    ctx: TransactionContext
  ): Record<string, boolean> {
    const profile = getDocumentComplianceProfile(ctx.documentType);
    const effectiveVisibility: Record<string, boolean> = {};
    const vis = (template.fieldVisibility || {}) as Record<string, string>;

    for (const [field, level] of Object.entries(profile.fieldPolicies)) {
      const userSetting = vis[field] || 'AUTO';

      if (level === 'REQUIRED') {
        effectiveVisibility[field] = true;
      } else if (level === 'FORBIDDEN' || level === 'NOT_APPLICABLE') {
        effectiveVisibility[field] = false;
      } else if (level === 'CONDITIONAL') {
        if (userSetting === 'VISIBLE') {
          effectiveVisibility[field] = true;
        } else if (userSetting === 'HIDDEN') {
          effectiveVisibility[field] = false;
        } else {
          // AUTO mode — evaluate against TransactionContext
          const evaluator = profile.conditionalEvaluators?.[field];
          effectiveVisibility[field] = evaluator ? evaluator(ctx) : false;
        }
      } else {
        // OPTIONAL field — user setting applies directly
        effectiveVisibility[field] = userSetting === 'VISIBLE' || userSetting === 'AUTO';
      }
    }

    return effectiveVisibility;
  }
}
