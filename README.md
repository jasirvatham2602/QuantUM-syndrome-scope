# QuantUM SyndromeScope

A native surface-code decoding game and analysis tool. The player sees syndrome defects—but not the physical error that caused them—and draws a correction that must clear the syndrome without creating a logical loop.

## What is playable now

- Native macOS window powered by Electron
- Challenge and Sandbox modes
- Four generated puzzle difficulties
- Hidden physical X-error chains
- Interactive player-drawn corrections
- Undo, clear, and decoder-powered hints
- Syndrome vector view
- Logical winding detection on a periodic 6 × 8 toric lattice
- Post-attempt reveal with scoring and failure explanations
- A real Qiskit Aer repetition-code lab with logical-state encoding
- Single-qubit error injection, stabilizer measurement, syndrome histograms, and circuit diagrams

The game checks the residual chain:

```text
residual = physical error XOR player correction
```

A correction wins when the residual has zero syndrome and no noncontractible winding around the torus.

## Run the desktop app

Requirements: Node.js 20 or newer, Python 3, `qiskit`, and `qiskit-aer`.

```bash
npm install
npm run desktop
```

## Build a local Mac application

```bash
npm run package:mac
open "release/mac-arm64/QuantUM SyndromeScope.app"
```

This creates an unsigned local application. Public distribution will later require Apple signing and notarization.

## Verify the project

```bash
npm run check
npm run test:desktop
```

The desktop smoke test verifies hidden errors, syndrome extraction, hints, successful correction, and Sandbox behavior.

## Architecture

```text
Electron desktop shell
├── Browser-independent game engine
    ├── toric lattice model
    ├── syndrome extraction
    ├── player correction
    ├── greedy reference decoder
│   └── residual topology classifier
└── Python Qiskit sidecar
    ├── three-data-qubit repetition code
    ├── two stabilizer ancillas
    └── Aer shot simulation
```

The game engine is plain JavaScript, which keeps it portable. It can later move into TypeScript/Rust or be shared with a cloud deployment without changing the surface-code rules.

## IBM Cloud and IBM Quantum roadmap

The local game remains fully usable offline. A future IBM Cloud service will add:

- Google authentication through IBM App ID
- Progress synchronization through IBM Cloudant
- Advanced decoder and simulation jobs on IBM Code Engine
- A Hardware Lab that generates Qiskit circuits and submits eligible experiments to IBM Quantum Compute

IBM Cloud hosting and IBM Quantum execution are separate layers. Code Engine will host the application API and classical decoder. An authenticated backend can optionally submit selected, small Qiskit circuits to an accessible IBM QPU. The full game simulation remains classical.

Never commit IBM Cloud or IBM Quantum credentials. Store them in managed secrets.

## Near-term roadmap

1. Add authored tutorial levels and animations.
2. Persist progress and scores locally.
3. Add minimum-weight perfect matching for comparison.
4. Add a decoder-failure investigation screen.
5. Create the IBM Cloud API boundary.
6. Extend Hardware Lab from Aer to optional IBM Quantum execution.

## Repository

[github.com/jasirvatham2602/QuantUM-syndrome-scope](https://github.com/jasirvatham2602/QuantUM-syndrome-scope)
