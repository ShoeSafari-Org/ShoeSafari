import { notFound } from "next/navigation";
import { getEnvironmentDiagnostics, isDevelopment } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function DevelopmentConfigPage() {
  if (!isDevelopment()) {
    notFound();
  }

  const diagnostics = getEnvironmentDiagnostics();
  const missingCount = diagnostics.requiredVariables.filter(({ configured }) => !configured).length;

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-6 py-12">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Development only
        </p>
        <h1 className="mt-2 text-3xl font-bold">Configuration diagnostics</h1>
        <p className="mt-3 text-gray-700">
          This protected page reports safe, immutable deployment metadata and configuration
          presence. It never displays secrets and is not a deployment health endpoint.
        </p>
      </div>

      <section aria-labelledby="deployment-metadata-heading">
        <h2 id="deployment-metadata-heading" className="text-xl font-semibold">
          Deployment metadata
        </h2>
        <dl className="mt-4 divide-y rounded border">
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt>Commit</dt>
            <dd className="font-mono text-sm">{diagnostics.deployment.commitSha}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt>Deployment</dt>
            <dd className="font-mono text-sm">{diagnostics.deployment.deploymentId}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt>Environment</dt>
            <dd>{diagnostics.deployment.environment}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt>RPC</dt>
            <dd className="font-mono text-sm">{diagnostics.deployment.rpcUrl}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt>Checkout contract</dt>
            <dd className="font-mono text-sm">{diagnostics.deployment.checkoutContractId}</dd>
          </div>
          {diagnostics.deployment.tokenContracts.map(({ symbol, contractId }) => (
            <div key={symbol} className="flex justify-between gap-4 px-4 py-3">
              <dt>{symbol} token contract</dt>
              <dd className="font-mono text-sm">{contractId}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="stellar-network-heading">
        <h2 id="stellar-network-heading" className="text-xl font-semibold">
          Stellar network
        </h2>
        <p className="mt-2">
          Selected network: <strong>{diagnostics.stellarNetwork}</strong>
        </p>
      </section>

      <section aria-labelledby="required-config-heading">
        <h2 id="required-config-heading" className="text-xl font-semibold">
          Required configuration
        </h2>
        <p className="mt-2 text-gray-700">
          {missingCount === 0
            ? "All required variables are configured."
            : `${missingCount} required ${missingCount === 1 ? "variable is" : "variables are"} missing. Copy .env.local.example to .env.local and fill in the missing values.`}
        </p>
        <ul className="mt-4 divide-y rounded border">
          {diagnostics.requiredVariables.map(({ name, configured }) => (
            <li key={name} className="flex items-center justify-between gap-4 px-4 py-3">
              <code>{name}</code>
              <span className={configured ? "text-green-700" : "text-red-700"}>
                {configured ? "Configured" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
