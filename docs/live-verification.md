# Real SDK verification

Verified locally on **2026-11-02** with Node **24.21.0**, installed SDK **0.3.310**, and API-accessible model **claude-haiku-5-5**. The key stayed in the ignored local `.env` and the server-side child environment. No key is included in this repository.

| Actual run                          | TaskCreate / Update / Get / List | Host denials | Protected handler | Final SDK result          | Behavior checks |                   Cost USD |
| ----------------------------------- | -------------------------------- | -----------: | ----------------: | ------------------------- | --------------- | -------------------------: |
| Ordinary query, task migration      | 1 / 1 / 1 / 1                    |            0 |                 0 | success                   | passed          |                0.001165865 |
| Ordinary query, protected note      | 0 / 0 / 0 / 0                    |            1 |                 0 | success explaining denial | passed          |                0.000342200 |
| Alpha prewarm + claim, CLI          | 1 / 1 / 1 / 1                    |            0 |                 0 | success                   | passed          |                0.000732735 |
| Alpha prewarm + claim, browser host | 1 / 1 / 1 / 1                    |            0 |                 0 | success                   | passed          | 0.001158 (rounded display) |

For each task run, TaskGet and TaskList confirmed the newly created task was completed. No TodoWrite call was used. Hooks observed actual tool outcomes and enforced ownership of reads/updates. The protected-note run reached the separate host denial policy; its handler never executed. The final explanation accurately described the denial.

The CLI alpha spare accepted one claim and reported approximately 274 ms parked; the browser run reported 335 ms parked. These are observations, not a cold-versus-warm performance comparison. The code closed the query and spare and released its server/timer/listener resources. Refused claims and `option_not_applied` were tested with injected peers, not induced against the real model. The host has no automatic retry path.

The actual `resolveSettings()` helper was also run against project-plus-local fixtures. The selected projection showed `model: lesson-fixture-model`, raw mode `dontAsk`, permission provenance `local`, the fixture Bash deny present, and project/local source names. That diagnostic did not configure a live query. Host settings or managed policy can change the outcome on another workstation.

The actual package export check confirmed all four task names and TodoWrite in `BUILTIN_TOOL_NAMES`, root `prewarm` and `resolveSettings` functions, and absence of `unstable_v2_createSession`. The repository's executable references compile against the pinned declarations.

The browser verification reported zero page errors. Desktop and 390-pixel phone layouts were inspected. Development requests for `.env` and `.local/capture.mjs` returned HTTP 403. Screenshots in this directory show actual UI states; practice output elsewhere is explicitly synthetic.

Costs, counts and model behavior can vary. Unit/injected/browser practice tests establish application behavior separately from these real API runs. Neither fixture results nor manual checklist items certify a student's submitted code; the live scenarios verify this repository's fixed reference host.
