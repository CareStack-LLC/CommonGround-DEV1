'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Check,
  Loader2,
  ChevronLeft,
  Mail,
  Phone,
  Edit,
  Trash2,
  Send,
  Link2,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Video,
  PhoneCall,
  MessageCircle,
  Film,
  Shield,
  ChevronDown,
  ChevronUp,
  Settings,
  Calendar,
} from 'lucide-react';
import {
  circleAPI,
  familyFilesAPI,
  myCircleAPI,
  CircleContact,
  CircleContactCreate,
  RelationshipChoice,
  CirclePermission,
  FamilyFileChild,
} from '@/lib/api';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';
import {
  CGCard,
  CGCardHeader,
  CGCardTitle,
  CGCardContent,
  CGButton,
  CGBadge,
  CGAvatar,
  CGEmptyState,
} from '@/components/cg';
import { Sparkles } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

interface PermissionFormData {
  can_video_call: boolean;
  can_voice_call: boolean;
  can_chat: boolean;
  can_theater: boolean;
  allowed_days: number[];
  allowed_start_time: string;
  allowed_end_time: string;
  max_call_duration_minutes: number;
  require_parent_present: boolean;
}

const DEFAULT_PERMISSION: PermissionFormData = {
  can_video_call: true,
  can_voice_call: true,
  can_chat: true,
  can_theater: true,
  allowed_days: [0, 1, 2, 3, 4, 5, 6], // All days
  allowed_start_time: '09:00',
  allowed_end_time: '20:00',
  max_call_duration_minutes: 60,
  require_parent_present: false,
};

export default function CircleManagementPage() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyTitle, setFamilyTitle] = useState<string>('');
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [children, setChildren] = useState<FamilyFileChild[]>([]);
  const [permissions, setPermissions] = useState<CirclePermission[]>([]);
  const [relationshipChoices, setRelationshipChoices] = useState<RelationshipChoice[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<CircleContact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [savingPermission, setSavingPermission] = useState<string | null>(null);

  const [formData, setFormData] = useState<CircleContactCreate>({
    family_file_id: familyFileId,
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    relationship_type: 'other',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [familyFileId]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      const [contactsData, familyData, choices, childrenData, permissionsData] = await Promise.all([
        circleAPI.list(familyFileId, { includeInactive: true }),
        familyFilesAPI.get(familyFileId),
        circleAPI.getRelationshipChoices(),
        familyFilesAPI.getChildren(familyFileId),
        myCircleAPI.listPermissions(familyFileId),
      ]);

      setContacts(contactsData.items);
      setFamilyTitle(familyData.title);
      setRelationshipChoices(choices);
      setChildren(childrenData.items);
      setPermissions(permissionsData.items);
    } catch (err) {
      console.error('Error loading circle data:', err);
      setError('Failed to load circle contacts');
    } finally {
      setIsLoading(false);
    }
  }

  function getPermissionForContactAndChild(contactId: string, childId: string): CirclePermission | undefined {
    return permissions.find(
      (p) => p.circle_contact_id === contactId && p.child_id === childId
    );
  }

  function getPermissionFormData(contactId: string, childId: string): PermissionFormData {
    const existing = getPermissionForContactAndChild(contactId, childId);
    if (existing) {
      return {
        can_video_call: existing.can_video_call,
        can_voice_call: existing.can_voice_call,
        can_chat: existing.can_chat,
        can_theater: existing.can_theater,
        allowed_days: existing.allowed_days || [0, 1, 2, 3, 4, 5, 6],
        allowed_start_time: existing.allowed_start_time || '09:00',
        allowed_end_time: existing.allowed_end_time || '20:00',
        max_call_duration_minutes: existing.max_call_duration_minutes || 60,
        require_parent_present: existing.require_parent_present,
      };
    }
    return { ...DEFAULT_PERMISSION };
  }

  async function handleSavePermission(
    contactId: string,
    childId: string,
    data: PermissionFormData
  ) {
    const key = `${contactId}-${childId}`;
    setSavingPermission(key);

    try {
      const existing = getPermissionForContactAndChild(contactId, childId);

      if (existing) {
        // Update existing permission
        const updated = await myCircleAPI.updatePermission(existing.id, data);
        setPermissions((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      } else {
        // Create new permission
        const created = await myCircleAPI.createPermission({
          circle_contact_id: contactId,
          child_id: childId,
          ...data,
        });
        setPermissions((prev) => [...prev, created]);
      }
    } catch (err) {
      console.error('Error saving permission:', err);
      setError('Failed to save permission');
    } finally {
      setSavingPermission(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.contact_name.trim()) return;

    try {
      setIsSubmitting(true);

      if (editingContact) {
        const updated = await circleAPI.update(editingContact.id, {
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          relationship_type: formData.relationship_type,
          notes: formData.notes,
        });
        setContacts((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      } else {
        const newContact = await circleAPI.create({
          ...formData,
          family_file_id: familyFileId,
        });
        setContacts((prev) => [...prev, newContact]);
      }

      resetForm();
    } catch (err) {
      console.error('Error saving contact:', err);
      setError('Failed to save contact');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(contactId: string, approved: boolean) {
    try {
      const updated = await circleAPI.approve(contactId, approved);
      setContacts((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (err) {
      console.error('Error updating approval:', err);
    }
  }

  async function handleDelete(contactId: string) {
    if (!confirm('Are you sure you want to remove this contact?')) return;

    try {
      await circleAPI.delete(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err) {
      console.error('Error deleting contact:', err);
    }
  }

  async function handleSendInvite(contactId: string) {
    try {
      // Use the correct endpoint that creates a CircleUser and returns the invite URL
      const result = await myCircleAPI.inviteExistingCircleUser(contactId);

      // Copy the invite URL to clipboard
      if (result.invite_url) {
        await navigator.clipboard.writeText(result.invite_url);
        alert(`Invite link copied to clipboard!\n\n${result.invite_url}`);
      } else {
        alert('Invite created but no URL returned');
      }
    } catch (err: any) {
      console.error('Error sending invite:', err);
      // If invite already exists, try to show a helpful message
      if (err?.message?.includes('already')) {
        alert('An invite has already been sent to this contact. Check their email or ask them to check their spam folder.');
      } else {
        alert(err?.message || 'Failed to create invite');
      }
    }
  }

  function startEdit(contact: CircleContact) {
    setEditingContact(contact);
    setFormData({
      family_file_id: familyFileId,
      contact_name: contact.contact_name,
      contact_email: contact.contact_email || '',
      contact_phone: contact.contact_phone || '',
      relationship_type: contact.relationship_type,
      notes: contact.notes || '',
    });
    setShowAddForm(true);
  }

  function resetForm() {
    setShowAddForm(false);
    setEditingContact(null);
    setFormData({
      family_file_id: familyFileId,
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      relationship_type: 'other',
      notes: '',
    });
  }

  function getApprovalStatus(contact: CircleContact) {
    if (contact.is_fully_approved) {
      return { icon: CheckCircle, color: 'text-cg-success', text: 'Fully Approved' };
    }
    if (contact.is_partially_approved) {
      return { icon: Clock, color: 'text-cg-amber', text: 'Pending Approval' };
    }
    return { icon: AlertCircle, color: 'text-muted-foreground', text: 'Not Approved' };
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-cg-background">
          <Navigation />
          <div className="flex flex-col items-center justify-center pt-32">
            <div className="w-16 h-16 rounded-full bg-cg-sage-subtle flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-cg-sage animate-pulse" />
            </div>
            <p className="mt-4 text-muted-foreground font-medium">Loading Circle...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-cg-background pb-20 lg:pb-0">
        <Navigation />

        <PageContainer>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <Users className="h-5 w-5 text-cg-sage" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">My Circle</h1>
                <p className="text-sm text-muted-foreground">{familyTitle}</p>
              </div>
            </div>
            <CGButton
              variant="primary"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </CGButton>
          </div>

          {error && (
            <CGCard variant="default" className="mb-6 border-cg-error/30 bg-cg-error-subtle">
              <CGCardContent className="py-4">
                <p className="text-cg-error font-medium">{error}</p>
              </CGCardContent>
            </CGCard>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <CGCard variant="elevated" className="mb-6">
              <CGCardHeader>
                <CGCardTitle>
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </CGCardTitle>
              </CGCardHeader>
              <CGCardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.contact_name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, contact_name: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Relationship
                      </label>
                      <select
                        value={formData.relationship_type}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, relationship_type: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent"
                      >
                        {relationshipChoices.map((choice) => (
                          <option key={choice.value} value={choice.value}>
                            {choice.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, contact_email: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <CGButton
                      type="button"
                      variant="ghost"
                      onClick={resetForm}
                    >
                      Cancel
                    </CGButton>
                    <CGButton
                      type="submit"
                      variant="primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : editingContact ? (
                        'Save Changes'
                      ) : (
                        'Add Contact'
                      )}
                    </CGButton>
                  </div>
                </form>
              </CGCardContent>
            </CGCard>
          )}

          {/* Contacts List */}
          {contacts.length === 0 ? (
            <CGCard variant="elevated" className="p-8">
              <CGEmptyState
                icon={<Users className="h-8 w-8" />}
                title="No contacts yet"
                description="Add trusted contacts like grandparents, aunts, uncles, or family friends"
                action={{
                  label: "Add Your First Contact",
                  onClick: () => setShowAddForm(true),
                }}
              />
            </CGCard>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact) => {
                const status = getApprovalStatus(contact);
                const StatusIcon = status.icon;
                const isExpanded = expandedContactId === contact.id;

                return (
                  <CGCard
                    key={contact.id}
                    variant="elevated"
                    className={!contact.is_active ? 'opacity-50' : ''}
                  >
                    {/* Contact Header */}
                    <CGCardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <CGAvatar name={contact.contact_name} size="lg" color="sage" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">
                                {contact.contact_name}
                              </h3>
                              <span className={`flex items-center gap-1 text-sm ${status.color}`}>
                                <StatusIcon className="h-4 w-4" />
                                <span>{status.text}</span>
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground capitalize">
                              {contact.relationship_type.replace('_', ' ')}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {contact.contact_email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  <span>{contact.contact_email}</span>
                                </span>
                              )}
                              {contact.contact_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  <span>{contact.contact_phone}</span>
                                </span>
                              )}
                            </div>
                            {contact.notes && (
                              <p className="mt-2 text-sm text-muted-foreground">{contact.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!contact.is_fully_approved && (
                            <button
                              onClick={() => handleApprove(contact.id, true)}
                              className="p-2 text-cg-success hover:bg-cg-success-subtle rounded-lg transition-colors"
                              title="Approve"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                          )}

                          {contact.contact_email && (
                            <button
                              onClick={() => handleSendInvite(contact.id)}
                              className="p-2 text-cg-sage hover:bg-cg-sage-subtle rounded-lg transition-colors"
                              title="Copy invite link"
                            >
                              <Link2 className="h-5 w-5" />
                            </button>
                          )}

                          <button
                            onClick={() => startEdit(contact)}
                            className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>

                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="p-2 text-cg-error hover:bg-cg-error-subtle rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </CGCardContent>

                    {/* Permissions Toggle */}
                    {contact.is_fully_approved && children.length > 0 && (
                      <button
                        onClick={() => setExpandedContactId(isExpanded ? null : contact.id)}
                        className="w-full px-4 py-3 bg-muted/50 border-t border-border flex items-center justify-between hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2 text-foreground">
                          <Settings className="h-4 w-4" />
                          <span className="text-sm font-medium">Communication Permissions</span>
                          <span className="text-xs text-muted-foreground">
                            ({children.length} {children.length === 1 ? 'child' : 'children'})
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    )}

                    {/* Permissions Panel */}
                    {isExpanded && contact.is_fully_approved && (
                      <div className="border-t border-border bg-muted/30 p-4">
                        <div className="space-y-6">
                          {children.map((child) => (
                            <PermissionPanel
                              key={child.id}
                              contact={contact}
                              child={child}
                              initialData={getPermissionFormData(contact.id, child.id)}
                              onSave={(data) => handleSavePermission(contact.id, child.id, data)}
                              isSaving={savingPermission === `${contact.id}-${child.id}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CGCard>
                );
              })}
            </div>
          )}
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}

// Permission Panel Component
interface PermissionPanelProps {
  contact: CircleContact;
  child: FamilyFileChild;
  initialData: PermissionFormData;
  onSave: (data: PermissionFormData) => Promise<void>;
  isSaving: boolean;
}

function PermissionPanel({ contact, child, initialData, onSave, isSaving }: PermissionPanelProps) {
  const [formData, setFormData] = useState<PermissionFormData>(initialData);
  const [hasChanges, setHasChanges] = useState(false);

  function updateField<K extends keyof PermissionFormData>(
    field: K,
    value: PermissionFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }

  function toggleDay(day: number) {
    const newDays = formData.allowed_days.includes(day)
      ? formData.allowed_days.filter((d) => d !== day)
      : [...formData.allowed_days, day].sort((a, b) => a - b);
    updateField('allowed_days', newDays);
  }

  async function handleSave() {
    await onSave(formData);
    setHasChanges(false);
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      {/* Child Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cg-sage-subtle flex items-center justify-center">
            <span className="text-cg-sage font-semibold">
              {child.first_name[0]}
            </span>
          </div>
          <div>
            <h4 className="font-medium text-foreground">{child.first_name}</h4>
            <p className="text-xs text-muted-foreground">
              Permissions for {contact.contact_name}
            </p>
          </div>
        </div>
        {hasChanges && (
          <CGButton
            onClick={handleSave}
            disabled={isSaving}
            variant="primary"
            size="sm"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                <span>Save</span>
              </>
            )}
          </CGButton>
        )}
      </div>

      {/* Communication Methods */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-2">
          Allowed Communication
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => updateField('can_video_call', !formData.can_video_call)}
            className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
              formData.can_video_call
                ? 'bg-cg-success-subtle border-cg-success/30 text-cg-success'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            <Video className="h-4 w-4" />
            <span className="text-sm">Video</span>
          </button>
          <button
            type="button"
            onClick={() => updateField('can_voice_call', !formData.can_voice_call)}
            className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
              formData.can_voice_call
                ? 'bg-cg-success-subtle border-cg-success/30 text-cg-success'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            <PhoneCall className="h-4 w-4" />
            <span className="text-sm">Voice</span>
          </button>
          <button
            type="button"
            onClick={() => updateField('can_chat', !formData.can_chat)}
            className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
              formData.can_chat
                ? 'bg-cg-success-subtle border-cg-success/30 text-cg-success'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">Chat</span>
          </button>
          <button
            type="button"
            onClick={() => updateField('can_theater', !formData.can_theater)}
            className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
              formData.can_theater
                ? 'bg-cg-success-subtle border-cg-success/30 text-cg-success'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            <Film className="h-4 w-4" />
            <span className="text-sm">Theater</span>
          </button>
        </div>
      </div>

      {/* Allowed Days */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-2">
          <Calendar className="h-4 w-4 inline mr-1" />
          Allowed Days
        </label>
        <div className="flex flex-wrap gap-1">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                formData.allowed_days.includes(day.value)
                  ? 'bg-cg-sage-subtle border-cg-sage/30 text-cg-sage'
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Restrictions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Start Time
          </label>
          <input
            type="time"
            value={formData.allowed_start_time}
            onChange={(e) => updateField('allowed_start_time', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            End Time
          </label>
          <input
            type="time"
            value={formData.allowed_end_time}
            onChange={(e) => updateField('allowed_end_time', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Max Duration (min)
          </label>
          <input
            type="number"
            min="5"
            max="180"
            step="5"
            value={formData.max_call_duration_minutes}
            onChange={(e) => updateField('max_call_duration_minutes', parseInt(e.target.value) || 60)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Supervision Option */}
      <div className="flex items-center justify-between p-3 bg-cg-amber-subtle rounded-lg border border-cg-amber/30">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-cg-amber" />
          <div>
            <p className="text-sm font-medium text-foreground">Require Parent Present</p>
            <p className="text-xs text-muted-foreground">
              A parent must be on the call with the child
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateField('require_parent_present', !formData.require_parent_present)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            formData.require_parent_present ? 'bg-cg-amber' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              formData.require_parent_present ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
