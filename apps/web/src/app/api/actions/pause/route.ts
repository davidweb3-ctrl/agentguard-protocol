import { buildSetPauseRawInstruction } from "@agentguard/sdk";
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import { NextRequest } from "next/server";

const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
  "Content-Type": "application/json",
};

interface ActionPostBody {
  account?: string;
}

export async function GET(request: NextRequest) {
  let agentProfile: PublicKey | null = null;

  try {
    agentProfile = getAgentProfile(request);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Invalid agent profile.",
      400
    );
  }

  const actionUrl = new URL("/api/actions/pause", request.nextUrl.origin);

  if (agentProfile) {
    actionUrl.searchParams.set("agentProfile", agentProfile.toBase58());
  }

  return Response.json(
    {
      title: "Pause AgentGuard Agent",
      icon: new URL("/agentguard-action-icon.svg", request.nextUrl.origin),
      description:
        "Create an owner-signed transaction that pauses an AgentGuard policy vault before the agent can spend again.",
      label: "Pause agent",
      links: {
        actions: [
          {
            label: "Pause agent",
            href: actionUrl.toString(),
          },
        ],
      },
      disabled: !agentProfile,
      error: agentProfile
        ? undefined
        : {
            message:
              "Missing agentProfile query parameter or demo agent profile environment variable.",
          },
    },
    { headers: ACTIONS_CORS_HEADERS }
  );
}

export async function POST(request: NextRequest) {
  try {
    const agentProfile = getAgentProfile(request);

    if (!agentProfile) {
      return errorResponse(
        "Missing agentProfile query parameter or demo agent profile environment variable.",
        400
      );
    }

    const body = (await request.json()) as ActionPostBody;

    if (!body.account) {
      return errorResponse("Missing owner account in request body.", 400);
    }

    const owner = new PublicKey(body.account);
    const programId = getProgramId(request);
    const connection = new Connection(getRpcUrl(), "confirmed");
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    const instruction = buildSetPauseRawInstruction({
      owner,
      agentProfile,
      paused: true,
      programId,
    });
    const transaction = new Transaction({
      feePayer: owner,
      blockhash,
      lastValidBlockHeight,
    }).add(instruction);
    const serializedTransaction = transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString("base64");

    return Response.json(
      {
        transaction: serializedTransaction,
        message: "Sign to pause this AgentGuard agent.",
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build pause action.";

    return errorResponse(message, 400);
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}

function getAgentProfile(request: NextRequest) {
  const agentProfile =
    request.nextUrl.searchParams.get("agentProfile") ??
    process.env.NEXT_PUBLIC_DEMO_AGENT_PROFILE ??
    process.env.DEMO_AGENT_PROFILE;

  return agentProfile ? new PublicKey(agentProfile) : null;
}

function getProgramId(request: NextRequest) {
  const programId =
    request.nextUrl.searchParams.get("programId") ??
    process.env.NEXT_PUBLIC_AGENTGUARD_PROGRAM_ID ??
    process.env.DEMO_AGENTGUARD_PROGRAM_ID;

  if (!programId) {
    throw new Error("Missing AgentGuard program id.");
  }

  return new PublicKey(programId);
}

function getRpcUrl() {
  return (
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    process.env.ANCHOR_PROVIDER_URL ??
    clusterApiUrl("devnet")
  );
}

function errorResponse(message: string, status: number) {
  return Response.json(
    {
      message,
    },
    {
      status,
      headers: ACTIONS_CORS_HEADERS,
    }
  );
}
