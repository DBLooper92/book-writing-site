# Project Vision

## Core Intent

BookWritingSite is a personal AI-assisted writing environment for a long-form, multi-book series. It combines:

- a story bible
- a structured worldbuilding database
- a wiki-style reference system
- a timeline manager
- writing support tools
- an AI assistant for brainstorming, summarization, editing, and prose generation

The system is optimized for a single primary author first. Future expansion toward a broader product is allowed, but current design choices should stay simple, low-cost, and maintainable.

## What The Product Should Enable

The app should let the author:

- keep structured canon data as the source of truth
- build deep worldbuilding across many entity types
- track chronology across eras, books, chapters, scenes, and events
- write books non-linearly without losing continuity
- cross-link people, places, factions, items, notes, and events
- move between planning, reference lookup, and prose work quickly
- use AI as an assistant without surrendering canon control

## Intended User Experience

The product should feel like a private wiki plus structured writing workspace, not a generic note dump and not a generic AI chat shell.

Pages should gradually converge toward:

- structured metadata for canon and filtering
- readable wiki-style detail views
- linked references to related entities
- eventually, timeline and book/chapter context

## Canon And AI Boundary

Structured data should own:

- entity identity
- relationship links
- timeline placement
- canon status
- confidence metadata

AI should help with:

- brainstorming possibilities
- turning notes into prose
- editing and rewriting
- summarization
- continuity review based on stored project data

AI should not become the source of truth for canon, schema, or cross-entity integrity.

## Product Constraints

The project should remain:

- single-author first
- low-complexity
- affordable to run
- modular enough to grow
- explicit about implemented behavior versus future intent

## Current Stage

Today, the repo is still in an early infrastructure stage. It already has authenticated project workspaces, an active project concept, a dev seeding flow, and initial Characters, Locations, and Notes slices. The broader story-bible, timeline, book-writing, and AI-writing surfaces are still planned layers, not finished product areas.
