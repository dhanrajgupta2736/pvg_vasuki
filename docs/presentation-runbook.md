# VASUKI live demo

Dashboard: http://127.0.0.1:18000 (Oracle through the laptop SSH tunnel).
Demo repository: https://github.com/dhanrajgupta2736/vasuki-security-lab.
n8n: http://127.0.0.1:15678. Keep the tunnel running.
Sample real draft PR: https://github.com/dhanrajgupta2736/vasuki-security-lab/pull/6.
Latest browser Inspect-to-PR run: 67.73 seconds, 11/11 passing, all seven gates passed.

Five recorded Oracle rehearsals all passed. Backend execution averaged 75.21 seconds,
ranging from 45.97 to 96.46 seconds. Laptop polling included transient tunnel interruptions;
`docs/demo/rehearsals.json` preserves backend and observed wall times.

If the tunnel closes, run `./ops/start_presentation.ps1` from PowerShell.
The launcher creates a fresh three-hour managed SSH session when a new
tunnel is needed. Its keys and runtime logs stay in the ignored `.run` folder.

## Three-minute walkthrough

1. Say: “Scanners find bugs. VASUKI turns a finding into a small patch, then
   verifies the security fix and checks that existing behavior still works.”
2. Click “Use hackathon demo repository”, then Inspect. Keep draft PR enabled.
   n8n handles intake. RECON identifies SQL injection, traversal, and missing
   object authorization. The six functional baseline checks pass; the five
   added exploit checks fail on the vulnerable implementation.
3. Watch PROOF record the baseline, then FORGE's actual model and SHIELD's
   repeated source analysis. A rejection repeats patch, review and tests. Open Tests:
   both snapshots use Docker. The same eleven test names remain present.
4. Show all eleven passing after the fixes: authentication bypass, relative
   and absolute traversal, anonymous profile access, and cross-user access
   are blocked. Existing login, own-profile access, and document reads work.
5. Watch HERALD deliver the patched branch and open the draft PR. Show the small implementation diff, commit SHA,
   before/after counts, build results, unchanged test fingerprints, validation
   score, and five fixed exploit checks.
   A person reviews and approves the merge.

Do not merge the lab PR before presenting: its vulnerable main branch makes
each fresh run reproduce the same baseline. A run may reject a model response
or need multiple feedback repairs; the event stream records what happened.
The repair budget is six full cycles. Unresolved runs block publication.

## If the network or model is unavailable

Open a completed run from Run history and show its retained actual evidence
and PR. Keep the sample PR open before presenting. Offline evidence and an
actual screen capture are saved in `docs/demo` after the rehearsals.
Run `./ops/start_offline_demo.ps1`, then open
http://127.0.0.1:18888/offline.html. This page is clearly labelled as a
recorded run and supports test, diff, findings, review, and timeline tabs.
The laptop's bundled lab API is another fallback; its evidence labels the host runner
as `trusted-bundled-process`, and it does not publish a PR.

## Answers judges can verify

- **Why agents / n8n?** The five roles have separate tools and handoffs.
  The reviewer and tester send feedback back to the coder; source review and
  tests repeat until they pass or the repair budget is exhausted. n8n handles intake and status
  polling. The FastAPI orchestrator executes the validation and feedback loop.
- **Hallucinations?** Syntax, preserved functions, bounded diffs, repeated
  findings, unchanged named tests, and actual exploit checks gate publication.
  These checks provide evidence within their coverage; people review the PR.
- **False positives?** Findings show the matching source pattern and CWE.
  In the lab, the exploit succeeds before and is blocked afterward. Rules
  and tests do not establish correctness for every possible input.
- **Languages?** This prototype supports Python / pytest, with narrow native
  Flask / SQLite rules and explicit Python dependency auditing. Semgrep is an
  optional configuration. The measured demo uses the native analyzer.
- **No tests?** Publication is blocked. Missing cases, failed dependency
  installs, runner errors, and regressions also block publication.
- **Score?** Seven executed checks receive equal weight: source re-scan,
  passing patched suite, preserved baseline coverage, passing security tests,
  bounded diff, builds passing, and test-input fingerprints preserved.
  100/100 is a validation checklist, not a probability.
- **Sandbox?** Test containers use UID 1000, no host mounts, dropped
  capabilities, memory/CPU/process limits, and no network during repository installation, builds and tests.
  Dependencies are downloaded as binary wheels before repository code runs.
  The demo image is preloaded and starts with networking disabled. The API
  controls the host Docker socket; this prototype's control plane is trusted
  and is not a hardened multi-tenant service or privileged Docker-in-Docker.
- **Model / privacy?** The verified model is Gemini 2.5 Flash through OCI
  Generative AI in Mumbai, authenticated with the VM's instance principal.
  Do not pitch this deployment as self-hosted Llama or claim that the model
  processes source entirely inside your own tenancy.
- **Backports?** An existing release branch can be selected as the base.
  Automatic adaptation across multiple releases is not implemented.
- **Cost?** Five repeated runs are timed in the rehearsal report. Per-run
  model billing has not been measured; do not invent a price or token count.

The history secret scan found a previously hardcoded n8n demo password.
Current deployment settings do not use it; the tracked history still contains
it. Any previously exposed GitHub token must be rotated after the presentation.
