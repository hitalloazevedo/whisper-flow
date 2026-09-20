# Code Quality Guide

This guide defines best practices to keep the codebase **organized, consistent, readable, and easy to maintain**, as well as establishing a standardized workflow using GitLab.

---

## 1. Branch Naming

Branch names must follow a standard that makes it easy to identify the purpose of the change.

Use a prefix that describes the type of work:

* `feat` — new feature
* `fix` — bug fix
* `refactor` — refactoring
* `chore` — maintenance
* `docs` — documentation
* `test` — tests
* `hotfix` — urgent fix in production

Format:

```text
<prefix>/<issue-id>

```

Examples:

```text
feat/issue-123
fix/issue-456
refactor/issue-789
docs/issue-101

```

Whenever possible, the branch should be linked to a **GitLab Issue**.

Avoid generic names such as:

```text
development
changes
test
my-feature
new-branch

```

---

## 2. Issues

Every relevant change must be associated with an **Issue** in GitLab.

An Issue must clearly state:

* what problem needs to be solved;
* what the goal of the change is;
* acceptance criteria;
* relevant information for implementation.

The Issue represents **the problem or need**, while the branch represents **the implementation of that Issue**.

Example:

```text
Issue #123
"Add user authentication"

Branch:
feat/issue-123

```

---

## 3. Variable Naming

Avoid ambiguous or excessively short names.

Prefer names that clearly explain what the data represents.

Bad:

```typescript
const d = 10;
const data = getData();
const x = users.filter(...);

```

Good:

```typescript
const timeoutInSeconds = 10;
const customerData = getCustomerData();
const activeUsers = users.filter(...);

```

Avoid unnecessary abbreviations and maintain consistent naming throughout the codebase.

For boolean values, prefer names that express a condition:

```typescript
const isActive = true;
const hasPermission = false;
const canEdit = true;

```

---

## 4. Function and Method Naming

Functions must have names that clearly state **what action they execute**.

Prefer verbs:

```typescript
createUser();
fetchCustomerData();
calculateTotalPrice();
validatePayment();

```

Avoid generic names:

```typescript
process();
handle();
execute();
data();

```

A function should, preferably, have a single, clear responsibility.

---

## 5. File and Directory Organization

Maintain a predictable and consistent structure.

Related files should stay close to each other.

Avoid creating abstractions or directories just to "organize" code when it brings no real benefit.

---

## 6. Single Responsibility

Each module, class, or function must have a well-defined responsibility.

Avoid concentrating multiple responsibilities into a single function, such as:

* validation;
* database access;
* data transformation;
* sending notifications;
* log generation.

When necessary, break these responsibilities down into smaller, well-defined components.

---

## 7. Avoid Duplication

Before implementing logic, check if it already exists in the codebase.

Avoid duplicating business rules or complex logic across different parts of the application.

However, **do not eliminate all duplication automatically**. Premature abstraction can increase code complexity.

Abstraction should exist when there is a genuinely shared responsibility.

---

## 8. Comments

Prefer self-explanatory code.

Avoid comments that merely describe what the code already makes obvious.

Bad:

```typescript
// Check if the user is active
if (user.status === 1) {
    ...
}

```

Better:

```typescript
const isUserActive = user.status === ACTIVE_STATUS;

if (isUserActive) {
    ...
}

```

Use comments to explain:

* business rules;
* non-obvious decisions;
* external limitations;
* architectural decisions;
* behaviors that cannot be easily inferred from the code.

---

## 9. Constants and Magic Values

Avoid meaningless values scattered throughout the code.

Bad:

```typescript
if (user.role === 3) {
    ...
}

```

Better:

```typescript
const ADMIN_ROLE = 3;

if (user.role === ADMIN_ROLE) {
    ...
}

```

The same principle applies to:

* timeouts;
* limits;
* status codes;
* URLs;
* configurations;
* values related to business rules.

---

## 10. Error Handling

Errors should not be silently ignored.

Avoid:

```typescript
try {
    await processPayment();
} catch {}

```

Prefer logging relevant information and handling the error according to the context:

```typescript
try {
    await processPayment();
} catch (error) {
    logger.error("Failed to process payment", { error });
    throw new PaymentProcessingError();
}

```

Do not expose sensitive information or internal application details to the end user.

---

## 11. Logging

Logs should facilitate problem investigation, especially in staging and production environments.

Prefer structured and contextualized logs:

```text
Failed to create order
userId=123
orderId=456

```

Avoid generic messages:

```text
Something went wrong

```

Never unnecessarily log sensitive information, such as:

* passwords;
* tokens;
* API keys;
* credentials;
* sensitive personal data.

---

## 12. Configurations and Secrets

Secrets must never be stored directly in the code or versioned in the repository.

Do not commit:

```text
.env
credentials
API keys
tokens
passwords
private keys

```

Use environment variables and, when appropriate, **GitLab CI/CD Variables** for information used by pipelines.

Example:

```typescript
const databaseUrl = process.env.DATABASE_URL;

```

---

## 13. Formatting and Linting

Use automated tools to enforce code standards.

Examples:

```text
ESLint
Prettier
Checkstyle
Spotless

```

The configuration for these tools must be versioned within the project.

Whenever possible, use **GitLab CI/CD** to automatically check:

* formatting;
* linting;
* tests;
* builds;
* other quality rules.

Style discussions that can be resolved automatically by tools should not take up space in Merge Requests.

---

## 14. Testing

New features must have adequate tests.

Bug fixes should, when possible, include a test to prevent regression.

Tests must be:

* independent;
* predictable;
* readable;
* fast whenever possible.

The goal is not simply to reach a coverage percentage, but to ensure that critical behaviors are protected.

---

## 15. Commits

Commits must represent small, logically related changes.

Avoid:

```text
fix
changes
update
test
asdf

```

Prefer messages that describe the change:

```text
feat(issue-id): add customer authentication
fix(issue-id): prevent duplicate order creation
refactor(issue-id): extract payment validation service

```

Avoid mixing unrelated changes in the same commit.

---

## 16. Merge Requests

Every change intended for a shared branch must go through a **Merge Request (MR)**.

An MR must:

* be linked to an Issue;
* have a clear description;
* explain what was changed;
* explain why the change was necessary;
* state how to test it;
* include evidence when necessary;
* pass all required pipelines.

Workflow example:

```text
Issue
  ↓
Branch
  ↓
Commits
  ↓
Merge Request
  ↓
CI/CD Pipeline
  ↓
Code Review
  ↓
Merge

```

Avoid Merge Requests that mix multiple unrelated changes.

---

## 17. Code Review

Code Review should prioritize:

1. correctness;
2. security;
3. architecture;
4. readability;
5. maintainability;
6. performance, when relevant;
7. style.

Comments should aim to improve the code and share knowledge.

Avoid blocking a Merge Request due to personal preferences that have no real impact on the solution's quality.

When a decision is a project rule, it must be documented in this guide or in another official codebase document.

---

## 18. GitLab CI/CD Pipelines

The pipeline must automate necessary checks prior to merging.

Example:

```text
Build
  ↓
Lint
  ↓
Tests
  ↓
Quality Checks
  ↓
Deploy

```

The Merge Request must not be merged if there are failures in required jobs.

Whenever possible, critical checks must be run automatically by GitLab CI/CD rather than relying on manual execution.

---

## 19. Protected Branches

Critical branches must be protected using GitLab settings.

Examples:

```text
main
develop
release/*

```

Depending on the adopted workflow, it may be necessary to restrict:

* direct pushes;
* merges;
* force pushes;
* who can approve or perform the merge.

The `main` branch, in particular, must represent a stable state of the application.

---

## 20. Merging

Before merging, the Merge Request must:

* have all required approvals;
* have passing pipelines;
* resolve all relevant review comments;
* satisfy the Issue criteria;
* have no pending merge conflicts.

After merging, the branch should be deleted unless there is a specific reason to keep it.

---

## 21. Code Owners

For critical areas or modules with designated owners, consider using GitLab's **CODEOWNERS** feature.

This allows defining responsible parties for specific areas of the codebase.

Example:

```text
/backend/ @backend-team
/frontend/ @frontend-team
/infrastructure/ @devops-team

```

This way, changes to specific directories can require approval from the responsible individuals.

---

## 22. Documentation

Documentation should explain things that are not obvious simply by reading the code.

The project must include, where applicable:

* instructions to run locally;
* environment setup;
* architecture overview;
* external integrations;
* deployment procedures;
* required variables;
* operational procedures;
* key architectural decisions.

Documentation must be updated alongside the changes that affect it.

---

## 23. Small, Incremental Changes

Prefer small, frequent changes.

Avoid accumulating months of work into a single branch or Merge Request.

Prefer:

```text
Issue → Branch → MR → Review → Merge

```

over:

```text
Long-lived branch → hundreds of commits → massive MR

```

Changing a little at a time makes it easier to:

* review code;
* identify bugs;
* resolve merge conflicts;
* perform rollbacks;
* understand history.

---

## 24. Codebase History

Git history should be useful for understanding how the project evolved.

To achieve this:

* keep commits atomic and focused;
* avoid meaningless commit messages;
* avoid mixing refactoring with functional changes unnecessarily;
* link commits and Merge Requests to Issues when appropriate.

History should not be treated merely as a technical log, but also as a source of context for future maintenance.

---

## 25. General Principle

Before writing code, ask yourself:

> **"What is the simplest way to implement this while keeping the code easy to understand, test, and modify?"**

A healthy codebase is not necessarily one with the most abstractions, patterns, or rules.

It is one where a developer can:

* quickly understand existing code;
* identify where a change needs to be made;
* make the change safely;
* validate the change automatically;
* review the change easily;
* predict its potential impact.

### Golden Rule

> **Code must be written for humans to read, and only incidentally for machines to execute.**