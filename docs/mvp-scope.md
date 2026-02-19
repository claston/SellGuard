# MVP Scope (Frozen)

## In scope
- Fixed list of monitored URLs
- Automated periodic scraping
- Snapshot persistence
- Change detection via SHA-256 hash comparison
- Basic relevance heuristic (delta size + keywords + priority)
- Email notification for relevant changes

## Out of scope
- Login/user management
- Multitenancy
- Billing automation
- Complex UI/dashboard
- Advanced AI-based classification
- Microservices architecture

## Strategic constraints
- Prioritize completion over architectural perfection
- No pivot before:
  - 90 days elapsed
  - 10 seller conversations
  - 3 delivered audits

## Success criteria
- At least one customer pays monthly
- Change detection runs automatically
- Relevant notifications are delivered with business context
- Manual effort per report is under 30 minutes
