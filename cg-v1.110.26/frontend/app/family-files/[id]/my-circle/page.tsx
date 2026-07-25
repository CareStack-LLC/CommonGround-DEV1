'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Plus,
  Settings,
  Mail,
  Check,
  X,
  Loader2,
  Phone,
  Video,
  MessageCircle,
  Film,
  Clock,
  Calendar,
  Edit2,
  UserPlus,
  QrCode,
  Copy,
  Link2,
  ArrowLeft,
  Sparkles,
  Home as HomeIcon,
} from 'lucide-react';
import { myCircleAPI, familyFilesAPI, circleAPI, circleMessagesAPI, KidComsRoom, CirclePermission, FamilyFileChild, CircleContact, CircleMessageData } from '@/lib/api';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';
import { useLimitGate } from '@/hooks/use-feature-gate';
import { TierBadge } from '@/components/tier-badge';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { Lock } from 'lucide-react';

interface PageParams {
  params: Promise<{ id: string }>;
}

const ROOM_COLORS = [
  'bg-[#FEE2E2] dark:bg-[#7A2222]/30 border-[#FCA5A5] dark:border-[#9B2C2C] text-[#9B2C2C] dark:text-[#FCA5A5]',
  'bg-[#FEF7ED] dark:bg-[#1E3A4A]/30 border-[#F5A623] dark:border-[#E09520] text-[#E09520] dark:text-[#F5A623]',
  'bg-[#FEF7ED] dark:bg-[#1E3A4A]/30 border-[#F5A623] dark:border-[#E09520] text-[#E09520] dark:text-[#F5A623]',
  'bg-[#FEF7ED] dark:bg-[#1E3A4A]/30 border-[#F5A623] dark:border-[#E09520] text-[#E09520] dark:text-[#F5A623]',
  'bg-lime-100 dark:bg-lime-900/30 border-lime-300 dark:border-lime-700 text-lime-700 dark:text-lime-300',
  'bg-[#E8F4F0] dark:bg-[#1E3A4A]/30 border-[#5BC4A0] dark:border-[#2D8A70] text-[#2D8A70] dark:text-[#5BC4A0]',
  'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300',
  'bg-[#E0EFF8] dark:bg-[#1E3A4A]/30 border-[#4BA8C8] dark:border-[#1E4E6B] text-[#1E4E6B] dark:text-[#4BA8C8]',
  'bg-[#E0EFF8] dark:bg-[#1E3A4A]/30 border-[#4BA8C8] dark:border-[#1E4E6B] text-[#1E4E6B] dark:text-[#4BA8C8]',
  'bg-[#FEF7ED] dark:bg-[#1E3A4A]/30 border-[#F5A623] dark:border-[#E09520] text-[#E09520] dark:text-[#F5A623]',
];

const RELATIONSHIP_OPTIONS = [
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'family_friend', label: 'Family Friend' },
  { value: 'godparent', label: 'Godparent' },
  { value: 'step_parent', label: 'Step Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'therapist', label: 'Therapist' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'coach', label: 'Coach' },
  { value: 'other', label: 'Other' },
];

export default function MyCircleManagementPage({ params }: PageParams) {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <div className="min-h-screen bg-background pb-20 lg:pb-0">
          <Navigation />
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-14 h-14 border-3 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            <p className="mt-4 text-muted-foreground font-medium">Loading My Circle...</p>
          </div>
        </div>
      </ProtectedRoute>
    }>
      <MyCircleContent params={params} />
    </Suspense>
  );
}

function MyCircleContent({ params }: PageParams) {
  const resolvedParams = use(params);
  const familyFileId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'messages' ? 'messages' : 'contacts';
  const [activeTab, setActiveTab] = useState<'contacts' | 'messages'>(initialTab);

  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<KidComsRoom[]>([]);
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [permissions, setPermissions] = useState<CirclePermission[]>([]);

  // Contact limit gate - Free: 0, Plus: 1, Complete: 5
  const contactLimitGate = useLimitGate('circle_contacts_limit', contacts.length);
  const [selectedRoom, setSelectedRoom] = useState<KidComsRoom | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showChildSetupModal, setShowChildSetupModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<CircleContact | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editRelationship, setEditRelationship] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteContactName, setInviteContactName] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState('');
  const [inviteRoomNumber, setInviteRoomNumber] = useState(3);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<{ email: string; token: string } | null>(null);

  // Permission editing state
  const [editingPermission, setEditingPermission] = useState<CirclePermission | null>(null);
  const [permissionForm, setPermissionForm] = useState({
    can_video_call: true,
    can_voice_call: true,
    can_chat: false,
    can_theater: true,
    allowed_hours_start: '',
    allowed_hours_end: '',
    allowed_days: [] as string[],
  });
  const [isSavingPermission, setIsSavingPermission] = useState(false);

  // Child setup state
  const [children, setChildren] = useState<FamilyFileChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childSetupName, setChildSetupName] = useState('');
  const [childSetupPin, setChildSetupPin] = useState('');
  const [childSetupAvatar, setChildSetupAvatar] = useState('lion');
  const [isSettingUpChild, setIsSettingUpChild] = useState(false);

  useEffect(() => {
    loadData();
  }, [familyFileId]);

  async function loadData() {
    try {
      setIsLoading(true);
      const [roomList, childrenList, contactsList, permissionsList] = await Promise.all([
        myCircleAPI.getRooms(familyFileId),
        familyFilesAPI.getChildren(familyFileId),
        circleAPI.list(familyFileId),
        myCircleAPI.listPermissions(familyFileId).catch(() => ({ items: [], total: 0 })),
      ]);
      setRooms(roomList.items);
      setChildren(childrenList.items);
      setContacts(contactsList.items);
      setPermissions(permissionsList.items);
      // Pre-select first child if available
      if (childrenList.items.length > 0 && !selectedChildId) {
        setSelectedChildId(childrenList.items[0].id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendInvite() {
    if (!inviteEmail || !inviteContactName) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsInviting(true);
      setError(null);

      const response = await myCircleAPI.inviteCircleUser(familyFileId, {
        email: inviteEmail,
        contact_name: inviteContactName,
        relationship_type: inviteRelationship || undefined,
        room_number: inviteRoomNumber,
      });

      setInviteSuccess({
        email: inviteEmail,
        token: response.invite_token,
      });

      // Reload data to show the new pending invite
      await loadData();
    } catch (err) {
      console.error('Error sending invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  }

  async function handleUpdatePermission() {
    if (!editingPermission) return;

    try {
      setIsSavingPermission(true);
      setError(null);

      // Map day names to numbers (0=Sunday, 1=Monday, etc.)
      const dayNameToNumber: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      await myCircleAPI.updatePermission(editingPermission.id, {
        can_video_call: permissionForm.can_video_call,
        can_voice_call: permissionForm.can_voice_call,
        can_chat: permissionForm.can_chat,
        can_theater: permissionForm.can_theater,
        allowed_start_time: permissionForm.allowed_hours_start || undefined,
        allowed_end_time: permissionForm.allowed_hours_end || undefined,
        allowed_days:
          permissionForm.allowed_days.length > 0
            ? permissionForm.allowed_days.map((day) => dayNameToNumber[day])
            : undefined,
      });

      setShowPermissionModal(false);
      setEditingPermission(null);
      await loadData();
    } catch (err) {
      console.error('Error updating permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    } finally {
      setIsSavingPermission(false);
    }
  }

  async function handleSetupChildUser() {
    if (!selectedChildId) {
      setError('Please select a child');
      return;
    }

    if (!childSetupName || !childSetupPin) {
      setError('Please enter a username and PIN');
      return;
    }

    if (childSetupPin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    try {
      setIsSettingUpChild(true);
      setError(null);

      await myCircleAPI.setupChildUser({
        child_id: selectedChildId,
        username: childSetupName,
        pin: childSetupPin,
        avatar_id: childSetupAvatar,
      });

      setShowChildSetupModal(false);
      setChildSetupName('');
      setChildSetupPin('');
      setChildSetupAvatar('lion');

      alert('Child account created! They can now log in with their name and PIN.');
    } catch (err) {
      console.error('Error setting up child:', err);
      setError(err instanceof Error ? err.message : 'Failed to create child account');
    } finally {
      setIsSettingUpChild(false);
    }
  }

  function openEditContactModal(contact: CircleContact) {
    setEditingContact(contact);
    setEditContactName(contact.contact_name || '');
    setEditRelationship(contact.relationship_type || '');
    setEditPhotoFile(null);
    setEditPhotoPreview(contact.photo_url || null);
    setShowEditContactModal(true);
  }

  async function handleSaveContactEdit() {
    if (!editingContact || !editContactName.trim()) return;
    setIsSavingContact(true);
    try {
      let photoUrl = editingContact.photo_url;

      // Upload photo if new file selected
      if (editPhotoFile) {
        const formData = new FormData();
        formData.append('file', editPhotoFile);
        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/circle/${editingContact.id}/photo`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
            body: formData,
          }
        );
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          photoUrl = uploadData.photo_url || photoUrl;
        }
      }

      await circleAPI.update(editingContact.id, {
        contact_name: editContactName.trim(),
        relationship_type: editRelationship || undefined,
        photo_url: photoUrl,
      });

      // Refresh contacts
      await loadData();
      setShowEditContactModal(false);
      setEditingContact(null);
    } catch (err: any) {
      console.error('Failed to update contact:', err);
      setError(err.message || 'Failed to update contact');
    } finally {
      setIsSavingContact(false);
    }
  }

  function openPermissionModal(permission: CirclePermission) {
    setEditingPermission(permission);

    // Map numbers back to day names (0=Sunday, 1=Monday, etc.)
    const numberToDayName: Record<number, string> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };

    setPermissionForm({
      can_video_call: permission.can_video_call,
      can_voice_call: permission.can_voice_call,
      can_chat: permission.can_chat,
      can_theater: permission.can_theater,
      allowed_hours_start: permission.allowed_start_time || '',
      allowed_hours_end: permission.allowed_end_time || '',
      allowed_days: permission.allowed_days
        ? permission.allowed_days.map((num) => numberToDayName[num])
        : [],
    });
    setShowPermissionModal(true);
  }

  function toggleDay(day: string) {
    setPermissionForm((prev) => ({
      ...prev,
      allowed_days: prev.allowed_days.includes(day)
        ? prev.allowed_days.filter((d) => d !== day)
        : [...prev.allowed_days, day],
    }));
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/my-circle/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  }

  const childLoginUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/my-circle/child?family=${familyFileId}`;

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background pb-20 lg:pb-0">
          <Navigation />
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-14 h-14 border-3 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            <p className="mt-4 text-muted-foreground font-medium">Loading My Circle...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />
        <PageContainer background="transparent">
          <div className="space-y-8">
            {/* Page Header */}
            <div className="flex items-start gap-4">
              <button aria-label="Back"
                onClick={() => router.back()}
                className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors mt-1"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-teal-600/5 flex items-center justify-center shadow-md">
                    <Users className="h-6 w-6 text-teal-600" />
                  </div>
                  My Circle
                </h1>
                <p className="text-muted-foreground font-medium mt-1">Manage trusted contacts who can communicate with your children</p>
              </div>
            </div>

            {error && (
              <div className="bg-[#FEE2E2] border-2 border-[#FEE2E2] rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
                    <X className="h-5 w-5 text-[#C53030]" />
                  </div>
                  <p className="text-[#9B2C2C] font-medium flex-1">{error}</p>
                  <button aria-label="Dismiss"
                    onClick={() => setError(null)}
                    className="text-[#C53030] hover:text-[#9B2C2C]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Contact Limit Banner */}
            {!contactLimitGate.canAddMore && contactLimitGate.limit > 0 && (
              <UpgradeBanner
                variant="slim"
                feature="circle_contacts_limit"
                dismissible
              />
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contactLimitGate.canAddMore ? (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-card border-2 border-border rounded-2xl shadow-lg hover:shadow-xl hover:border-teal-300 transition-all p-6 flex items-center gap-4 group"
                >
                  <div className="p-3 bg-gradient-to-br from-teal-500/10 to-teal-600/5 rounded-xl group-hover:from-teal-500/20 group-hover:to-teal-600/10 transition-all">
                    <UserPlus className="h-6 w-6 text-teal-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-foreground">Invite Contact</h3>
                    <p className="text-sm text-muted-foreground">
                      {contactLimitGate.limit > 0
                        ? `${contacts.length}/${contactLimitGate.limit} contacts`
                        : 'Add someone to your circle'}
                    </p>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => router.push('/settings/billing')}
                  className="bg-muted border-2 border-border rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 flex items-center gap-4 group opacity-75"
                >
                  <div className="p-3 bg-gradient-to-br from-slate-200/50 to-slate-300/30 rounded-xl">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-muted-foreground">Invite Contact</h3>
                      <TierBadge tier={contactLimitGate.limit === 0 ? 'plus' : 'complete'} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {contactLimitGate.limit === 0
                        ? 'Upgrade to add contacts'
                        : `Limit reached (${contacts.length}/${contactLimitGate.limit})`}
                    </p>
                  </div>
                </button>
              )}

              <button
                onClick={() => setShowChildSetupModal(true)}
                className="bg-card border-2 border-border rounded-2xl shadow-lg hover:shadow-xl hover:border-[#3DAA8A]/40 transition-all p-6 flex items-center gap-4 group"
              >
                <div className="p-3 bg-gradient-to-br from-[#3DAA8A]/10 to-[#2D6A8F]/5 rounded-xl group-hover:from-[#3DAA8A]/20 group-hover:to-[#2D6A8F]/10 transition-all">
                  <Users className="h-6 w-6 text-[#3DAA8A]" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-foreground">Setup Child</h3>
                  <p className="text-sm text-muted-foreground">Create child login account</p>
                </div>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(childLoginUrl);
                  alert('Child login link copied!');
                }}
                className="bg-card border-2 border-border rounded-2xl shadow-lg hover:shadow-xl hover:border-border transition-all p-6 flex items-center gap-4 group"
              >
                <div className="p-3 bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-xl group-hover:from-slate-500/20 group-hover:to-slate-600/10 transition-all">
                  <QrCode className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-foreground">Child Login Link</h3>
                  <p className="text-sm text-muted-foreground">Copy link for child device</p>
                </div>
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'contacts'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4" />
                Contacts
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{contacts.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'messages'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                Messages
              </button>
            </div>

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <MessagesSection
                familyFileId={familyFileId}
                children={children}
                contacts={contacts}
              />
            )}

            {/* Circle Contacts */}
            {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Circle Contacts</h2>
                <span className="text-sm text-muted-foreground font-medium">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</span>
              </div>

              {contacts.length === 0 ? (
                <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-10 w-10 text-teal-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>No contacts yet</h3>
                  <p className="text-muted-foreground mb-6">Invite trusted people to your circle</p>
                  {contactLimitGate.canAddMore ? (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="cg-btn-primary flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite Contact
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push('/settings/billing')}
                      className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Lock className="h-4 w-4" />
                      Invite Contact
                      <TierBadge tier="plus" size="sm" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact) => {
                    const relationshipEmoji: Record<string, string> = {
                      grandparent: '👴',
                      aunt: '👩',
                      uncle: '👨',
                      cousin: '🧒',
                      family_friend: '🤗',
                      godparent: '💝',
                      step_parent: '💕',
                      sibling: '👦',
                      therapist: '🧠',
                      tutor: '📚',
                      coach: '⚽',
                    };

                    // Get room info directly from contact's room_number
                    const contactRoom = contact.room_number
                      ? rooms.find((room) => room.room_number === contact.room_number)
                      : undefined;

                    return (
                      <div
                        key={contact.id}
                        className="bg-card border-2 border-border rounded-2xl shadow-lg hover:shadow-xl hover:border-teal-300 transition-all p-6"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar with Room Badge */}
                          <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-cg-sage-subtle flex items-center justify-center text-2xl">
                              {relationshipEmoji[contact.relationship_type] || '💜'}
                            </div>
                            {contactRoom && (
                              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                ROOM_COLORS[(contactRoom.room_number - 1) % ROOM_COLORS.length]
                              }`}>
                                {contactRoom.room_number}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{contact.contact_name}</h3>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground capitalize">
                                {contact.relationship_type.replace('_', ' ')}
                              </p>
                              {contactRoom && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  ROOM_COLORS[(contactRoom.room_number - 1) % ROOM_COLORS.length]
                                }`}>
                                  Room {contactRoom.room_number}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status & Actions */}
                          <div className="flex items-center gap-2">
                            {/* Approval Status */}
                            <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              contact.can_communicate
                                ? 'bg-cg-success-subtle text-cg-success'
                                : contact.is_partially_approved
                                  ? 'bg-[#FEF7ED] text-[#E09520]'
                                  : 'bg-muted text-muted-foreground'
                            }`}>
                              {contact.can_communicate
                                ? 'Approved'
                                : contact.is_partially_approved
                                  ? 'Pending'
                                  : 'Not Approved'}
                            </div>

                            {/* Voice Call Button */}
                            <button
                              onClick={() => {
                                // Navigate to KidSpace to initiate a call
                                router.push(`/family-files/${familyFileId}/kidcoms`);
                              }}
                              disabled={!contact.can_communicate}
                              className={`p-2 rounded-lg transition-colors ${
                                contact.can_communicate
                                  ? 'bg-[#E0EFF8] text-[#2D6A8F] hover:bg-[#E0EFF8]'
                                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                              }`}
                              title="Voice Call"
                            >
                              <Phone className="h-4 w-4" />
                            </button>

                            {/* Copy Invite Link Button */}
                            <button
                              onClick={() => {
                                // Link to circle contact login page, pre-fill email if available
                                const loginUrl = contact.contact_email
                                  ? `${window.location.origin}/my-circle/contact?email=${encodeURIComponent(contact.contact_email)}`
                                  : `${window.location.origin}/my-circle/contact`;
                                navigator.clipboard.writeText(loginUrl);
                                alert('Login link copied to clipboard!');
                              }}
                              className="p-2 text-[#3DAA8A] bg-[#3DAA8A]/10 hover:bg-[#3DAA8A]/20 rounded-lg transition-colors"
                              title="Copy login link"
                            >
                              <Link2 className="h-4 w-4" />
                            </button>

                            {/* Edit Contact Details */}
                            <button aria-label="Edit"
                              onClick={() => openEditContactModal(contact)}
                              className="p-2 text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/20 rounded-lg transition-colors"
                              title="Edit contact name & photo"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {/* Edit Permissions */}
                            <button
                              onClick={() => {
                                // Find real permission for this contact
                                const realPermission = permissions.find(
                                  (p) => p.circle_contact_id === contact.id
                                );
                                if (realPermission) {
                                  openPermissionModal(realPermission);
                                } else {
                                  // Fallback: create default permission if none exists yet
                                  const defaultPermission: CirclePermission = {
                                    id: contact.id,
                                    circle_contact_id: contact.id,
                                    child_id: children.length > 0 ? children[0].id : '',
                                    family_file_id: familyFileId,
                                    can_video_call: true,
                                    can_voice_call: true,
                                    can_chat: false,
                                    can_theater: true,
                                    allowed_start_time: undefined,
                                    allowed_end_time: undefined,
                                    allowed_days: undefined,
                                    is_within_allowed_time: true,
                                    max_call_duration_minutes: 60,
                                    require_parent_present: false,
                                    created_at: '',
                                    updated_at: '',
                                  };
                                  openPermissionModal(defaultPermission);
                                }
                              }}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                              title="Edit call permissions"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Parent Approval Details */}
                        <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {contact.approved_by_parent_a_at ? (
                              <Check className="h-3 w-3 text-cg-success" />
                            ) : (
                              <X className="h-3 w-3 text-muted-foreground" />
                            )}
                            Parent A
                          </span>
                          <span className="flex items-center gap-1">
                            {contact.approved_by_parent_b_at ? (
                              <Check className="h-3 w-3 text-cg-success" />
                            ) : (
                              <X className="h-3 w-3 text-muted-foreground" />
                            )}
                            Parent B
                          </span>
                          {contact.contact_email && (
                            <span className="flex items-center gap-1 ml-auto">
                              <Mail className="h-3 w-3" />
                              {contact.contact_email}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}
          </div>
        </PageContainer>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
              {inviteSuccess ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-cg-success-subtle rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-cg-success" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Invitation Sent!</h2>
                    <p className="text-muted-foreground mt-1">
                      An invitation has been sent to {inviteSuccess.email}
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-4 mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Or share this link directly:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/my-circle/accept-invite?token=${inviteSuccess.token}`}
                        readOnly
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                      <button aria-label="Copy"
                        onClick={() => copyInviteLink(inviteSuccess.token)}
                        className="px-3 py-2 bg-cg-sage text-white rounded-lg hover:bg-cg-sage/90"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteSuccess(null);
                      setInviteEmail('');
                      setInviteContactName('');
                      setInviteRelationship('');
                    }}
                    className="w-full py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">Invite to Circle</h2>
                    <button aria-label="Close"
                      onClick={() => setShowInviteModal(false)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        value={inviteContactName}
                        onChange={(e) => setInviteContactName(e.target.value)}
                        placeholder="e.g., Grandma Susan"
                        className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-cg-sage focus:border-cg-sage bg-background text-foreground"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-cg-sage focus:border-cg-sage bg-background text-foreground"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Relationship
                      </label>
                      <select
                        value={inviteRelationship}
                        onChange={(e) => setInviteRelationship(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-cg-sage focus:border-cg-sage bg-background text-foreground"
                      >
                        <option value="">Select relationship...</option>
                        {RELATIONSHIP_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Room Number
                      </label>
                      <select
                        value={inviteRoomNumber}
                        onChange={(e) => setInviteRoomNumber(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-cg-sage focus:border-cg-sage bg-background text-foreground"
                      >
                        {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          const room = rooms.find((r) => r.room_number === num);
                          return (
                            <option key={num} value={num} disabled={room?.is_assigned}>
                              Room {num} {room?.is_assigned ? `(${room.room_name || 'Occupied'})` : '(Available)'}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendInvite}
                      disabled={isInviting}
                      className="flex-1 py-3 bg-cg-sage text-white rounded-xl font-semibold hover:bg-cg-sage/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {isInviting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-5 w-5" />
                          Send Invite
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Edit Contact Modal */}
        {showEditContactModal && editingContact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card border-2 border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Edit Contact</h3>
                <button aria-label="Close" onClick={() => setShowEditContactModal(false)} className="p-1 hover:bg-muted rounded-lg"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>

              {/* Photo Upload */}
              <div className="flex flex-col items-center mb-6">
                <label className="cursor-pointer group">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3DAA8A]/20 to-[#2D6A8F]/20 flex items-center justify-center overflow-hidden border-2 border-border group-hover:border-[#3DAA8A] transition-colors">
                    {editPhotoPreview ? (
                      <img src={editPhotoPreview} alt="Contact" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-[#3DAA8A]">{editContactName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditPhotoFile(file);
                        setEditPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-2">Click to change photo</p>
              </div>

              {/* Contact Name */}
              <div className="space-y-1.5 mb-4">
                <label className="text-sm font-medium text-foreground">Contact Name</label>
                <input
                  type="text"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-[#3DAA8A] focus:border-[#3DAA8A] transition-all"
                  placeholder="Enter name..."
                />
              </div>

              {/* Relationship */}
              <div className="space-y-1.5 mb-6">
                <label className="text-sm font-medium text-foreground">Relationship</label>
                <select
                  value={editRelationship}
                  onChange={(e) => setEditRelationship(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-[#3DAA8A] focus:border-[#3DAA8A] transition-all"
                >
                  <option value="">Select relationship...</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="aunt">Aunt</option>
                  <option value="uncle">Uncle</option>
                  <option value="sibling">Sibling</option>
                  <option value="cousin">Cousin</option>
                  <option value="family_friend">Family Friend</option>
                  <option value="therapist">Therapist</option>
                  <option value="tutor">Tutor</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditContactModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContactEdit}
                  disabled={isSavingContact || !editContactName.trim()}
                  className="flex-1 py-2.5 bg-[#3DAA8A] text-white rounded-xl font-semibold hover:bg-[#2D8A6E] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isSavingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {isSavingContact ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permission Modal */}
        {showPermissionModal && editingPermission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Edit Permissions</h2>
                <button aria-label="Close"
                  onClick={() => setShowPermissionModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Communication Types */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Communication Types
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'can_video_call', icon: Video, label: 'Video Calls', color: 'green' },
                      { key: 'can_voice_call', icon: Phone, label: 'Voice Calls', color: 'blue' },
                      { key: 'can_chat', icon: MessageCircle, label: 'Chat', color: 'emerald' },
                      { key: 'can_theater', icon: Film, label: 'Watch Together', color: 'orange' },
                    ].map(({ key, icon: Icon, label, color }) => (
                      <button
                        key={key}
                        onClick={() => setPermissionForm((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                          permissionForm[key as keyof typeof permissionForm]
                            ? `bg-${color}-100 border-${color}-300 text-${color}-700`
                            : 'bg-muted/30 border-border text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Restrictions */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Allowed Hours (optional)
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="time"
                      value={permissionForm.allowed_hours_start}
                      onChange={(e) => setPermissionForm((prev) => ({ ...prev, allowed_hours_start: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-cg-sage bg-background text-foreground"
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={permissionForm.allowed_hours_end}
                      onChange={(e) => setPermissionForm((prev) => ({ ...prev, allowed_hours_end: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-cg-sage bg-background text-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Leave blank for no time restriction</p>
                </div>

                {/* Day Restrictions */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Allowed Days (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          permissionForm.allowed_days.includes(day)
                            ? 'bg-cg-sage-subtle text-cg-sage'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {day.slice(0, 3).toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Leave all unselected for no day restriction</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="flex-1 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePermission}
                  disabled={isSavingPermission}
                  className="flex-1 py-3 bg-cg-sage text-white rounded-xl font-semibold hover:bg-cg-sage/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isSavingPermission ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Child Setup Modal */}
        {showChildSetupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Setup Child Account</h2>
                <button aria-label="Close"
                  onClick={() => setShowChildSetupModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Select Child
                  </label>
                  <select
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-[#3DAA8A] focus:border-[#3DAA8A] bg-background text-foreground"
                  >
                    <option value="">Select a child...</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.first_name} {child.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Child&apos;s Username
                  </label>
                  <input
                    type="text"
                    value={childSetupName}
                    onChange={(e) => setChildSetupName(e.target.value)}
                    placeholder="e.g., Emma"
                    className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-[#3DAA8A] focus:border-[#3DAA8A] bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    4-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={childSetupPin}
                    onChange={(e) => setChildSetupPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-[#3DAA8A] focus:border-[#3DAA8A] bg-background text-foreground text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Make it easy for your child to remember</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Avatar
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      { id: 'lion', emoji: '🦁' },
                      { id: 'panda', emoji: '🐼' },
                      { id: 'unicorn', emoji: '🦄' },
                      { id: 'bear', emoji: '🐻' },
                      { id: 'cat', emoji: '🐱' },
                      { id: 'dog', emoji: '🐶' },
                      { id: 'rabbit', emoji: '🐰' },
                      { id: 'fox', emoji: '🦊' },
                      { id: 'koala', emoji: '🐨' },
                      { id: 'penguin', emoji: '🐧' },
                      { id: 'monkey', emoji: '🐵' },
                      { id: 'dragon', emoji: '🐉' },
                    ].map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setChildSetupAvatar(avatar.id)}
                        className={`p-2 text-2xl rounded-xl border-2 transition-colors ${
                          childSetupAvatar === avatar.id
                            ? 'border-[#3DAA8A] bg-[#3DAA8A]/10'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        {avatar.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowChildSetupModal(false)}
                  className="flex-1 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetupChildUser}
                  disabled={isSettingUpChild}
                  className="flex-1 py-3 bg-[#3DAA8A] text-white rounded-xl font-semibold hover:bg-[#2D8A6E] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isSettingUpChild ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// --- Messages Section Component ---
interface MessagesSectionProps {
  familyFileId: string;
  children: FamilyFileChild[];
  contacts: CircleContact[];
}

interface ConversationPreview {
  childId: string;
  childName: string;
  contactId: string;
  contactName: string;
  contactRelationship: string;
  lastMessage?: string;
  lastMessageAt?: string;
  senderName?: string;
}

function MessagesSection({ familyFileId, children: childrenList, contacts }: MessagesSectionProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [childrenList, contacts]);

  async function loadConversations() {
    if (childrenList.length === 0 || contacts.length === 0) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const previews: ConversationPreview[] = [];

      // For each child-contact pair, try to fetch the most recent message
      const approvedContacts = contacts.filter((c) => c.can_communicate && c.is_active !== false);

      for (const child of childrenList) {
        for (const contact of approvedContacts) {
          try {
            const result = await circleMessagesAPI.getConversationAsParent(child.id, contact.id, 0, 1);
            const lastMsg = result.items.length > 0 ? result.items[0] : undefined;
            previews.push({
              childId: child.id,
              childName: child.first_name,
              contactId: contact.id,
              contactName: contact.contact_name,
              contactRelationship: contact.relationship_type,
              lastMessage: lastMsg?.content,
              lastMessageAt: lastMsg?.sent_at,
              senderName: lastMsg?.sender_name,
            });
          } catch {
            // Conversation may not exist yet — still show the pair
            previews.push({
              childId: child.id,
              childName: child.first_name,
              contactId: contact.id,
              contactName: contact.contact_name,
              contactRelationship: contact.relationship_type,
            });
          }
        }
      }

      // Sort: conversations with messages first, then by most recent
      previews.sort((a, b) => {
        if (a.lastMessageAt && !b.lastMessageAt) return -1;
        if (!a.lastMessageAt && b.lastMessageAt) return 1;
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        return 0;
      });

      setConversations(previews);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function formatTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        <p className="mt-3 text-muted-foreground text-sm">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="h-10 w-10 text-teal-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
          No conversations yet
        </h3>
        <p className="text-muted-foreground">
          {contacts.length === 0
            ? 'Invite contacts to your circle to start messaging'
            : 'Messages between your children and approved contacts will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
          Conversations
        </h2>
        <span className="text-sm text-muted-foreground font-medium">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {conversations.map((convo) => (
          <button
            key={`${convo.childId}-${convo.contactId}`}
            onClick={() => router.push(`/family-files/${familyFileId}/my-circle/messages/${convo.childId}/${convo.contactId}`)}
            className="w-full bg-card border-2 border-border rounded-2xl shadow-sm hover:shadow-lg hover:border-teal-300 transition-all p-4 text-left"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3DAA8A]/10 to-[#2D6A8F]/10 flex items-center justify-center text-lg flex-shrink-0">
                {convo.contactRelationship === 'grandparent' ? '👴' :
                 convo.contactRelationship === 'aunt' ? '👩' :
                 convo.contactRelationship === 'uncle' ? '👨' : '💜'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-sm truncate">
                    {convo.contactName}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    &amp; {convo.childName}
                  </span>
                </div>
                {convo.lastMessage ? (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    <span className="font-medium">{convo.senderName}: </span>
                    {convo.lastMessage}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic mt-0.5">
                    No messages yet — tap to start a conversation
                  </p>
                )}
              </div>

              {/* Timestamp */}
              {convo.lastMessageAt && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatTimeAgo(convo.lastMessageAt)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ARIA Safety Note */}
      <div className="bg-muted/30 border border-border rounded-xl p-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          All messages are monitored by <strong className="text-foreground">ARIA</strong> for child safety. You can view any conversation and send messages as a parent.
        </p>
      </div>
    </div>
  );
}
