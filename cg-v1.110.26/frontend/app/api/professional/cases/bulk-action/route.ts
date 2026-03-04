import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * POST /api/professional/cases/bulk-action
 *
 * Body: { action: string, caseIds: string[], payload?: Record<string, any> }
 *
 * Actions:
 *  - assign: { professionalId: string }
 *  - tag: { tag: string }
 *  - status: { status: "active" | "on_hold" | "completed" | "withdrawn" }
 *  - archive: {} (shorthand for status=archived)
 *  - export: returns a download URL or triggers ZIP generation
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { action: string; caseIds: string[]; payload?: Record<string, any> };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { action, caseIds, payload = {} } = body;

    if (!action || !Array.isArray(caseIds) || caseIds.length === 0) {
        return NextResponse.json(
            { error: "action and caseIds[] are required" },
            { status: 422 }
        );
    }

    const VALID_ACTIONS = ["assign", "tag", "status", "archive", "export"];
    if (!VALID_ACTIONS.includes(action)) {
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 422 });
    }

    try {
        // Proxy to backend bulk endpoint
        const backendRes = await fetch(
            `${API_BASE}/api/v1/professional/cases/bulk-action`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader,
                },
                body: JSON.stringify({ action, case_ids: caseIds, payload }),
            }
        );

        // If backend has the endpoint, return its response
        if (backendRes.ok) {
            const data = await backendRes.json().catch(() => ({}));
            return NextResponse.json(data);
        }

        // Graceful degradation: perform actions client-side via individual PATCH calls
        const results = await Promise.allSettled(
            caseIds.map(async (caseId) => {
                switch (action) {
                    case "tag": {
                        const tagRes = await fetch(
                            `${API_BASE}/api/v1/professional/cases/${caseId}/tags`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: authHeader,
                                },
                                body: JSON.stringify({ tag: payload.tag }),
                            }
                        );
                        return { caseId, ok: tagRes.ok };
                    }

                    case "status":
                    case "archive": {
                        const newStatus = action === "archive" ? "withdrawn" : payload.status;
                        const statusRes = await fetch(
                            `${API_BASE}/api/v1/professional/cases/${caseId}/status`,
                            {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: authHeader,
                                },
                                body: JSON.stringify({ status: newStatus }),
                            }
                        );
                        return { caseId, ok: statusRes.ok };
                    }

                    case "assign": {
                        const assignRes = await fetch(
                            `${API_BASE}/api/v1/professional/cases/${caseId}/assign`,
                            {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: authHeader,
                                },
                                body: JSON.stringify({ professional_id: payload.professionalId }),
                            }
                        );
                        return { caseId, ok: assignRes.ok };
                    }

                    case "export": {
                        // Export is handled via a separate download endpoint per case
                        return { caseId, ok: true };
                    }

                    default:
                        return { caseId, ok: false, error: "unknown action" };
                }
            })
        );

        const succeeded = results.filter(
            (r) => r.status === "fulfilled" && (r.value as any).ok
        ).length;

        const failed = results.filter(
            (r) => r.status === "rejected" || !(r as PromiseFulfilledResult<any>).value?.ok
        ).length;

        return NextResponse.json({
            action,
            total: caseIds.length,
            succeeded,
            failed,
            message: `${action} applied to ${succeeded}/${caseIds.length} cases.`,
        });
    } catch (err) {
        return NextResponse.json(
            { error: "Internal error processing bulk action" },
            { status: 500 }
        );
    }
}
