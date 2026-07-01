<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## React Hook Order Constraint
* Always place state hook declarations (`useState`, `useRef`, `useMemo`) and side-effect hooks (`useEffect`, `useCallback`) at the very top of React components.
* Never place an early return (e.g. `if (!data) return ...`) above any hook declarations.
* If parameters used inside hooks might be null/undefined due to data loading, make the hook dependencies and logic null-safe instead of bypassing the hook via early returns.

## AI LLM Endpoint Resilience
* When integrating chat/LLM endpoints in the developer sandbox, always provide a fallback strategy.
* If a preferred API client (e.g. Groq) fails due to rate limits (429), authorization errors (401), or server demand, automatically catch the error, log a warning, and fall back to the active secondary client (e.g. Gemini) to ensure a robust user experience.
