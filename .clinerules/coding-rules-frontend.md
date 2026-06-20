# Frontend Coding Rules

## Language and framework
- React 18 with TypeScript in strict mode. No `any` — if the type is unknown use `unknown` and
  narrow it explicitly. All component props are typed with an explicit interface or record type.
- Functional components and hooks only. No class components.
- Vite as the build tool. No changes to `vite.config.ts` without a clear reason.

## Component design

**Single Responsibility**
Each component renders one concern. A page component composes smaller components — it does not
contain raw JSX for every UI detail. A `TicTacToeBoard` renders the board; it does not manage
WebSocket subscriptions. A hook manages side effects; it does not return JSX. If a component file
exceeds ~150 lines, it is likely doing too much.

**Dumb components, smart hooks**
Components are as stateless as possible. Business logic, data fetching, and WebSocket
communication live in hooks. A component receives data and callbacks as props and renders them.
This makes components trivially testable and reusable.

**Open/Closed for UI**
New game boards are added by creating a new board component (e.g. `AzulBoard.tsx`) and registering
it in a `gameType → component` map in `GamePage`. No existing component is modified to accommodate
a new game.

**Props over context**
Reach for context only when a value is truly global (auth, STOMP client). Everything else is passed
as props. Deeply nested prop drilling is a signal to extract a subcomponent or a hook, not to add
a new context.

## Hooks

**One responsibility per hook**
`useStompClient` manages the WebSocket connection. `useGameState` manages game state updates for
a session. `useAuth` exposes auth context. Hooks do not merge unrelated concerns.

**Stable references**
Callbacks passed to hooks or child components are wrapped in `useCallback`. Derived values are
wrapped in `useMemo` when their computation is non-trivial. This prevents unnecessary re-renders
and effect re-runs.

**Cleanup**
Every `useEffect` that creates a subscription, timer, or listener returns a cleanup function.
STOMP subscriptions are unsubscribed on unmount. No memory leaks.

## TypeScript

**Types live in `src/types/index.ts`**
All types that correspond to API contracts (message shapes, DTOs) are defined once in the shared
types file and imported from there. No inline type definitions for API shapes inside components
or hooks.

**Discriminated unions for variant state**
Model loading/error/success states as discriminated unions rather than multiple booleans:
```ts
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }
```
This makes impossible states impossible.

**No type assertions**
Avoid `as SomeType` except at the boundary where untyped external data (e.g. a raw WebSocket
message) is first parsed. Validate the shape at that boundary and narrow from `unknown`.

## General principles

**Immutable state updates**
Never mutate state directly. Always produce new objects/arrays. Treat React state the same way the
backend treats game state: immutable, replaced on update.

**Meaningful names**
Components are named for what they represent in the UI domain, not their technical role.
`TicTacToeBoard` not `GameGrid`. `useGameState` not `useWebSocketHandler`. Booleans are prefixed
with `is` or `has`.

**No magic values**
String literals that represent domain concepts (game types, status values, STOMP destinations) are
defined as constants. No bare `"TICTACTOE"` or `"/topic/lobby"` strings scattered through
components.

**Error boundaries**
User-visible errors are caught and shown gracefully. WebSocket errors and failed fetches display a
human-readable message, never a raw exception or console-only log. Use the error toast for
transient errors and dedicated UI states for persistent ones.

**Abstractions at the right level**
There are two games: TicTacToe and Azul. The pattern for plugging in a new game board is
established and must be formalised. `GamePage` resolves the correct board component from a
`gameType → component` map; adding a third game means adding one entry to that map and a new
board component — no existing code is modified. Do not over-generalise beyond what the two
existing games actually have in common.

**Colocation**
Keep things close to where they are used. A helper function used only inside one hook lives in
that hook's file. Move it to a shared location only when a second consumer needs it.
