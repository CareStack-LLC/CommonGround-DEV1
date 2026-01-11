'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { childrenAPI, ChildProfile, getImageUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';
import {
  ArrowLeft,
  User,
  Heart,
  GraduationCap,
  Star,
  Phone,
  Pencil,
  X,
  Check,
  Loader2,
  Package,
  AlertCircle,
  Clock,
  CheckCircle,
  Stethoscope,
  Shirt,
  Moon,
  Activity,
  Users,
  Plus,
  Trash2,
  Camera,
} from 'lucide-react';

/* =============================================================================
   HELPER FUNCTIONS
   ============================================================================= */

function calculateAge(dateOfBirth: string): { years: number; months: number } {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }

  return { years, months };
}

function formatAge(dateOfBirth: string): string {
  const { years, months } = calculateAge(dateOfBirth);
  if (years < 2) {
    return `${years * 12 + months} months`;
  }
  return `${years} years old`;
}

/* =============================================================================
   TAB DEFINITIONS
   ============================================================================= */

const TABS = [
  { id: 'basic', label: 'About', icon: User },
  { id: 'medical', label: 'Medical', icon: Heart },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'preferences', label: 'Preferences', icon: Star },
  { id: 'emergency', label: 'Emergency', icon: Phone },
];

/* =============================================================================
   HELPER COMPONENTS
   ============================================================================= */

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: typeof TABS[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
        ? 'bg-cg-sage text-white shadow-sm'
        : 'bg-card text-muted-foreground hover:bg-cg-sage/10 hover:text-cg-sage border border-transparent hover:border-cg-sage/20'
        }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{tab.label}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    active: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-sage/10 text-cg-sage border-cg-sage/20',
      label: 'Active',
    },
    pending_approval: {
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      label: 'Pending',
    },
    archived: {
      icon: <X className="h-3.5 w-3.5" />,
      className: 'bg-gray-100 text-gray-600 border-gray-200',
      label: 'Archived',
    },
  };

  const { icon, className, label } = config[status] || config.active;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border ${className}`}>
      {icon}
      {label}
    </span>
  );
}

function InfoField({
  label,
  value,
  emptyText = 'Not specified',
  className = '',
}: {
  label: string;
  value: string | null | undefined;
  emptyText?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-foreground ${value ? '' : 'text-muted-foreground italic'}`}>
        {value || emptyText}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  onEdit,
  canEdit,
  editMode,
  onSave,
  onCancel,
  isSaving,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onEdit?: () => void;
  canEdit?: boolean;
  editMode?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-border bg-gradient-to-r from-cg-sage/5 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cg-sage/10 flex items-center justify-center">
            {icon}
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>

        {editMode ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="p-2 rounded-xl bg-cg-sage text-white hover:bg-cg-sage/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
          </div>
        ) : canEdit ? (
          <button
            onClick={onEdit}
            className="p-2 rounded-xl hover:bg-cg-sage/10 text-muted-foreground hover:text-cg-sage transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage/50 focus:border-cg-sage transition-all"
      />
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage/50 focus:border-cg-sage transition-all resize-none"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage/50 focus:border-cg-sage transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */

function ChildProfileContent() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;
  const childId = params.childId as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [editMode, setEditMode] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [basicForm, setBasicForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    preferred_name: '',
    date_of_birth: '',
    gender: '',
  });

  const [medicalForm, setMedicalForm] = useState({
    allergies: '',
    medications: '',
    medical_conditions: '',
    blood_type: '',
    pediatrician_name: '',
    pediatrician_phone: '',
    dentist_name: '',
    dentist_phone: '',
    therapist_name: '',
    therapist_phone: '',
    insurance_provider: '',
    insurance_policy_number: '',
  });

  const [educationForm, setEducationForm] = useState({
    school_name: '',
    school_phone: '',
    grade_level: '',
    teacher_name: '',
    teacher_email: '',
    has_iep: false,
    has_504_plan: false,
    education_notes: '',
  });

  const [preferencesForm, setPreferencesForm] = useState({
    favorite_foods: '',
    food_dislikes: '',
    favorite_activities: '',
    comfort_items: '',
    bedtime_routine: '',
    clothing_size: '',
    shoe_size: '',
    temperament_notes: '',
    fears_anxieties: '',
    calming_strategies: '',
  });

  const [emergencyForm, setEmergencyForm] = useState<{
    emergency_contacts: { name: string; relationship: string; phone: string }[];
  }>({
    emergency_contacts: [],
  });

  useEffect(() => {
    loadChild();
  }, [childId]);

  const loadChild = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await childrenAPI.get(childId);
      setChild(data);
      populateForms(data);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to load child profile');
    } finally {
      setLoading(false);
    }
  };

  const populateForms = (data: ChildProfile) => {
    setBasicForm({
      first_name: data.first_name || '',
      middle_name: data.middle_name || '',
      last_name: data.last_name || '',
      preferred_name: data.preferred_name || '',
      date_of_birth: data.date_of_birth || '',
      gender: data.gender || '',
    });

    setMedicalForm({
      allergies: data.allergies || '',
      medications: data.medications || '',
      medical_conditions: data.medical_conditions || '',
      blood_type: data.blood_type || '',
      pediatrician_name: data.pediatrician_name || '',
      pediatrician_phone: data.pediatrician_phone || '',
      dentist_name: data.dentist_name || '',
      dentist_phone: data.dentist_phone || '',
      therapist_name: data.therapist_name || '',
      therapist_phone: data.therapist_phone || '',
      insurance_provider: data.insurance_provider || '',
      insurance_policy_number: data.insurance_policy_number || '',
    });

    setEducationForm({
      school_name: data.school_name || '',
      school_phone: data.school_phone || '',
      grade_level: data.grade_level || '',
      teacher_name: data.teacher_name || '',
      teacher_email: data.teacher_email || '',
      has_iep: data.has_iep || false,
      has_504_plan: data.has_504_plan || false,
      education_notes: data.education_notes || '',
    });

    setPreferencesForm({
      favorite_foods: data.favorite_foods || '',
      food_dislikes: data.food_dislikes || '',
      favorite_activities: data.favorite_activities || '',
      comfort_items: data.comfort_items || '',
      bedtime_routine: data.bedtime_routine || '',
      clothing_size: data.clothing_size || '',
      shoe_size: data.shoe_size || '',
      temperament_notes: data.temperament_notes || '',
      fears_anxieties: data.fears_anxieties || '',
      calming_strategies: data.calming_strategies || '',
    });

    if (data.emergency_contacts) {
      try {
        const contacts =
          typeof data.emergency_contacts === 'string'
            ? JSON.parse(data.emergency_contacts)
            : data.emergency_contacts;
        setEmergencyForm({ emergency_contacts: contacts });
      } catch {
        setEmergencyForm({ emergency_contacts: [] });
      }
    }
  };

  const handleApprove = async () => {
    try {
      setSaving(true);
      setError(null);
      await childrenAPI.approve(childId);
      setSuccess('Profile approved successfully!');
      loadChild();
    } catch (err: any) {
      setError(err.message || 'Failed to approve profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (saveFunction: () => Promise<void>) => {
    try {
      setSaving(true);
      setError(null);
      await saveFunction();
      setSuccess('Changes saved!');
      setEditMode(false);
      loadChild();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPEG, PNG, GIF, or WebP image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);
      setImageError(false); // Reset image error state for new upload
      const updatedChild = await childrenAPI.uploadPhoto(childId, file);
      setChild(updatedChild);
      setSuccess('Photo updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const addEmergencyContact = () => {
    setEmergencyForm({
      emergency_contacts: [...emergencyForm.emergency_contacts, { name: '', relationship: '', phone: '' }],
    });
  };

  const removeEmergencyContact = (index: number) => {
    const contacts = [...emergencyForm.emergency_contacts];
    contacts.splice(index, 1);
    setEmergencyForm({ emergency_contacts: contacts });
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    const contacts = [...emergencyForm.emergency_contacts];
    contacts[index] = { ...contacts[index], [field]: value };
    setEmergencyForm({ emergency_contacts: contacts });
  };

  // Allow editing for both active and pending_approval profiles
  const canEdit = child?.status === 'active' || child?.status === 'pending_approval';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cg-sage mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !child) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-600">Error Loading Profile</p>
              <p className="text-sm text-red-600/80 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/family-files/${familyFileId}`)}
            className="mt-4 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
          >
            Back to Family File
          </button>
        </div>
      </div>
    );
  }

  if (!child) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href={`/family-files/${familyFileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-cg-sage transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Family File
      </Link>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-cg-sage/10 border border-cg-sage/20 rounded-2xl flex items-center gap-3 shadow-sm">
          <CheckCircle className="h-5 w-5 text-cg-sage flex-shrink-0" />
          <p className="text-sm text-cg-sage font-medium">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Pending Approval Banner */}
      {child.status === 'pending_approval' && (
        <div className="bg-card border border-yellow-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Pending Approval</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Both parents need to approve before this profile becomes active.
              </p>

              {(() => {
                // Normalize IDs for comparison (handles UUID case differences)
                const userId = user?.id?.toLowerCase?.() || user?.id;
                const approvedA = child.approved_by_a?.toLowerCase?.() || child.approved_by_a;
                const approvedB = child.approved_by_b?.toLowerCase?.() || child.approved_by_b;
                const hasApproved = userId && (approvedA === userId || approvedB === userId);
                const bothApproved = approvedA && approvedB;

                if (bothApproved) {
                  return (
                    <div className="mt-3 px-3 py-2 bg-cg-sage/10 text-cg-sage rounded-xl text-sm font-medium inline-flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Both parents approved — activating profile
                    </div>
                  );
                } else if (hasApproved) {
                  return (
                    <div className="mt-3 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-xl text-sm font-medium inline-flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      You've approved — waiting for co-parent
                    </div>
                  );
                } else {
                  return (
                    <button
                      onClick={handleApprove}
                      disabled={saving}
                      className="mt-3 px-4 py-2 bg-cg-sage text-white rounded-xl hover:bg-cg-sage/90 disabled:opacity-50 transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Approve Profile
                        </>
                      )}
                    </button>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Decorative Header */}
        <div className="h-20 sm:h-24 bg-gradient-to-r from-cg-sage via-cg-sage/90 to-cg-sage/70 relative">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        </div>

        {/* Profile Info */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-10 sm:-mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Photo with Upload */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white shadow-lg ring-4 ring-white overflow-hidden flex-shrink-0">
                {child.photo_url && !imageError ? (
                  <img
                    src={getImageUrl(child.photo_url) || ''}
                    alt={child.first_name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cg-sage/20 to-cg-sage/5 flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl">
                      {child.gender === 'male' ? '👦' : child.gender === 'female' ? '👧' : '👶'}
                    </span>
                  </div>
                )}
              </div>
              {/* Upload Overlay */}
              {canEdit && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 pt-1 sm:pt-2">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    {child.preferred_name || child.first_name} {child.last_name}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
                    {formatAge(child.date_of_birth)}
                    {child.school_name && <span className="hidden sm:inline"> • {child.school_name}</span>}
                    {child.grade_level && <span className="hidden sm:inline">, {child.grade_level}</span>}
                  </p>
                </div>
                <StatusBadge status={child.status} />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-border">
            <Link href={`/family-files/${familyFileId}/children/${childId}/cubbie`}>
              <button className="px-4 py-2.5 bg-cg-sage text-white rounded-xl hover:bg-cg-sage/90 transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2">
                <Package className="h-4 w-4" />
                {child.first_name}'s Cubbie
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setEditMode(false);
              setError(null);
            }}
          />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <SectionCard
          title="About"
          icon={<User className="h-4 w-4 text-cg-sage" />}
          canEdit={canEdit}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onCancel={() => {
            setEditMode(false);
            populateForms(child);
          }}
          onSave={() =>
            handleSave(async () => {
              await childrenAPI.updateBasic(childId, basicForm);
            })
          }
          isSaving={saving}
        >
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="First Name"
                  value={basicForm.first_name}
                  onChange={(v) => setBasicForm({ ...basicForm, first_name: v })}
                />
                <FormInput
                  label="Middle Name"
                  value={basicForm.middle_name}
                  onChange={(v) => setBasicForm({ ...basicForm, middle_name: v })}
                />
              </div>
              <FormInput
                label="Last Name"
                value={basicForm.last_name}
                onChange={(v) => setBasicForm({ ...basicForm, last_name: v })}
              />
              <FormInput
                label="Preferred Name"
                value={basicForm.preferred_name}
                onChange={(v) => setBasicForm({ ...basicForm, preferred_name: v })}
                placeholder="Nickname or name they go by"
              />
              <FormInput
                label="Date of Birth"
                type="date"
                value={basicForm.date_of_birth}
                onChange={(v) => setBasicForm({ ...basicForm, date_of_birth: v })}
              />
              <FormSelect
                label="Gender"
                value={basicForm.gender}
                onChange={(v) => setBasicForm({ ...basicForm, gender: v })}
                options={[
                  { value: '', label: 'Prefer not to say' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'non_binary', label: 'Non-binary' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <InfoField label="First Name" value={child.first_name} />
              <InfoField label="Middle Name" value={child.middle_name} />
              <InfoField label="Last Name" value={child.last_name} />
              <InfoField label="Preferred Name" value={child.preferred_name} />
              <InfoField
                label="Date of Birth"
                value={
                  child.date_of_birth
                    ? new Date(child.date_of_birth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                    : null
                }
              />
              <InfoField label="Gender" value={child.gender ? child.gender.replace('_', '-') : null} />
            </div>
          )}
        </SectionCard>
      )}

      {activeTab === 'medical' && (
        <SectionCard
          title="Medical Information"
          icon={<Heart className="h-4 w-4 text-cg-sage" />}
          canEdit={canEdit}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onCancel={() => {
            setEditMode(false);
            populateForms(child);
          }}
          onSave={() =>
            handleSave(async () => {
              await childrenAPI.updateMedical(childId, medicalForm);
            })
          }
          isSaving={saving}
        >
          {editMode ? (
            <div className="space-y-6">
              <FormTextarea
                label="Allergies"
                value={medicalForm.allergies}
                onChange={(v) => setMedicalForm({ ...medicalForm, allergies: v })}
                placeholder="Food, medication, environmental allergies"
              />
              <FormTextarea
                label="Medications"
                value={medicalForm.medications}
                onChange={(v) => setMedicalForm({ ...medicalForm, medications: v })}
                placeholder="Current medications and dosages"
              />
              <FormTextarea
                label="Medical Conditions"
                value={medicalForm.medical_conditions}
                onChange={(v) => setMedicalForm({ ...medicalForm, medical_conditions: v })}
                placeholder="Ongoing conditions or health concerns"
              />
              <FormSelect
                label="Blood Type"
                value={medicalForm.blood_type}
                onChange={(v) => setMedicalForm({ ...medicalForm, blood_type: v })}
                options={[
                  { value: '', label: 'Unknown' },
                  { value: 'A+', label: 'A+' },
                  { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' },
                  { value: 'AB+', label: 'AB+' },
                  { value: 'AB-', label: 'AB-' },
                  { value: 'O+', label: 'O+' },
                  { value: 'O-', label: 'O-' },
                ]}
              />

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-cg-sage" />
                  Healthcare Providers
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Pediatrician"
                    value={medicalForm.pediatrician_name}
                    onChange={(v) => setMedicalForm({ ...medicalForm, pediatrician_name: v })}
                  />
                  <FormInput
                    label="Pediatrician Phone"
                    value={medicalForm.pediatrician_phone}
                    onChange={(v) => setMedicalForm({ ...medicalForm, pediatrician_phone: v })}
                  />
                  <FormInput
                    label="Dentist"
                    value={medicalForm.dentist_name}
                    onChange={(v) => setMedicalForm({ ...medicalForm, dentist_name: v })}
                  />
                  <FormInput
                    label="Dentist Phone"
                    value={medicalForm.dentist_phone}
                    onChange={(v) => setMedicalForm({ ...medicalForm, dentist_phone: v })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4">Insurance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Provider"
                    value={medicalForm.insurance_provider}
                    onChange={(v) => setMedicalForm({ ...medicalForm, insurance_provider: v })}
                  />
                  <FormInput
                    label="Policy Number"
                    value={medicalForm.insurance_policy_number}
                    onChange={(v) => setMedicalForm({ ...medicalForm, insurance_policy_number: v })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <InfoField label="Allergies" value={child.allergies} emptyText="None reported" />
                <InfoField label="Blood Type" value={child.blood_type} emptyText="Unknown" />
              </div>
              <InfoField label="Medications" value={child.medications} emptyText="None" />
              <InfoField label="Medical Conditions" value={child.medical_conditions} emptyText="None reported" />

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-cg-sage" />
                  Healthcare Providers
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Pediatrician</p>
                    <p className="text-foreground">{child.pediatrician_name || '-'}</p>
                    {child.pediatrician_phone && (
                      <p className="text-sm text-muted-foreground">{child.pediatrician_phone}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Dentist</p>
                    <p className="text-foreground">{child.dentist_name || '-'}</p>
                    {child.dentist_phone && <p className="text-sm text-muted-foreground">{child.dentist_phone}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4">Insurance</h4>
                <div className="grid grid-cols-2 gap-6">
                  <InfoField label="Provider" value={child.insurance_provider} />
                  <InfoField label="Policy Number" value={child.insurance_policy_number} />
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {activeTab === 'education' && (
        <SectionCard
          title="Education"
          icon={<GraduationCap className="h-4 w-4 text-cg-sage" />}
          canEdit={canEdit}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onCancel={() => {
            setEditMode(false);
            populateForms(child);
          }}
          onSave={() =>
            handleSave(async () => {
              await childrenAPI.updateEducation(childId, educationForm);
            })
          }
          isSaving={saving}
        >
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="School Name"
                  value={educationForm.school_name}
                  onChange={(v) => setEducationForm({ ...educationForm, school_name: v })}
                />
                <FormInput
                  label="Grade Level"
                  value={educationForm.grade_level}
                  onChange={(v) => setEducationForm({ ...educationForm, grade_level: v })}
                  placeholder="e.g., 3rd Grade"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Teacher Name"
                  value={educationForm.teacher_name}
                  onChange={(v) => setEducationForm({ ...educationForm, teacher_name: v })}
                />
                <FormInput
                  label="Teacher Email"
                  type="email"
                  value={educationForm.teacher_email}
                  onChange={(v) => setEducationForm({ ...educationForm, teacher_email: v })}
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={educationForm.has_iep}
                    onChange={(e) => setEducationForm({ ...educationForm, has_iep: e.target.checked })}
                    className="w-4 h-4 text-cg-sage border-border rounded"
                  />
                  <span className="text-sm">Has IEP</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={educationForm.has_504_plan}
                    onChange={(e) => setEducationForm({ ...educationForm, has_504_plan: e.target.checked })}
                    className="w-4 h-4 text-cg-sage border-border rounded"
                  />
                  <span className="text-sm">Has 504 Plan</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">School</p>
                <p className="text-foreground text-lg font-medium">{child.school_name || '-'}</p>
              </div>
              <InfoField label="Grade Level" value={child.grade_level} />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Teacher</p>
                <p className="text-foreground">{child.teacher_name || '-'}</p>
                {child.teacher_email && <p className="text-sm text-muted-foreground">{child.teacher_email}</p>}
              </div>

              {(child.has_iep || child.has_504_plan) && (
                <div className="flex gap-2">
                  {child.has_iep && (
                    <span className="px-3 py-1 bg-cg-sage/10 text-cg-sage text-sm font-medium rounded-full">
                      Has IEP
                    </span>
                  )}
                  {child.has_504_plan && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                      Has 504 Plan
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {activeTab === 'preferences' && (
        <SectionCard
          title="Preferences & Personality"
          icon={<Star className="h-4 w-4 text-cg-sage" />}
          canEdit={canEdit}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onCancel={() => {
            setEditMode(false);
            populateForms(child);
          }}
          onSave={() =>
            handleSave(async () => {
              await childrenAPI.updatePreferences(childId, preferencesForm);
            })
          }
          isSaving={saving}
        >
          {editMode ? (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-foreground mb-4">Food</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormTextarea
                    label="Favorite Foods"
                    value={preferencesForm.favorite_foods}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, favorite_foods: v })}
                    rows={2}
                  />
                  <FormTextarea
                    label="Food Dislikes"
                    value={preferencesForm.food_dislikes}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, food_dislikes: v })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cg-sage" />
                  Activities & Comfort
                </h4>
                <div className="space-y-4">
                  <FormTextarea
                    label="Favorite Activities"
                    value={preferencesForm.favorite_activities}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, favorite_activities: v })}
                  />
                  <FormTextarea
                    label="Comfort Items"
                    value={preferencesForm.comfort_items}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, comfort_items: v })}
                    placeholder="Special toys, blankets, or items"
                  />
                  <FormTextarea
                    label="Bedtime Routine"
                    value={preferencesForm.bedtime_routine}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, bedtime_routine: v })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Shirt className="h-4 w-4 text-cg-sage" />
                  Sizes
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Clothing Size"
                    value={preferencesForm.clothing_size}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, clothing_size: v })}
                  />
                  <FormInput
                    label="Shoe Size"
                    value={preferencesForm.shoe_size}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, shoe_size: v })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Moon className="h-4 w-4 text-cg-sage" />
                  Temperament & Emotional Needs
                </h4>
                <div className="space-y-4">
                  <FormTextarea
                    label="Temperament Notes"
                    value={preferencesForm.temperament_notes}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, temperament_notes: v })}
                    placeholder="General personality traits"
                  />
                  <FormTextarea
                    label="Fears & Anxieties"
                    value={preferencesForm.fears_anxieties}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, fears_anxieties: v })}
                  />
                  <FormTextarea
                    label="Calming Strategies"
                    value={preferencesForm.calming_strategies}
                    onChange={(v) => setPreferencesForm({ ...preferencesForm, calming_strategies: v })}
                    placeholder="What helps them calm down when upset"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-foreground mb-4">Food</h4>
                <div className="grid grid-cols-2 gap-6">
                  <InfoField label="Favorites" value={child.favorite_foods} />
                  <InfoField label="Dislikes" value={child.food_dislikes} />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cg-sage" />
                  Activities & Comfort
                </h4>
                <div className="space-y-4">
                  <InfoField label="Favorite Activities" value={child.favorite_activities} />
                  <InfoField label="Comfort Items" value={child.comfort_items} />
                  <InfoField label="Bedtime Routine" value={child.bedtime_routine} />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Shirt className="h-4 w-4 text-cg-sage" />
                  Sizes
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <InfoField label="Clothing" value={child.clothing_size} />
                  <InfoField label="Shoes" value={child.shoe_size} />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Moon className="h-4 w-4 text-cg-sage" />
                  Temperament & Emotional Needs
                </h4>
                <div className="space-y-4">
                  <InfoField label="Temperament" value={child.temperament_notes} />
                  <InfoField label="Fears & Anxieties" value={child.fears_anxieties} />
                  <InfoField label="Calming Strategies" value={child.calming_strategies} />
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {activeTab === 'emergency' && (
        <SectionCard
          title="Emergency Contacts"
          icon={<Phone className="h-4 w-4 text-cg-sage" />}
          canEdit={canEdit}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onCancel={() => {
            setEditMode(false);
            populateForms(child);
          }}
          onSave={() =>
            handleSave(async () => {
              await childrenAPI.updateEmergencyContacts(childId, emergencyForm);
            })
          }
          isSaving={saving}
        >
          {editMode ? (
            <div className="space-y-4">
              {emergencyForm.emergency_contacts.map((contact, index) => (
                <div key={index} className="p-4 bg-secondary/30 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Contact {index + 1}</span>
                    <button
                      onClick={() => removeEmergencyContact(index)}
                      className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormInput
                      label="Name"
                      value={contact.name}
                      onChange={(v) => updateEmergencyContact(index, 'name', v)}
                    />
                    <FormInput
                      label="Relationship"
                      value={contact.relationship}
                      onChange={(v) => updateEmergencyContact(index, 'relationship', v)}
                      placeholder="e.g., Grandmother"
                    />
                    <FormInput
                      label="Phone"
                      value={contact.phone}
                      onChange={(v) => updateEmergencyContact(index, 'phone', v)}
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={addEmergencyContact}
                className="w-full p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-cg-sage hover:border-cg-sage transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Emergency Contact
              </button>
            </div>
          ) : emergencyForm.emergency_contacts.length > 0 ? (
            <div className="space-y-4">
              {emergencyForm.emergency_contacts.map((contact, index) => (
                <div key={index} className="p-4 bg-secondary/30 rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-cg-sage/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-cg-sage" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="px-4 py-2 bg-cg-sage text-white rounded-full text-sm font-medium hover:bg-cg-sage/90 transition-colors"
                  >
                    {contact.phone}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No emergency contacts added yet</p>
              {canEdit && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
                >
                  <Plus className="h-4 w-4 mr-2 inline" />
                  Add Emergency Contact
                </button>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* Both Parents Can Add Indicator */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cg-sage/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-cg-sage" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Both parents can contribute</span> — all changes are tracked for transparency
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChildProfilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <PageContainer className="pb-32">
          <ChildProfileContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
