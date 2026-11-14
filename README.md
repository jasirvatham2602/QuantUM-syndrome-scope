# SyndromeScope

An interactive toric surface-code error-chain explorer. Users can toggle physical X errors, inspect stabilizer syndromes, run a greedy minimum-distance decoder, and see whether the combined error and correction produces a logical failure.

## Run locally

Serve the `dist` directory with any static HTTP server and open `index.html`.

## IBM Cloud deployment

The included `Dockerfile` serves the buildless application through nginx on port 8080 for IBM Cloud Code Engine. See `IBM_CLOUD.md` for deployment instructions. A later FastAPI/Qiskit service can replace the in-browser syndrome and decoder functions while preserving the current interface.
