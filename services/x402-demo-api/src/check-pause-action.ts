const DEFAULT_WEB_URL = "http://127.0.0.1:3000";

interface ActionMetadata {
  title?: string;
  label?: string;
  disabled?: boolean;
  links?: {
    actions?: Array<{
      label?: string;
      href?: string;
    }>;
  };
}

interface ActionTransactionResponse {
  transaction?: string;
  message?: string;
}

async function main() {
  const webUrl = trimTrailingSlash(process.env.DEMO_WEB_URL ?? DEFAULT_WEB_URL);
  const owner = requiredEnv("DEMO_OWNER");
  const agentProfile = requiredEnv("DEMO_AGENT_PROFILE");
  const actionUrl = new URL("/api/actions/pause", webUrl);
  actionUrl.searchParams.set("agentProfile", agentProfile);

  const metadataResponse = await fetch(actionUrl);
  const metadata = (await metadataResponse.json()) as ActionMetadata;

  if (!metadataResponse.ok) {
    throw new Error(`Action metadata failed: ${metadataResponse.status}`);
  }

  if (metadata.disabled) {
    throw new Error("Pause action metadata is disabled.");
  }

  if (!metadata.links?.actions?.[0]?.href) {
    throw new Error("Pause action metadata does not include an action link.");
  }

  const transactionResponse = await fetch(actionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account: owner,
    }),
  });
  const transactionBody =
    (await transactionResponse.json()) as ActionTransactionResponse;

  if (!transactionResponse.ok) {
    throw new Error(
      transactionBody.message ??
        `Pause action transaction failed: ${transactionResponse.status}`
    );
  }

  if (!transactionBody.transaction) {
    throw new Error("Pause action response did not include a transaction.");
  }

  console.log(
    JSON.stringify(
      {
        metadata: {
          title: metadata.title,
          label: metadata.label,
          href: metadata.links.actions[0].href,
        },
        transaction: {
          message: transactionBody.message,
          byteLength: Buffer.from(transactionBody.transaction, "base64").length,
        },
      },
      null,
      2
    )
  );
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
