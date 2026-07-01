# AI Development Context – Strict TypeScript Project

This project is a Next.js (App Router) application.
Production builds run with STRICT TypeScript checks.

---

## 🚨 CRITICAL RULES (NON-NEGOTIABLE)

1. Many numeric fields used in the UI are **derived or computed**, NOT database columns.

   Examples include (but are not limited to):
   - interaction_count
   - days_overdue
   - lead_count
   - pending_count
   - overdue_count
   - completed_count
   - task_count

2. All derived numeric fields MUST be treated as:
   number | undefined

3. ❌ NEVER compare or operate on derived numeric fields directly in JSX.

   BAD:
   ```ts
   lead.days_overdue > 0
   emp.lead_count > 10

   GOOD:
   (lead.days_overdue ?? 0) > 0
   (emp.lead_count ?? 0) > 10

4. Derived numeric fields MUST always be defaulted to 0 before rendering.
