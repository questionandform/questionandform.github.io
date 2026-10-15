# Refined community model — review only

No merge or production activation is authorized. Continue the same four draft PRs. All nine public feature flags default false: communityUiEnabled, communitySubmissionEnabled, communityCommentsEnabled, humanHelpUiEnabled, contactCollectionEnabled, professionalProfilesEnabled, professionalMatchingEnabled, facebookLinksEnabled, discordLinksEnabled. The /ask question-drafting experience remains the published default. Optional groups are inert templates and are removed from the active DOM unless their gates are enabled. Empty social URLs never become links. Direct unavailable community shells are noindex and have no submission controls.

## Two modes and transport isolation

Production-safe mode has no community consent, help form, professional/matching controls, comments or social links. The localhost review server alone injects a local review marker for its /__review/ routes. Production code ignores that marker outside loopback hosts. A query parameter cannot enable review. The review flag resolver changes display gates only. ask.js independently refuses API transport, email collection and real receipt actions whenever review mode is active, even if transport configuration is changed. No frontend flag is an authorization boundary for real backend capabilities.

Fixtures are imported only by the audit server from backend/test/refined-fixtures.mjs. Production app modules import no fixture. Every local fixture page has robots noindex,nofollow and the visible labels LOCAL REVIEW FIXTURE and NOT PRODUCTION DATA. Do not copy fixture HTML into public community/profile routes or sitemaps. Local private dashboard/first-look routes require ephemeral authentication; public APIs expose no admin route, fixture or private rule.

## Canonical vertical communities and hub aggregation

LearnWithLev owns THINK discussions at https://learnwithlev.com/community/<generated-thread-slug>/, with mathematics, logic, probability, puzzles and tutoring topics. 3D Design owns SHAPE discussions at https://3dddesign.com/community/<generated-thread-slug>/, with rooms, layouts, 3D visualization, spatial design and decorative work. The Maker Home owns MAKE discussions at https://themakerhome.com/community/<generated-thread-slug>/, with DIY, repairs, practical projects, materials and making.

Each vertical template supports question, agent answer, moderated community contributions, moderated professional contributions, then an optional separately consented human-help CTA. No open comment writer or real publication is provided. The existing consent/moderation/minor-review requirements still apply. Real slug generation, takedown, moderation and per-thread canonical/OG metadata need validation before publication.

Question & Form is a discovery hub: latest approved question summaries, topics, agent filters, source-site labels and professional-contribution indicators. View full discussion links always point to the allowlisted vertical canonical URL. The hub does not republish full canonical discussions. Hub /community/thread/ is only an unavailable shell. Public canonical URLs are derived from a fixed agent/site mapping, never a visitor URL or private receipt. The disabled API read mapper adds that canonical/source metadata without private provider rules. No public fixture discussions are created.

## Professional participation, reputation and incentives

Profiles are display scaffolds for name, specialty, broad service area, languages, portfolio, availability, project-size preferences, evidence badges, helpful-answer count, completed projects and a verified-feedback summary. All current examples are fictional and labeled. Verified project is an illustrative badge, not a claim of vetting. A real verification process must define evidence, reviewer accountability, revocation and appeals before badges can be awarded.

Reputation combines useful approved contributions, completed projects, verified client feedback, moderation history, responsiveness and relevant expertise. No simple star-only score, review-count ordering or public leaderboard. Badges include New professional, Helpful contributor, Verified project and Experienced in this topic. Helpful participation should allow a newcomer to build visibility before paid leads. Community popularity cannot override project fit, and one professional must not monopolize all requests.

## Fair matching and private preferred first-look

Public wording is Suggested matches or Professionals who may fit this request. Review examples show four plausible matches, not one winner. No best, neutral-ranking or top-ranked claims. Fit includes project type, area, availability, size and expertise. Participation evidence, rotation and a newcomer opportunity are review aids. No exact ranking formula or private preference is exposed in public UI/DTOs. This scaffold intentionally proposes a slate for a human; it does not substantiate production fairness or availability.

private-matching.mjs is private planning code with admin capability checks and no HTTP route. It filters generic eligibility, considers rotation/newcomer opportunity and returns manual-review candidates. It sends nothing, creates no offer and assigns nobody. The real private provider configuration must remain in secrets or a separate private store; provider-rules.example.json contains generic unavailable examples only.

A preferred provider may receive a private first look only after an administrator approves an offer. Rules may include type, broad area, maximum project size, short/one-day preference, availability and a bounded accept/decline window. The proposal does not start that window. An approved offer would need an audited start/deadline, accepted/declined/unavailable/expired outcome, contact permission and separately approved delivery implementation. Decline, unavailability or expiry produces a fallback slate for another manual review; never an automatic offer/contact. Public profiles, match cards and thread responses never identify who receives first look. Private rules, provider keys and offer windows are excluded from public DTOs.

## Social roles and hidden preparation

Website communities own canonical questions, answers, professional participation and private lead requests. Facebook Page is for announcements and distribution of approved content. Facebook Group is for broad discussion and traffic acquisition. Discord may later support real-time active-member and technical/maker discussion. Site origins stay canonical.

Empty Facebook Page/Group and Discord invite placeholders are hidden behind independent false flags. HTTPS hostname/path validation rejects unsafe links. Local review components demonstrate a Facebook share URL, a copyable Group post package, an unconnected Discord discussion action and an OG preview. Buttons only show/copy local text: no external navigation/posting or API call. No accounts, credentials, Meta API, bots, webhooks or auto-posting are created. Real thread OG metadata must describe actual approved content on the canonical vertical.

## Unchanged blockers

All prior privacy, consent withdrawal, minors, retention/deletion, private admin authentication and scheduled-polling checks remain required. No Worker deployment, D1 migration, production queue or task. No email/phone/WhatsApp collection, publication, routing or paid service. LearnWithLev HTTPS remains a launch blocker; no DNS/CNAME/domain/certificate change is authorized. Preserve the exact hero PNG, parent landing pages, and all TikTok/AIVMeta Publisher configuration. Ready for visual review only.
