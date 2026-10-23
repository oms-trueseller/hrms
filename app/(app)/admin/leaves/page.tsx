"use client";

import AdminOnly from "@/components/AdminOnly";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { useUsers } from "@/lib/auth";
import { leaveDays, setLeaveStatus, useLeaves } from "@/lib/leaves";
import { formatDate } from "@/lib/time";

export default function LeaveApprovalsPage() {
  const users = useUsers();
  const { leaves } = useLeaves(true);
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? "Unknown";
  const sorted = leaves; // the server already sends pending first, newest first within each group

  return (
    <AdminOnly>
      <PageHeader title="Leave approvals" subtitle={`${leaves.filter((l) => l.status === "pending").length} pending`} />
      <section className="card p-0">
        {sorted.length === 0 ? (
          <Empty>No leave requests.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border">
                <tr>
                  <th className="th">Employee</th>
                  <th className="th">Type</th>
                  <th className="th">Dates</th>
                  <th className="th">Reason</th>
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((l) => (
                  <tr key={l.id}>
                    <td className="td font-medium">{name(l.userId ?? "")}</td>
                    <td className="td">{l.type} · {leaveDays(l)}d</td>
                    <td className="td">{formatDate(l.from)}{l.to !== l.from && ` – ${formatDate(l.to)}`}</td>
                    <td className="td max-w-56 truncate" title={l.reason}>{l.reason}</td>
                    <td className="td"><Badge>{l.status}</Badge></td>
                    <td className="td whitespace-nowrap text-right">
                      {l.status === "pending" ? (
                        <>
                          <button className="btn btn-primary mr-2 px-3 py-1" onClick={() => setLeaveStatus(l.id, "approved")}>Approve</button>
                          <button className="btn px-3 py-1" onClick={() => setLeaveStatus(l.id, "rejected")}>Reject</button>
                        </>
                      ) : (
                        <button className="text-sm text-muted" onClick={() => setLeaveStatus(l.id, "pending")}>Reopen</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminOnly>
  );
}
