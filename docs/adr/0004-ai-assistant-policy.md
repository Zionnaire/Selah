# 0004. SELAH assistant policy

Status: accepted as the policy to build to. Not yet implemented. Decided on your behalf and open to change.

## Principles

SELAH helps a pastor study and prepare. It does not replace the pastor's judgment, and it never speaks as Scripture.

## Decisions

**Allowance.** 25 questions per signed in account per day, counted on the server. This matches the design. The allowance is a configuration value, not hard coded. The assistant requires an account, because limits and abuse control need an identity. Guests see "Sign in to use the SELAH assistant" and everything else keeps working.

**Grounding.** Answers about Scripture must cite the verses they rest on, read from the user's own device or the server's copy of the public domain text. Every statement is labelled as a Textual observation (what the text says) or an Interpretation (what someone concludes from it). When the evidence is thin, the assistant says so plainly instead of filling the gap. It does not invent quotations, commentary, historical claims or sources.

**Tradition and contested questions.** The default voice is historic, creedal Christianity, treating the Bible as authoritative. On questions where faithful Christians differ (for example baptism, the timing of the end times, spiritual gifts, church government), the assistant presents the main views fairly, names the traditions that hold them, gives each view's strongest supporting passages, and does not declare a winner. On core matters of the historic creeds it is direct. The user's chosen tradition changes the order of sources only, never the conclusions.

**Presentation.** Assistant output always appears in the SELAH style (blue surface, "SELAH suggests" label), never in the Scripture style. Inside a sermon it arrives as a pending block that the user must Accept, Edit first, or Dismiss. Drafting full sections is off by default.

**Care.** The assistant is not a counsellor. If a message suggests self harm, abuse or immediate danger, it responds with brief care, encourages contacting local emergency services and a trusted pastor, and does not attempt to manage the situation.

**Privacy.**
- Questions and answers are **not stored** on the server by default. The server keeps only metadata needed for allowance and cost: account id, time, token counts, response time, outcome.
- Request and response bodies are never written to application logs.
- The user's notes and sermons are sent to the model only when the user asks a question that needs them, and only the relevant excerpt.
- Groq's documentation states inference data is not retained by default, with a limited temporary logging exception of up to 30 days for reliability and abuse investigation, and says Zero Data Retention can be enabled in its Data Controls settings. **Status:** the owner reports having set the data controls in the Groq console on 2026-11-17. This is the owner's confirmation, not independently verified. Before launch, re-read Groq's current Data Controls page and terms, as sources disagreed on whether Zero Data Retention is self serve, and record which setting was applied.
- The Settings page states plainly that questions are not used to train models. Do not publish that sentence until you have confirmed Groq's current terms.

**Model.** Chosen by configuration (`GROQ_MODEL`), selected by evaluation, behind a provider interface so it can be swapped. The Groq key stays on the server.

**Safety against manipulation.** Retrieved text and user documents are treated as data, never as instructions. Responses are length limited. Rate limits apply per account and per address.

## Amendment 2026-11-17: sermon suggestions

The owner decided that SELAH may suggest points, introductions and conclusions inside Sermon Studio, so preparing is faster while the pastor stays the author. Constraints that apply:

- A suggestion is a pending proposal in the SELAH style. Nothing enters the sermon until the pastor presses Add. Before that it can be edited, and each supporting reference can be opened in full from the installed Bible and removed.
- The model proposes references only. The verse text always comes from the Bible on the device, and a reference that does not exist in the canon is dropped before the pastor sees it.
- It uses the sermon's own context: topic, passage, Scripture already added, series and the text written so far. It does not write full sermons or paragraphs, and does not offer doctrinal claims beyond what the cited text supports.
- A guest who tries it is asked to sign in. It needs internet. The daily allowance and the Beta label apply as above.
- This is an intentional, narrow exception to the project rule that SELAH never writes the user's conclusions. Study sections stay free of AI text.

## Launch gate

The assistant ships labelled **Beta** until a qualified person (a pastor or theologian) has reviewed a set of about 50 representative questions and the assistant's answers, covering contested topics, hard texts and pastoral situations. Failing answers are fixed in the instructions or by tighter grounding before the label is removed. This is the same reviewer needed for the Context Explorer, see docs/needs-from-you.md.

## Consequences

The assistant is deliberately constrained. That makes it less impressive in a demo and more trustworthy in a pulpit.
