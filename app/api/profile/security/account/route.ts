import { NextResponse } from "next/server";

import {
  deleteAuthenticatedUserAccount,
  ProfileSecurityError,
} from "@/lib/security/profile-security";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  try {
    const result = await deleteAuthenticatedUserAccount({
      password,
    });

    return NextResponse.json({
      ...result,
      message:
        "Deleted the account, auth login, projects, scoped records, and uploaded files.",
    });
  } catch (error) {
    if (error instanceof ProfileSecurityError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete this account.",
      },
      { status: 500 }
    );
  }
}
