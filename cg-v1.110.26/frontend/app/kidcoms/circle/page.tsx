'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Plus,
  Check,
  X,
  Loader2,
  ChevronLeft,
  Mail,
  Phone,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  circleAPI,
  familyFilesAPI,
  CircleContact,
  CircleContactCreate,
  RelationshipChoice,
} from '@/lib/api';

interface Child {
  id: string;
  first_name: string;
  preferred_name?: string;
}

function CircleManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('case');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [relationshipChoices, setRelationshipChoices] = useState<RelationshipChoice[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<CircleContact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CircleContactCreate>({
    family_file_id: familyFileId || '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    relationship_type: 'other',
    notes: '',
  });

  useEffect(() => {
    if (familyFileId) {
      loadData();
    }
  }, [familyFileId]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      const [contactsData, familyData, choices] = await Promise.all([
        circleAPI.list(familyFileId!, { includeInactive: true }),
        familyFilesAPI.get(familyFileId!),
        circleAPI.getRelationshipChoices(),
      ]);

      setContacts(contactsData.items);
      setChildren(familyData.children || []);
      setRelationshipChoices(choices);
    } catch (err) {
      console.error('Error loading circle data:', err);
      setError('Failed to load circle contacts');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.contact_name.trim()) return;

    try {
      setIsSubmitting(true);

      if (editingContact) {
        // Update existing contact
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
        // Create new contact
        const newContact = await circleAPI.create({
          ...formData,
          family_file_id: familyFileId!,
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
      const result = await circleAPI.sendInvite(contactId, { sendEmail: true });
      if (result.success) {
        alert('Verification invite sent!');
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error('Error sending invite:', err);
    }
  }

  function startEdit(contact: CircleContact) {
    setEditingContact(contact);
    setFormData({
      family_file_id: familyFileId!,
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
      family_file_id: familyFileId!,
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      relationship_type: 'other',
      notes: '',
    });
  }

  function getApprovalStatus(contact: CircleContact) {
    if (contact.is_fully_approved) {
      return { icon: CheckCircle, color: 'text-green-500', text: 'Fully Approved' };
    }
    if (contact.is_partially_approved) {
      return { icon: Clock, color: 'text-yellow-500', text: 'Pending Approval' };
    }
    return { icon: AlertCircle, color: 'text-gray-400', text: 'Not Approved' };
  }

  if (!familyFileId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No family file selected</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/kidcoms?case=${familyFileId}`)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Circle</h1>
                <p className="text-sm text-gray-500">
                  Manage approved contacts for video calls
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contact_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <select
                    value={formData.relationship_type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, relationship_type: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {relationshipChoices.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contact_email: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : editingContact ? (
                    'Save Changes'
                  ) : (
                    'Add Contact'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
            <p className="text-gray-500 mb-4">
              Add trusted contacts like grandparents, aunts, uncles, or family friends
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => {
              const status = getApprovalStatus(contact);
              const StatusIcon = status.icon;

              return (
                <div
                  key={contact.id}
                  className={`bg-white rounded-xl shadow-sm border p-4 ${
                    !contact.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-semibold text-lg">
                        {contact.contact_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">
                            {contact.contact_name}
                          </h3>
                          <span className={`flex items-center space-x-1 text-sm ${status.color}`}>
                            <StatusIcon className="h-4 w-4" />
                            <span>{status.text}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 capitalize">
                          {contact.relationship_type.replace('_', ' ')}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          {contact.contact_email && (
                            <span className="flex items-center space-x-1">
                              <Mail className="h-4 w-4" />
                              <span>{contact.contact_email}</span>
                            </span>
                          )}
                          {contact.contact_phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="h-4 w-4" />
                              <span>{contact.contact_phone}</span>
                            </span>
                          )}
                        </div>
                        {contact.notes && (
                          <p className="mt-2 text-sm text-gray-600">{contact.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Approval Buttons */}
                      {!contact.is_fully_approved && (
                        <button
                          onClick={() => handleApprove(contact.id, true)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Approve"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                      )}

                      {/* Send Invite */}
                      {!contact.is_verified && contact.contact_email && (
                        <button
                          onClick={() => handleSendInvite(contact.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Send verification invite"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => startEdit(contact)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Remove"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CircleManagementPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    }>
      <CircleManagementContent />
    </Suspense>
  );
}
