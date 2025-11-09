/src
 ├── /lib
 │    ├── /tools
 │    │    ├── getCurrentDate.ts
 │    │    ├── getDayOfWeek.ts
 │    │    ├── index.ts               ← optional registry
 │    │
 │    └── /assistants
 │         ├── baseAssistant.ts       ← common logic (tool chaining, execution)
 │         ├── dateAssistant.ts       ← assistant using date tools only
 │         ├── projectAssistant.ts    ← example: cplace project tools
 │         └── index.ts               ← assistant registry
 ├── /app
 │    └── /api
 │         └── chat.ts


 How the planner-driven flow works (high level)

Backend sends a system prompt + user message to the model and asks it to output a JSON plan: [ { "tool": "getCurrentDate", "args": {} }, { "tool": "getDayOfWeek", "args": { "date": "<from previous>" } } ].

Backend parses that plan and executes each step in sequence, substituting outputs from earlier steps into later steps.

Backend returns either the final tool output (raw) or sends the tool outputs back to the model for a final natural-language answer (depending on per-tool returnRaw flags).

If the model asks for a tool that doesn't exist, backend returns a polite error and can ask the model for an alternative action.