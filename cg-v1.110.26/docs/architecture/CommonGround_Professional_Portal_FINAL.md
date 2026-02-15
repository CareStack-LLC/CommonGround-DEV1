**CommonGround**

**Professional Portal**

*Complete Implementation Specification*

**Version 2.1 - FINAL**

February 2026

*Confidential - Internal Use Only*

Table of Contents

*\[Generate TOC in Word: References \> Table of Contents \> Insert Table of Contents\]*

Executive Summary

The CommonGround Professional Portal is a comprehensive case management platform designed specifically for family law attorneys, mediators, and other legal professionals. This document outlines the complete feature set, pricing structure, technical architecture, and implementation roadmap.

Purpose

The Professional Portal transforms how family law practitioners manage high-conflict custody cases by providing:

-   Unified case dashboard with real-time compliance monitoring

-   Direct communication with clients via secure messaging and video calls

-   AI-powered intake system (ARIA Intake) with customizable questionnaires

-   OCR document processing for automatic data extraction from California court orders

-   Court-ready compliance reports and evidence exports

-   Firm management with team roles and case assignment

-   Professional directory with opt-in featured placement

Key Benefits

  ----------------------- ----------------------------------------------------------
  **Benefit**             **Impact**

  Time Savings            15-20 hours/week saved per attorney on case management

  Client Satisfaction     80% reduction in unnecessary crisis calls from clients

  Court Prep              70% reduction in evidence compilation time

  Revenue Growth          Capacity to handle 7+ additional cases per year

  Intake Efficiency       80+ minutes saved per client with ARIA Intake automation
  ----------------------- ----------------------------------------------------------

Professional Account Tiers

CommonGround offers five professional account tiers designed to scale from solo practitioners to large multi-office firms. Professionals choose their tier at signup or can start with the free Starter tier. All professionals must complete bar number/license verification before accepting cases.

**Key Account Rules:**

-   Professionals can be both individual practitioners AND firm members simultaneously

-   Bar number/license verification required before accepting first case

-   Each parent finds their own representation independently (Parent A can have different attorney than Parent B)

-   Parents don\'t need to know the other parent has representation unless legally required

Tier 1: Starter (FREE)

**Price:** \$0/month for first 3 cases

**Target:** New attorneys, those evaluating the platform

**Included Features:**

-   Up to 3 active family cases

-   Full case management dashboard

-   Client messaging (in-app only)

-   Voice & video calls (same system as parent calls)

-   Calendar and event scheduling

-   Document viewing and upload

-   Basic compliance reports

-   Court-ready exports (PDF only)

-   Email support

-   Standard 17-section ARIA Custody Intake (read-only)

**Upgrade Trigger:** When the 4th case is accepted, professional must upgrade to Solo tier or higher

Tier 2: Solo Practitioner

**Price:** \$99/month or \$999/year (17% annual discount)

**Target:** Individual attorneys, solo practices, 1-3 person firms

**Included Features:**

-   Up to 15 active family cases

-   Everything in Starter, plus:

    -   ARIA Intake with 1 custom questionnaire

    -   OCR document processing (up to 10 docs/month, California forms only)

    -   Advanced compliance reports

    -   Export to Word/Excel formats

    -   Custom message templates

    -   Priority email support

**Overages:** \$10/case over 15 cases

**★ ARIA Custom Intake Feature:** Solo tier and above can create ONE custom intake questionnaire. ARIA uses the same core system prompt but asks the professional\'s custom questions in addition to (or instead of) the standard 17-section custody intake.

Tier 3: Small Firm

**Price:** \$299/month or \$2,999/year (17% annual discount)

**Target:** 2-5 attorney firms

**Included Features:**

-   Up to 50 active family cases

-   Up to 3 team members included

-   Everything in Solo, plus:

    -   Firm management dashboard

    -   Case queue and dispatcher role

    -   Team collaboration features

    -   Unlimited OCR document processing (California forms)

    -   Custom branding on client-facing materials

    -   Call recording (up to 50 hours storage)

    -   Firm profile in Professional Directory

    -   Quarterly training webinars

    -   Phone and email support

**Overages:** \$8/case over 50 cases, \$49/month per additional team member

**★ RECOMMENDED FOR PILOT PROGRAM**

Tier 4: Mid-Size Firm

**Price:** \$799/month or \$7,999/year (17% annual discount)

**Target:** 6-15 attorney firms

**Included Features:**

-   Up to 150 active family cases

-   Up to 10 team members included

-   Everything in Small Firm, plus:

    -   Advanced analytics dashboard

    -   API access for custom integrations

    -   White-label client portal option

    -   Dedicated account manager

    -   Unlimited call recording storage

    -   Custom report templates

    -   Featured placement in Professional Directory

    -   MyCase integration (COMING Q3 2026)

    -   On-site training (up to 2 sessions/year)

    -   24/7 phone support

**Overages:** \$6/case over 150 cases, \$39/month per additional team member

Tier 5: Enterprise (Custom)

**Price:** Custom pricing (starting at \$1,999/month)

**Target:** Large firms (15+ attorneys), multi-office practices

**Included Features:**

-   Unlimited active cases

-   Unlimited team members

-   Everything in Mid-Size, plus:

    -   Custom contract terms

    -   Practice management software integrations (Clio, MyCase, PracticePanther)

    -   Custom feature development

    -   Multi-office management capabilities

    -   Dedicated technical support team

    -   SLA guarantees (99.9% uptime)

    -   Quarterly business reviews

ARIA Intake System

ARIA Intake is an AI-powered client intake TOOL that professionals use to gather comprehensive information from new clients. The system saves attorneys 80+ minutes per client by automating the intake interview process.

Standard vs. Custom Intake

**Standard 17-Section Custody Intake (All Tiers)**

All professional tiers include access to the standard ARIA custody intake, which covers all 17 sections of the SharedCare Agreement. This intake is designed for NEW clients who don\'t have an existing case/family file.

-   Used for prospective clients before case creation

-   Creates NEW agreements (not for updating existing ones)

-   Covers all custody, schedule, financial, and communication topics

**Custom Intake Questionnaires (Solo Tier and Above)**

Professionals on paid tiers (\$99/month and up) can create ONE custom intake questionnaire in addition to the standard custody intake. The custom intake:

-   Uses the same ARIA core system prompt and conversational style

-   Asks the professional\'s custom questions

-   Can be used alongside OR instead of the standard custody intake

-   Allows attorneys to gather practice-specific information

**Example Use Cases for Custom Intakes:**

-   Mediation-focused intake for parenting coordinators

-   High-conflict case screening questions

-   Domestic violence safety assessment

-   Military family specific questions

-   Relocation case intake

Intake Workflow

1.  Professional selects intake type (standard 17-section or custom)

2.  Professional generates unique intake link

3.  Professional sends link to prospective client via email

4.  Client starts conversation with ARIA via web interface

5.  ARIA guides client through questions (client can save progress and return)

6.  Upon completion, professional receives notification

7.  Professional reviews completed intake in dashboard

8.  Professional decides: Accept client (create case) OR Decline OR Request follow-up

9.  If accepted, intake data auto-populates new case file

OCR Document Processing

The OCR (Optical Character Recognition) system automatically extracts structured data from California court orders, eliminating manual data entry. At launch, only California forms are supported; additional states will be added in future releases.

Supported California Court Forms (Launch)

-   FL-341 - Child Custody and Visitation Application Attachment

-   FL-311 - Child Custody and Visitation Order Attachment

-   FL-312 - Request for Child Custody and Visitation Orders

-   FL-150 - Income and Expense Declaration

-   FL-342 - Child Support Information and Order Attachment

OCR Processing Workflow

10. Professional uploads ONE court order PDF per case

11. System detects document type (FL-341, FL-311, etc.)

12. OCR engine extracts text and identifies data fields

13. AI validates extracted data for consistency

14. If confidence is LOW: System alerts professional to acknowledge and double-check

15. System presents extracted data to professional for review

16. Professional approves or corrects any fields

17. Upon approval, system creates NEW agreement populated with court order data

18. New agreement becomes the ACTIVE agreement for the case

19. System locks populated fields from parent editing

20. Parents receive notification that court order has been filed

Field Locking After OCR

When a court order is processed via OCR, specific fields are locked to prevent unauthorized changes by parents. Parents must work through their attorney and obtain a new court order to modify locked fields.

**Locked Field Behavior:**

-   Locked fields display: 🔒 Locked by Case-\[case-number\]

-   Parents can VIEW but cannot EDIT locked content

-   Tooltip explains: \"This field is set by court order. Contact your attorney to request changes.\"

-   To change locked fields, parents must go through professional and obtain new court order

-   No in-app \"request change\" button (must contact attorney externally)

**Professional Unlock Capability:**

-   Professionals can unlock specific fields if needed (requires confirmation)

-   Unlock action is logged in case timeline with reason

-   Parents receive notification when fields are unlocked

-   Unlocked fields remain unlocked until a new court order is filed

Communication & Calling

Professional communication uses the SAME infrastructure as parent-to-parent communication (KidComs system). This ensures consistency, reliability, and leverages existing technology.

Messaging Features

-   Message one parent OR both parents simultaneously

-   Attach documents to messages

-   Use customizable message templates

-   Propose calendar events inline

-   View ARIA flags on hostile parent-to-parent messages

-   All messages timestamped and logged

-   Export message history for court

Voice & Video Calling

**Technical Implementation:** Uses the same WebRTC infrastructure as KidComs parent-child calls. This provides:

-   Consistent call quality across all user types

-   Reduced development and maintenance costs

-   Unified call logging and recording infrastructure

**Call Features:**

-   One-click voice or video calls with clients

-   Conference calls with both parents

-   Screen sharing capabilities

-   Call recording (Small Firm tier and above)

-   Automatic call duration logging

-   Post-call notes interface

Compliance Reports

Professionals can generate comprehensive compliance reports for court submission or client review. Reports must be downloaded and include both raw data and formatted summaries to ensure court acceptance.

Report Types

-   Exchange Compliance Summary - On-time vs. missed exchanges

-   Communication Analysis - ARIA interventions, message volume, hostility metrics

-   Financial Dispute History - Unresolved expense disputes

-   Full Case Timeline - Chronological event log

-   Custom Reports - Select specific date ranges and data points

Report Content & Format

**Each report includes:**

-   Executive summary with key findings

-   Formatted data tables and statistics

-   RAW data appendix (message text, timestamps, etc.)

-   SHA-256 verification code for authenticity

-   Attorney signature line

**Export Formats:**

-   PDF - Court-ready formatting (REQUIRED for submission)

-   Word - Editable format for attorney notes

-   Excel - Raw data for analysis

**Important:** Reports must be downloaded and submitted manually. There is NO automatic email-to-court functionality (attorneys maintain full control over submissions).

Professional Directory

The Professional Directory allows parents to search for and invite attorneys directly through the platform. Professionals and firms can opt in, opt out, or request featured placement.

Directory Features

-   Search by location (city, state, zip code)

-   Filter by practice area (family law, mediation, DV cases, military families)

-   Filter by language spoken

-   View professional profiles (bio, experience, bar number)

-   View firm profiles (team size, areas of focus)

-   Send invitation directly from directory

Visibility Options

**Standard Listing (All Tiers):**

-   Appears in directory search results

-   Listed alphabetically within location

-   Can opt OUT at any time in settings

**Opt Out (All Tiers):**

-   Professional/firm does NOT appear in directory

-   Can still accept direct invitations from parents who know their name

-   Useful for referral-only practices

**Featured Placement (Mid-Size tier and above):**

-   Appears at TOP of search results

-   Profile badge: \"Featured Professional\"

-   Enhanced profile with logo, photos, testimonials

-   Can request featured status (subject to CommonGround approval)

Firm Management & Downgrade Handling

Small Firm tier and above includes team collaboration features. This section details what happens during firm transitions and account changes.

Firm Downgrade or Dissolution

When a firm downgrades from Small Firm to Solo, or when a firm account is closed:

21. All team members automatically become FREE Starter tier individual accounts

22. Team members receive email notification about account change

23. All cases that came through the FIRM remain with the FIRM OWNER

24. Firm owner maintains full control and access to firm cases

25. Team members lose access to firm cases (unless they had individual assignments)

26. Any individual cases team members accepted separately remain with them

Individual + Firm Membership

Professionals can simultaneously have:

-   Their own individual professional account (any tier)

-   Membership in ONE or MORE firms

**Case Assignment Logic:**

-   Cases invited to the PROFESSIONAL directly → go to their individual account

-   Cases invited to the FIRM → go to firm queue, assigned by dispatcher

-   Professional sees both types in their dashboard (clearly labeled)

Billing & External Systems

CommonGround does NOT handle client billing or payments for legal services. Professionals must use external practice management systems (like MyCase, Clio, etc.) for invoicing and payment processing.

What CommonGround DOES Handle

-   Professional subscription billing (\$99, \$299, \$799/month)

-   Case overage charges (if applicable)

-   Team member add-on fees

What CommonGround DOES NOT Handle

-   Attorney fees to clients (retainers, hourly billing, flat fees)

-   Client invoicing

-   Payment processing for legal services

-   Trust account management

-   Time tracking for billable hours (professionals track externally)

**Future Consideration:** MyCase integration (Q3 2026) will allow automatic time entry logging from CommonGround activities (calls, messages) into MyCase for billing purposes.

Implementation Roadmap

Proposed 14-week development timeline for Professional Portal Phase 1 (excluding MyCase integration).

**Weeks 1-2: Core Dashboard & Account Setup**

-   Database schema implementation

-   Professional signup flow with tier selection

-   Bar number/license verification system

-   Professional dashboard with case list

-   Case invitation acceptance flow

-   Activity timeline

**Weeks 3-4: Messaging System**

-   Integrate with existing KidComs messaging infrastructure

-   Professional message composer (one or both parents)

-   Message templates system

-   File attachments

-   Email notifications

**Weeks 5-6: Calendar, Events & Calls**

-   Professional calendar view

-   Court event scheduler

-   Parent notifications system

-   Integrate professional calls with KidComs WebRTC

-   Call logging and post-call actions

**Weeks 7-8: Documents & OCR**

-   Document viewer and uploader

-   PaddleOCR integration

-   California form detection (FL-341, FL-311, FL-312, FL-150, FL-342)

-   Data extraction and validation

-   Professional review/approval interface

-   Field locking system

**Weeks 9-10: ARIA Intake & Reports**

-   Standard 17-section ARIA intake

-   Custom intake questionnaire builder (Solo tier+)

-   Intake link generation and tracking

-   Professional intake review dashboard

-   Compliance report generator

-   Export formats (PDF/Word/Excel)

**Weeks 11-12: Firm Management & Directory**

-   Firm creation and settings

-   Team member invitation and role assignment

-   Case queue and dispatcher workflow

-   Professional/firm directory

-   Directory search and filtering

-   Opt-in/opt-out settings

-   Featured placement system

**Weeks 13-14: Polish, Testing & Launch**

-   Mobile responsive design

-   Performance optimization

-   User testing with beta attorneys

-   Bug fixes and refinements

-   Documentation and training materials

-   Pilot program launch with 3-5 Small Firm tier firms

*Phase 2 (MyCase Integration) is planned for Q3 2026, pending completion of Phase 1 and feedback from pilot attorneys.*

Summary & Next Steps

This specification provides a complete blueprint for the CommonGround Professional Portal, incorporating all clarified requirements and design decisions.

Key Decisions Finalized

-   ✅ Five-tier pricing structure with clear upgrade paths

-   ✅ Bar verification required before case acceptance

-   ✅ Professionals can be both individual AND firm members

-   ✅ Each parent has independent representation

-   ✅ ARIA Intake as professional TOOL with custom questionnaires

-   ✅ OCR creates NEW agreements, California-only at launch

-   ✅ Field locking via court orders only

-   ✅ Uses existing KidComs infrastructure for calls

-   ✅ Reports downloaded only (no auto-send to court)

-   ✅ Professional directory with opt-in/out and featured placement

-   ✅ No client billing through CommonGround

-   ✅ Firm downgrade converts team members to free tier

Immediate Next Steps

27. Review and approve this specification

28. Assign development team resources

29. Begin Week 1-2 development (Dashboard & Account Setup)

30. Identify 3-5 pilot firms for beta testing

31. Prepare marketing materials for pilot recruitment

**--- END OF SPECIFICATION ---**

**Ready for Development**
