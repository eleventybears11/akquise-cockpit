# MASTER BUILD PROMPT — SALES INTELLIGENCE OS (Quelle: ChatGPT)

## YOUR ROLE
Act as my principal software architect, senior full-stack engineer, AI systems engineer, UX/UI designer, and technical product lead.
We are building a production-oriented, AI-native B2B Sales Intelligence web application for my personal use.
You are responsible for technical decisions, architecture, implementation, testing, documentation, and maintainability.
Challenge weak assumptions. Avoid unnecessary complexity. Prioritize usability, reliability, speed, and genuine business value.

## 1. PRODUCT VISION
Build a browser-based, voice-first Sales Intelligence Operating System.
The application must support my complete B2B sales workflow:
Research → Qualify → Prioritize → Prepare → Call → Capture → Follow Up → Learn
The system should minimize administrative work and maximize the time I spend speaking with qualified decision-makers.
It must be a real, persistent application, not a static prototype or a collection of disconnected AI prompts.

## 2. BUSINESS CONTEXT
I work as an independent B2B sales intermediary in Austria, currently collaborating with Webformance.
I identify businesses with meaningful commercial opportunities and connect them with suitable digital solutions.
The application must support:
- A configurable primary product
- Additional cross-selling products
- Different customer profiles
- Multiple future clients or business partners
- Different sales methodologies

Do not hardcode the entire application around Webformance.
My current business model is the starting point, not the architectural limitation.
The exact product descriptions, ICP, commercial positioning, and personal working preferences will be supplied separately through an onboarding interview conducted in Claude.

## 3. CORE APPLICATION MODULES

### A. SALES COMMAND CENTER
Build a central dashboard displaying:
- Today's prioritized leads
- Scheduled follow-ups
- High-potential opportunities
- Recent conversations
- Pending actions
- Pipeline overview
- Sales activity metrics

The dashboard must prioritize actionable information over decorative analytics.

### B. AI LEAD RESEARCH ENGINE
Research Austrian B2B companies using verifiable sources.
Identify signals including:
- Production expansion
- Hiring activity
- Market expansion
- Investments
- New partnerships
- New product launches
- Commercial challenges

Extract:
- Company identity
- Location
- Website
- Management
- Public business contact information
- Growth signals
- Sources and dates
- Potential commercial needs

Differentiate verified facts from hypotheses.
Never fabricate data.
Research must use authorized, configurable providers. Do not assume unrestricted scraping access.

### C. LEAD INTELLIGENCE & SCORING
Create a configurable scoring engine considering:
- Business growth signals
- Product fit
- Financial potential
- Urgency
- Decision-maker accessibility
- Likelihood of a near-term opportunity

Provide explainable scoring.
Users must be able to adjust scoring weights without modifying source code.

### D. CALL WORKSPACE
This is the most important daily interface.
Design a distraction-free calling workspace with:
- Company overview
- Decision-maker information
- Clickable telephone number
- One or two relevant growth signals
- Suggested opening angle
- Conversation notes
- Call outcome
- Next action
- Next prioritized lead

Optimize for rapid transitions between calls.
Do not build an intrusive teleprompter.
The application should support natural, consultative conversations rather than rigid sales scripts.

### E. VOICE-FIRST AI ASSISTANT
Implement voice-driven workflows where technically feasible.
Example commands:
- "Show me the next lead."
- "Find companies expanding production in Upper Austria."
- "The CEO said they have enough customers but struggle with recruiting."
- "Schedule a follow-up for next Thursday."
- "Summarize that conversation."
- "Find another company with similar growth signals."

Requirements:
- Browser microphone integration
- Speech-to-text through a replaceable provider
- Structured intent extraction
- Context-aware commands
- Confirmation before destructive actions
- Persistent conversation records
- Visible transcription and correction
- Graceful fallback to text input

Never claim that a voice command has changed persistent data unless the operation actually succeeded.
Do not assume that a paid Claude subscription includes unrestricted API access.

### F. CRM & PERSISTENT MEMORY
Build a structured CRM supporting:
- Companies
- Contacts
- Opportunities
- Interactions
- Notes
- Tasks
- Follow-ups
- Sales stages
- Products
- Research evidence

Use a real persistent database.
Keep CRM records separate from AI-generated summaries.
Support manual correction and export.

### G. OBSIDIAN INTEGRATION
Design Obsidian as an optional knowledge-management integration.
Support Markdown-compatible exports and imports first.
Later, implement secure bidirectional synchronization where technically feasible.
Handle:
- Conflict resolution
- Duplicate detection
- File ownership
- Synchronization errors
- Version history

Do not assume a cloud-hosted browser application can directly modify local Obsidian files.

### H. PERSONAL AI KNOWLEDGE BASE
The application must learn from explicitly saved feedback and sales outcomes.
Maintain structured knowledge about:
- My preferred sales approach
- Successful opening angles
- Lead quality patterns
- Objection handling
- Product positioning
- Common customer problems
- My working preferences

Use retrieval-based memory.
Do not silently rewrite factual CRM records based on AI interpretation.
Allow me to inspect and correct stored knowledge.

### I. ANALYTICS & IMPROVEMENT
Track:
- Contact attempts
- Actual conversations
- Decision-maker conversations
- Meetings booked
- Qualified opportunities
- Conversion rates
- Lead source performance
- Outcomes by industry

Use real recorded data.
Do not invent metrics.

## 4. TECHNICAL ARCHITECTURE
Evaluate and recommend an appropriate modern stack.
Initial candidates:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Supabase
- Server-side AI integration
- Playwright for end-to-end testing

You may recommend alternatives when justified.

Architecture requirements:
- Browser-first
- Responsive desktop and mobile layouts
- Modular services
- Type-safe data contracts
- Secure authentication
- Database migrations
- Clear environment configuration
- Provider-agnostic AI integration
- Source attribution
- Error handling
- Logging
- Automated tests
- Data export and backup

API keys must never be exposed in frontend code.
Include appropriate privacy controls, retention settings, and GDPR-aware handling of personal data.

## 5. UX/UI DESIGN DIRECTION
Design a professional premium SaaS interface.
Visual direction:
- Clean, modern, minimal
- Information-dense without clutter
- Excellent typography
- Strong visual hierarchy
- Fast navigation
- Dark and light mode
- Keyboard shortcuts
- Voice-first interaction
- Minimal administrative friction

Avoid generic AI dashboard templates.
The Call Workspace should feel like a specialized professional tool designed for a salesperson actively making calls.
Create reusable design tokens and components.
Test desktop and mobile layouts.

## 6. DEVELOPMENT WORKFLOW
Do not immediately implement the entire system.

### PHASE 1 — DISCOVERY & ARCHITECTURE
First:
1. Inspect the existing repository, if any.
2. Review the supplied business and personal context.
3. Identify missing critical requirements.
4. Propose a system architecture.
5. Define the database schema.
6. Define an MVP scope.
7. Identify external services and costs.
8. Identify technical and legal risks.
9. Propose milestones and acceptance criteria.

Ask only essential questions.
Present the plan for my approval before major implementation.

### PHASE 2 — DESIGN
Create:
- Information architecture
- User journeys
- Wireframes
- Design system
- Core screen layouts

Prioritize the Call Workspace and Lead Research interface.
Use realistic sample data clearly labeled as demo data.

### PHASE 3 — FUNCTIONAL MVP
Implement these features first:
1. Persistent company and contact records
2. Lead list with filtering and scoring
3. Individual company intelligence pages
4. Call Workspace
5. Conversation notes and outcomes
6. Follow-up management
7. AI research through a configured provider
8. Text-based AI assistant
9. Basic voice transcription

The MVP must be usable for actual daily sales work.

### PHASE 4 — ADVANCED AUTOMATION
After validating the MVP, develop:
- Automated lead discovery
- Research scheduling
- Advanced voice commands
- Obsidian synchronization
- Feedback-based recommendations
- Cross-selling intelligence
- Advanced analytics

## 7. DEVELOPMENT STANDARDS
Maintain:
- CLAUDE.md for project instructions
- docs/PRODUCT.md
- docs/ARCHITECTURE.md
- docs/ROADMAP.md
- docs/DECISIONS.md
- docs/TESTING.md

Use specialized subagents or skills where supported and genuinely beneficial.
Use separate responsibilities for architecture, frontend, backend, testing, and security review.
Do not install unverified third-party skills without reviewing their permissions and source.
Write maintainable code.
Run linting, type checks, automated tests, and production builds.
Use browser-based end-to-end tests for critical workflows.
Never report a feature as completed unless it has been implemented and verified.
Commit changes in meaningful increments.

## 8. CONTINUOUS IMPROVEMENT
After each development milestone:
1. Demonstrate the implemented functionality.
2. Explain what is working.
3. Identify limitations.
4. Present the next highest-value improvement.
5. Incorporate my feedback.
6. Update project documentation.

Maintain a clear distinction between planned, implemented, tested, and deployed functionality.

## 9. CURRENT ENVIRONMENT
I am using Claude Code through the browser.
Do not assume access to my local computer or Obsidian vault.
Prefer workflows compatible with cloud development and GitHub repositories.
The final application must be accessible through a normal browser.
I want to operate it primarily through natural language and voice commands.

## 10. FIRST TASK
Begin in planning mode.
Do not start by generating hundreds of files.
First deliver:
1. Recommended architecture and technology stack
2. MVP feature specification
3. Database design
4. Core user journeys
5. UI design proposal
6. Development roadmap
7. Expected infrastructure and AI operating costs
8. External dependencies and required accounts
9. Key risks and unresolved questions

Then explain the smallest implementation milestone that would give me a genuinely useful sales application.
Wait for approval before implementing the architecture.
