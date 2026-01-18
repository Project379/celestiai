# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is a new project initialized with the GSD (Get Shit Done) workflow system. No application code has been written yet.

## GSD Workflow System

This project uses GSD for structured planning and execution. Key commands:

### Getting Started
- `/gsd:new-project` - Initialize project with brief and configuration
- `/gsd:create-roadmap` - Create roadmap with phases
- `/gsd:plan-phase <number>` - Create detailed plan for a phase
- `/gsd:execute-plan <path>` - Execute a plan file

### During Development
- `/gsd:progress` - Check status and get routed to next action
- `/gsd:resume-work` - Resume from previous session
- `/gsd:debug [issue]` - Systematic debugging with persistent state

### Planning Files Location
All planning artifacts are stored in `.planning/`:
- `PROJECT.md` - Project vision and requirements
- `ROADMAP.md` - Phase breakdown
- `STATE.md` - Project memory and context
- `phases/` - Individual phase plans and summaries

## Build Commands

Once the project is initialized, commands will depend on the chosen stack. The settings suggest a Node.js environment:

```bash
npm install          # Install dependencies
npm run dev          # Development server
npm run build        # Production build
npm test             # Run tests
npm run test:e2e     # Run end-to-end tests (Playwright)
```
