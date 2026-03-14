"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  FolderOpen,
  CreditCard,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { adminAPI, AdminUserDetail } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<"activate" | "deactivate" | null>(null);
  const [reason, setReason] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminAPI.getUserDetail(userId);
        setUser(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleStatusUpdate = async () => {
    if (!statusAction || !reason.trim()) return;
    setUpdating(true);
    try {
      await adminAPI.updateUserStatus(
        userId,
        statusAction === "activate",
        reason
      );
      // Refresh user data
      const updated = await adminAPI.getUserDetail(userId);
      setUser(updated);
      setStatusAction(null);
      setReason("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-zinc-800 rounded w-32 animate-pulse" />
        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-5 bg-zinc-800 rounded w-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center py-20">
        <p className="text-red-400 mb-4">{error || "User not found"}</p>
        <Button onClick={() => router.back()} variant="ghost" className="text-zinc-400">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/superadmin/users"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Users
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">
              {user.first_name} {user.last_name}
            </h1>
            {user.is_admin && (
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                {user.admin_role || "Admin"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500 mt-1">{user.email}</p>
        </div>
        <div>
          {user.is_active ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Info */}
        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5 space-y-4">
          <h3 className="text-sm font-medium text-zinc-400">Account</h3>
          <div className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="Phone" value={user.phone || "Not set"} />
            <InfoRow
              icon={ShieldCheck}
              label="Email Verified"
              value={user.email_verified ? "Yes" : "No"}
            />
            <InfoRow
              icon={Shield}
              label="MFA"
              value={user.mfa_enabled ? "Enabled" : "Disabled"}
            />
            <InfoRow
              icon={FolderOpen}
              label="Family Files"
              value={String(user.family_file_count)}
            />
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5 space-y-4">
          <h3 className="text-sm font-medium text-zinc-400">Subscription</h3>
          {user.profile ? (
            <div className="space-y-3">
              <InfoRow
                icon={CreditCard}
                label="Tier"
                value={(user.profile.subscription_tier || "starter").replace(/_/g, " ")}
              />
              <InfoRow
                icon={CreditCard}
                label="Status"
                value={user.profile.subscription_status || "none"}
              />
              <InfoRow
                icon={CreditCard}
                label="Stripe Customer"
                value={user.profile.stripe_customer_id || "None"}
                mono
              />
              <InfoRow
                icon={CreditCard}
                label="Stripe Sub"
                value={user.profile.stripe_subscription_id || "None"}
                mono
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No profile data</p>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Activity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Created</p>
            <p className="text-sm text-zinc-300">{formatDate(user.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Last Login</p>
            <p className="text-sm text-zinc-300">{formatDate(user.last_login)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Last Active</p>
            <p className="text-sm text-zinc-300">{formatDate(user.last_active)}</p>
          </div>
        </div>
      </div>

      {/* Status Actions */}
      <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Account Actions</h3>

        {statusAction ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-200">
                {statusAction === "deactivate"
                  ? "This will prevent the user from logging in. All their data will be preserved."
                  : "This will restore the user's access to the platform."}
              </p>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Reason (required for audit)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for status change..."
                className="w-full px-3 py-2 bg-[#0f1117] border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleStatusUpdate}
                disabled={!reason.trim() || updating}
                className={`text-sm ${
                  statusAction === "deactivate"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {updating
                  ? "Updating..."
                  : statusAction === "deactivate"
                  ? "Deactivate Account"
                  : "Activate Account"}
              </Button>
              <Button
                onClick={() => {
                  setStatusAction(null);
                  setReason("");
                }}
                variant="ghost"
                className="text-zinc-400"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            {user.is_active ? (
              <Button
                onClick={() => setStatusAction("deactivate")}
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate User
              </Button>
            ) : (
              <Button
                onClick={() => setStatusAction("activate")}
                variant="ghost"
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Activate User
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span
        className={`text-sm text-zinc-200 ${mono ? "font-mono text-xs" : ""} capitalize`}
      >
        {value}
      </span>
    </div>
  );
}
