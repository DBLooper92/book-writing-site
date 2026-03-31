import { NextResponse } from "next/server";

import {
  deleteProjectForAuthenticatedUser,
  ProfileSecurityError,
} from "@/lib/security/profile-security";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const password = typeof body?.password === "string" ? body.password : "";

  try {
    const result = await deleteProjectForAuthenticatedUser({
      password,
      projectId,
    });

    return NextResponse.json({
      ...result,
      message: result.wasActiveProject
        ? result.nextActiveProjectId
          ? `Deleted ${result.deletedProjectTitle}. The active project was switched automatically.`
          : `Deleted ${result.deletedProjectTitle}. No projects remain on this account.`
        : `Deleted ${result.deletedProjectTitle}.`,
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
            : "Unable to delete this project.",
      },
      { status: 500 }
    );
  }
}
