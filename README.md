# SyndromeScope

An interactive toric surface-code error-chain explorer. Users can toggle physical X errors, inspect stabilizer syndromes, run a greedy minimum-distance decoder, and see whether the combined error and correction produces a logical failure.

## Run locally

Serve the `dist` directory with any static HTTP server and open `index.html`.

## IBM Cloud path

The app is buildless static HTML/CSS/JavaScript and can be placed in an nginx container for IBM Cloud Code Engine. A later FastAPI/Qiskit service can replace the in-browser syndrome and decoder functions while preserving the current interface.
