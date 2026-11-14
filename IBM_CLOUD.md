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
ibmcloud ce application create --name syndrome-scope --build-source . --port 8080
```

After the build completes, Code Engine returns the public application URL.

## Planned Qiskit service

The current prototype performs parity checks and greedy decoding in the browser. A future Python/FastAPI service can run Qiskit simulations asynchronously and return syndrome histories to the existing interface.
