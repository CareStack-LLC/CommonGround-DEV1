"use client";

import { useState, useEffect } from "react";
import { useProfessionalAuth } from "../../layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  MoreVertical,
  Mail,
  Shield,
  Clock,
  AlertTriangle,
  Check,
  X,
  ArrowLeft,
  RefreshCw,
  Trash2,
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
  owner: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  attorney: "bg-emerald-100 text-emerald-800",
  paralegal: "bg-cyan-100 text-cyan-800",
  intake: "bg-amber-100 text-amber-800",
  readonly: "bg-gray-100 text-gray-800",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  invited: "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-800",
  removed: "bg-gray-100 text-gray-800",
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
  const { token, activeFirm, profile } = useProfessionalAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "attorney",
  });

  useEffect(() => {
    if (token && activeFirm) {
      fetchMembers();
    }
  }, [token, activeFirm]);

  const fetchMembers = async () => {
    if (!activeFirm) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
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
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members/invite`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(inviteData),
        }
      );
      if (response.ok) {
        toast({
          title: "Invitation sent",
          description: `An invitation has been sent to ${inviteData.email}`,
        });
        setShowInviteDialog(false);
        setInviteData({ email: "", role: "attorney" });
        fetchMembers();
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to invite member");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send invitation.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!activeFirm) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members/${memberId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (response.ok) {
        toast({ title: "Role updated" });
        fetchMembers();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update role.",
        variant: "destructive",
      });
    }
  };

  const handleResendInvite = async (memberId: string) => {
    if (!activeFirm) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members/${memberId}/resend`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        toast({ title: "Invitation resent" });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to resend invitation.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeFirm) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members/${memberId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        toast({ title: "Member removed" });
        fetchMembers();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to remove member.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  if (!activeFirm) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Firm Selected</h2>
            <p className="text-gray-500">Select a firm from the header to manage team members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/professional/firm" className="hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Firm Settings
            </Link>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Members
          </h1>
          <p className="text-gray-500 mt-1">
            Manage who has access to your firm's cases and data
          </p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your firm. They will receive an email with instructions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={inviteData.role}
                  onValueChange={(value) => setInviteData({ ...inviteData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIRM_ROLES.filter((r) => r.value !== "owner").map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-xs text-gray-500">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={isInviting || !inviteData.email}>
                {isInviting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
                  <div className="h-3 w-32 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Team Members Yet</h2>
            <p className="text-gray-500 mb-4">
              Invite colleagues to collaborate on cases together.
            </p>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Your First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {getInitials(member.professional_name, member.professional_email || member.invite_email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {member.professional_name || member.invite_email || "Pending Invite"}
                        </p>
                        {member.status === "invited" && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {member.professional_email || member.invite_email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={ROLE_COLORS[member.role] || "bg-gray-100"}>
                      {FIRM_ROLES.find((r) => r.value === member.role)?.label || member.role}
                    </Badge>
                    <Badge className={STATUS_COLORS[member.status] || "bg-gray-100"}>
                      {member.status}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role !== "owner" && (
                          <>
                            <DropdownMenuItem disabled>
                              <Shield className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            {FIRM_ROLES.filter((r) => r.value !== "owner" && r.value !== member.role).map(
                              (role) => (
                                <DropdownMenuItem
                                  key={role.value}
                                  onClick={() => handleUpdateRole(member.id, role.value)}
                                  className="pl-8"
                                >
                                  {role.label}
                                </DropdownMenuItem>
                              )
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {member.status === "invited" && (
                          <DropdownMenuItem onClick={() => handleResendInvite(member.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resend Invitation
                          </DropdownMenuItem>
                        )}
                        {member.role !== "owner" && (
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Legend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-700">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIRM_ROLES.map((role) => (
              <div key={role.value} className="flex items-start gap-3">
                <Badge className={ROLE_COLORS[role.value]}>{role.label}</Badge>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
