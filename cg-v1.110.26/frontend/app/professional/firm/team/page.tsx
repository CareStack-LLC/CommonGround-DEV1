"use client";

import { useState, useEffect } from "react";
import { useProfessionalAuth } from "../../layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users, UserPlus, MoreVertical, Shield, Clock, ArrowLeft, RefreshCw, Trash2, Loader2,
} from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FIRM_ROLES = [
  { value: "owner", label: "Owner", description: "Full access, can manage firm settings" },
  { value: "admin", label: "Admin", description: "Manage members, view all cases" },
  { value: "attorney", label: "Attorney", description: "Handle cases, control ARIA" },
  { value: "paralegal", label: "Paralegal", description: "Assist with cases, limited access" },
  { value: "intake", label: "Intake Coordinator", description: "Manage intake sessions" },
  { value: "readonly", label: "Read Only", description: "View cases only" },
];

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-[#3DAA8A]/10 text-[#1E3A4A] border-0",
  admin: "bg-blue-50 text-blue-700 border-0",
  attorney: "bg-[#E8F4F0] text-[#2D8A70] border-0",
  paralegal: "bg-[#F0F7FC] text-[#1E4E6B] border-0",
  intake: "bg-[#FEF7ED] text-[#B8791A] border-0",
  readonly: "bg-slate-100 text-slate-600 border-0",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-[#E8F4F0] text-[#2D8A70] border-0",
  invited: "bg-blue-50 text-blue-700 border-0",
  suspended: "bg-red-50 text-red-700 border-0",
  removed: "bg-slate-100 text-slate-500 border-0",
};

interface Member {
  id: string;
  professional_id: string | null;
  firm_id: string;
  role: string;
  status: string;
  invited_at: string | null;
  joined_at: string | null;
  invited_by: string | null;
  invite_email: string | null;
  professional_name: string | null;
  professional_email: string | null;
  professional_type: string | null;
}

export default function TeamManagementPage() {
  const { token, activeFirm } = useProfessionalAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({ email: "", role: "attorney" });

  useEffect(() => {
    if (token && activeFirm) fetchMembers();
  }, [token, activeFirm]);

  const fetchMembers = async () => {
    if (!activeFirm) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMembers(await res.json());
    } catch (err) {
      console.error("Error fetching members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!activeFirm || !inviteData.email) return;
    setIsInviting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members/invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(inviteData),
      });
      if (res.ok) {
        toast({ title: "Invitation sent", description: `Sent to ${inviteData.email}` });
        setShowInviteDialog(false);
        setInviteData({ email: "", role: "attorney" });
        fetchMembers();
      } else {
        const error = await res.json();
        throw new Error(error.detail || "Failed to invite member");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!activeFirm) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) { toast({ title: "Role updated" }); fetchMembers(); }
    } catch { toast({ title: "Error", description: "Failed to update role.", variant: "destructive" }); }
  };

  const handleResendInvite = async (memberId: string) => {
    if (!activeFirm) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members/${memberId}/resend`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) toast({ title: "Invitation resent" });
    } catch { toast({ title: "Error", description: "Failed to resend.", variant: "destructive" }); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeFirm || !confirm("Are you sure you want to remove this member?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members/${memberId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { toast({ title: "Member removed" }); fetchMembers(); }
    } catch { toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" }); }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.split(" ");
      return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name[0].toUpperCase();
    }
    return email ? email[0].toUpperCase() : "?";
  };

  const isOwner = (member: Member) => member.role === "owner";
  const hasActions = (member: Member) => !isOwner(member);

  if (!activeFirm) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
        <h2 className="text-base font-semibold text-slate-900">No Firm Selected</h2>
        <p className="text-sm text-slate-500 mt-1">Select a firm from the header to manage team members.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/professional/firm" className="inline-flex items-center gap-1.5 text-xs text-[#3DAA8A] hover:text-[#2D8A6E] font-medium mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Firm Settings
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Members</h1>
          <p className="text-sm text-slate-500 mt-1">Manage who has access to your firm's cases and data</p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white rounded-xl shadow-sm gap-2">
              <UserPlus className="h-4 w-4" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>They'll receive an email with instructions to join your firm.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Email Address</Label>
                <Input type="email" placeholder="colleague@example.com" value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="border-slate-200 focus:border-[#3DAA8A]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Role</Label>
                <Select value={inviteData.role} onValueChange={(v) => setInviteData({ ...inviteData, role: v })}>
                  <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIRM_ROLES.filter((r) => r.value !== "owner").map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div><span className="font-medium">{role.label}</span><span className="text-xs text-slate-500 ml-2">{role.description}</span></div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)} className="rounded-lg">Cancel</Button>
              <Button onClick={handleInvite} disabled={isInviting || !inviteData.email}
                className="bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white rounded-lg">
                {isInviting ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Sending...</> : "Send Invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#3DAA8A]" />
        </div>
      ) : members.length === 0 ? (
        <Card className="rounded-2xl border border-slate-200">
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <h2 className="text-base font-semibold text-slate-900">No Team Members Yet</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Invite colleagues to collaborate on cases.</p>
            <Button onClick={() => setShowInviteDialog(true)} className="bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white rounded-xl gap-2">
              <UserPlus className="h-4 w-4" /> Invite Your First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border border-slate-200 overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3DAA8A]/20 to-[#2D6A8F]/20 flex items-center justify-center text-sm font-bold text-[#1E3A4A]">
                      {getInitials(member.professional_name, member.professional_email || member.invite_email)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {member.professional_name || member.invite_email || "Pending Invite"}
                        </p>
                        {member.status === "invited" && (
                          <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 gap-1">
                            <Clock className="h-2.5 w-2.5" /> Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{member.professional_email || member.invite_email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${ROLE_COLORS[member.role] || "bg-slate-100"}`}>
                      {FIRM_ROLES.find((r) => r.value === member.role)?.label || member.role}
                    </Badge>
                    <Badge className={`text-[10px] ${STATUS_COLORS[member.status] || "bg-slate-100"}`}>
                      {member.status}
                    </Badge>

                    {/* Only show menu for non-owners */}
                    {hasActions(member) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem disabled className="text-xs text-slate-400">
                            <Shield className="h-3.5 w-3.5 mr-2" /> Change Role
                          </DropdownMenuItem>
                          {FIRM_ROLES.filter((r) => r.value !== "owner" && r.value !== member.role).map((role) => (
                            <DropdownMenuItem key={role.value} onClick={() => handleUpdateRole(member.id, role.value)} className="pl-8 text-xs">
                              {role.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          {member.status === "invited" && (
                            <DropdownMenuItem onClick={() => handleResendInvite(member.id)} className="text-xs">
                              <RefreshCw className="h-3.5 w-3.5 mr-2" /> Resend Invitation
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleRemoveMember(member.id)} className="text-red-600 text-xs">
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div className="w-8" /> /* Spacer for owner alignment */
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Legend */}
      <Card className="rounded-2xl border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-700">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FIRM_ROLES.map((role) => (
              <div key={role.value} className="flex items-center gap-2.5">
                <Badge className={`text-[10px] ${ROLE_COLORS[role.value]}`}>{role.label}</Badge>
                <p className="text-xs text-slate-500">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
