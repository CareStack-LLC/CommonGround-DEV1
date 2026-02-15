"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Video,
  FileText,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ConflictWarning } from "./conflict-warning";

interface EventFormData {
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone: string;
  location: string;
  virtual_meeting_url: string;
  family_file_id: string;
  parent_visibility: string;
  reminder_minutes: number;
  notes: string;
  color: string;
  attendee_ids: string[];
  attendee_emails: string[];
}

interface EventConflict {
  event_id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  overlap_minutes: number;
}

interface CaseOption {
  id: string;
  title: string;
}

interface EventFormProps {
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<EventFormData>;
  cases?: CaseOption[];
  isEdit?: boolean;
  onCheckConflicts?: (startTime: string, endTime: string) => Promise<EventConflict[]>;
}

const EVENT_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "court_hearing", label: "Court Hearing" },
  { value: "video_call", label: "Video Call" },
  { value: "document_deadline", label: "Document Deadline" },
  { value: "consultation", label: "Consultation" },
  { value: "deposition", label: "Deposition" },
  { value: "mediation", label: "Mediation" },
  { value: "other", label: "Other" },
];

const VISIBILITY_OPTIONS = [
  { value: "none", label: "Only me" },
  { value: "required_parent", label: "Required parent(s)" },
  { value: "both_parents", label: "Both parents" },
];

const REMINDER_OPTIONS = [
  { value: 0, label: "No reminder" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

const COLOR_OPTIONS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#DC2626", label: "Red" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#6B7280", label: "Gray" },
];

const defaultFormData: EventFormData = {
  title: "",
  description: "",
  event_type: "meeting",
  start_time: "",
  end_time: "",
  all_day: false,
  timezone: "America/Los_Angeles",
  location: "",
  virtual_meeting_url: "",
  family_file_id: "",
  parent_visibility: "none",
  reminder_minutes: 30,
  notes: "",
  color: "#3B82F6",
  attendee_ids: [],
  attendee_emails: [],
};

export function EventForm({
  onSubmit,
  onCancel,
  initialData,
  cases = [],
  isEdit = false,
  onCheckConflicts,
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [conflicts, setConflicts] = useState<EventConflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseParents, setCaseParents] = useState<{ id: string, name: string }[]>([]);

  // Check for conflicts when times change
  useEffect(() => {
    const doCheckConflicts = async () => {
      if (!formData.start_time || !formData.end_time || !onCheckConflicts) return;

      const startDate = new Date(formData.start_time);
      const endDate = new Date(formData.end_time);

      if (endDate <= startDate) return;

      setCheckingConflicts(true);
      try {
        const foundConflicts = await onCheckConflicts(
          startDate.toISOString(),
          endDate.toISOString()
        );
        setConflicts(foundConflicts || []);
      } catch (err) {
        console.error("Failed to check conflicts:", err);
      } finally {
        setCheckingConflicts(false);
      }
    };

    const debounce = setTimeout(doCheckConflicts, 500);
    return () => clearTimeout(debounce);
  }, [formData.start_time, formData.end_time, onCheckConflicts]);

  const handleChange = (field: keyof EventFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const toggleAttendee = (id: string) => {
    setFormData(prev => {
      const ids = prev.attendee_ids.includes(id)
        ? prev.attendee_ids.filter(i => i !== id)
        : [...prev.attendee_ids, id];
      return { ...prev, attendee_ids: ids };
    });
  };

  // Fetch parents when case changes
  useEffect(() => {
    const fetchCaseParents = async () => {
      if (!formData.family_file_id) {
        setCaseParents([]);
        return;
      }
      // Note: In real app, we'd use a dedicated endpoint or get this from cases metadata
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/family-files/${formData.family_file_id}`);
        if (res.ok) {
          const data = await res.json();
          const parents = [];
          if (data.parent_a_info) parents.push({ id: data.parent_a_info.id, name: `${data.parent_a_info.first_name} ${data.parent_a_info.last_name}` });
          if (data.parent_b_info) parents.push({ id: data.parent_b_info.id, name: `${data.parent_b_info.first_name} ${data.parent_b_info.last_name}` });
          setCaseParents(parents);
        }
      } catch (err) {
        console.error("Failed to fetch case parents:", err);
      }
    };
    fetchCaseParents();
  }, [formData.family_file_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      setError("Start and end times are required");
      return;
    }

    const startDate = new Date(formData.start_time);
    const endDate = new Date(formData.end_time);

    if (endDate <= startDate) {
      setError("End time must be after start time");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Event title"
          required
        />
      </div>

      {/* Event Type and Color */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Event Type</Label>
          <Select
            value={formData.event_type}
            onValueChange={(v) => handleChange("event_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <Select value={formData.color} onValueChange={(v) => handleChange("color", v)}>
            <SelectTrigger>
              <SelectValue>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: formData.color }}
                  />
                  {COLOR_OPTIONS.find((c) => c.value === formData.color)?.label}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {COLOR_OPTIONS.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* All Day Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="all_day">All day event</Label>
        <Switch
          id="all_day"
          checked={formData.all_day}
          onCheckedChange={(v) => handleChange("all_day", v)}
        />
      </div>

      {/* Date/Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DateTimePicker
          label="Start"
          value={formData.start_time}
          onChange={(v) => handleChange("start_time", v)}
          dateOnly={formData.all_day}
          required
        />

        <DateTimePicker
          label="End"
          value={formData.end_time}
          onChange={(v) => handleChange("end_time", v)}
          min={formData.start_time}
          dateOnly={formData.all_day}
          required
        />
      </div>

      {/* Conflict Warning */}
      {(conflicts.length > 0 || checkingConflicts) && (
        <ConflictWarning conflicts={conflicts} isLoading={checkingConflicts} />
      )}

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">
          <MapPin className="h-4 w-4 inline mr-1" />
          Location
        </Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => handleChange("location", e.target.value)}
          placeholder="Physical location or address"
        />
      </div>

      {/* Video Meeting URL */}
      <div className="space-y-2">
        <Label htmlFor="virtual_meeting_url">
          <Video className="h-4 w-4 inline mr-1" />
          Video Meeting URL
        </Label>
        <Input
          id="virtual_meeting_url"
          type="url"
          value={formData.virtual_meeting_url}
          onChange={(e) => handleChange("virtual_meeting_url", e.target.value)}
          placeholder="https://zoom.us/j/... or https://meet.google.com/..."
        />
      </div>

      {/* Case Link */}
      {cases.length > 0 && (
        <div className="space-y-2">
          <Label>
            <FileText className="h-4 w-4 inline mr-1" />
            Link to Case
          </Label>
          <Select
            value={formData.family_file_id || "none"}
            onValueChange={(v) => handleChange("family_file_id", v === "none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a case (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No case</SelectItem>
              {cases.map((caseItem) => (
                <SelectItem key={caseItem.id} value={caseItem.id}>
                  {caseItem.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Parent Visibility */}
      <div className="space-y-2">
        <Label>
          <Users className="h-4 w-4 inline mr-1" />
          Parent Visibility
        </Label>
        <Select
          value={formData.parent_visibility}
          onValueChange={(v) => handleChange("parent_visibility", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controls whether parents can see this event on their calendar
        </p>
      </div>

      {/* Attendees */}
      {caseParents.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Invite Attendees
          </Label>
          <div className="flex flex-wrap gap-2">
            {caseParents.map(parent => (
              <button
                key={parent.id}
                type="button"
                onClick={() => toggleAttendee(parent.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${formData.attendee_ids.includes(parent.id)
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
              >
                <div className="h-4 w-4 rounded-full bg-indigo-100 flex items-center justify-center text-[10px]">
                  {parent.name[0]}
                </div>
                {parent.name}
                {formData.attendee_ids.includes(parent.id) && (
                  <div className="h-3 w-3 bg-indigo-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-2 w-2 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">
            Invitees will receive a notification and can RSVP.
          </p>
        </div>
      )}

      {/* Reminder */}
      <div className="space-y-2">
        <Label>Reminder</Label>
        <Select
          value={String(formData.reminder_minutes)}
          onValueChange={(v) => handleChange("reminder_minutes", parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Event description..."
          rows={3}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Private Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Notes visible only to you..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Create Event"
          )}
        </Button>
      </div>
    </form>
  );
}
