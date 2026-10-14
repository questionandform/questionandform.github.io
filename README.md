# Question & Form — agents & tools

A static, editorial hub for a growing family of useful AI-assisted tools.

- THINK — learning, logic, mathematics and puzzles, by LearnWithLev.
- SHAPE — spatial/design exploration, by 3D Design.
- MAKE — practical home/maker planning, by The Maker Home.
- ARRANGE, PUBLISH and FORM are explicitly coming soon, with no active links.

The approved QF hero monogram and warm cream / charcoal / terracotta identity are retained. The hero invites visitors to start with a question and leave with something useful. Cards route to the brand-specific /ask experiences rather than unrelated company landing pages.

## Runtime status

The /ask pages support examples, question drafting, validation and a prepared delayed-answer/receipt transport. Their public configuration has an empty API origin. No request is submitted, no email is collected, and no automated answer is shown in the current preview.

The backend is a disabled Cloudflare Worker/D1 scaffold under backend/. It includes private GitHub queue adapters and a future ChatGPT scheduled-task prompt; it is not a deployed service. See backend/README.md for the API, safety boundaries, activation steps, costs, and email prerequisites.

## Local preview

Serve the repository root with a static HTTP server, for example `python -m http.server 8000`. No build step, framework or front-end dependencies.

## Deployment

Repository: questionandform/questionandform.github.io
GitHub Pages source: main, repository root
Preview: https://questionandform.github.io/

There is no CNAME or canonical URL for the future questionandform.com domain. Do not change DNS or custom-domain settings as part of this work.

Backend source and placeholders are public, but contain no production secrets or queue data. Never commit .dev.vars, environment files, databases, question exports, credentials or runtime receipts.
