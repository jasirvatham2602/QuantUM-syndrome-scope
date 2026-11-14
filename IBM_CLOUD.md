# Deploy to IBM Cloud Code Engine

The repository includes a container definition that serves SyndromeScope on port 8080, which is compatible with IBM Cloud Code Engine.

## One-time setup

1. Install the IBM Cloud CLI and Code Engine plugin.
2. Log in and select the desired IBM Cloud account and region.
3. Create or select a Code Engine project.

## Build and deploy from source

```sh
ibmcloud login
ibmcloud target -r us-south
ibmcloud ce project create --name syndrome-scope
ibmcloud ce project select --name syndrome-scope
ibmcloud ce application create --name syndrome-scope --build-source . --port 8080 \
  --env APPID_OAUTH_SERVER_URL="$APPID_OAUTH_SERVER_URL" \
  --env APPID_CLIENT_ID="$APPID_CLIENT_ID" \
  --env APPID_CLIENT_SECRET="$APPID_CLIENT_SECRET" \
  --env APP_BASE_URL="$APP_BASE_URL" \
  --env SESSION_SECRET="$SESSION_SECRET"
```

After the build completes, Code Engine returns the public application URL.

The container protects the complete app with IBM Cloud App ID's OAuth 2.0 authorization-code flow. Google is enabled as the identity provider in the App ID dashboard. Store the client secret and session secret as Code Engine secrets for a production deployment rather than passing them as literal shell values.

For local interface testing without authentication, run with `AUTH_DISABLED=true`.

## Planned Qiskit and IBM Quantum service

The current prototype performs parity checks and greedy decoding locally. A future Python/FastAPI service will run Qiskit simulations asynchronously and return syndrome histories to the existing interface.

Code Engine will remain the classical application layer. Eligible small circuits can be submitted separately to IBM Quantum Compute through `qiskit-ibm-runtime`; hosting the game on Code Engine does not itself execute circuits on a QPU. Store IBM Quantum credentials in Code Engine secrets and never in source control.
