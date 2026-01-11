'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, MapPin, Clock, Package, FileText, Repeat, Box, CheckCircle, Navigation, QrCode, Loader2 } from 'lucide-react';
import {
  exchangesAPI,
  casesAPI,
  cubbieAPI,
  familyFilesAPI,
  CreateCustodyExchangeRequest,
  ExchangeType,
  RecurrencePattern,
  Child,
  CubbieItem,
  CubbieItemListResponse,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface ExchangeFormProps {
  caseId: string;
  agreementId?: string;  // Link exchange to specific SharedCare Agreement
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: Date;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '📱',
  school: '📚',
  sports: '⚽',
  medical: '🏥',
  musical: '🎸',
  other: '📦',
};

export default function ExchangeForm({
  caseId,
  onClose,
  onSuccess,
  initialDate,
}: ExchangeFormProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [cubbieItems, setCubbieItems] = useState<{ children: CubbieItemListResponse[] }>({ children: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    exchange_type: 'dropoff' as ExchangeType,
    title: '',
    location: '',
    location_notes: '',
    scheduled_time: initialDate ? formatDateTime(initialDate) : '',
    duration_minutes: 15,
    child_ids: [] as string[],
    // Per-child direction for "both" type exchanges
    child_directions: {} as Record<string, 'pickup' | 'dropoff' | 'none'>,
    is_recurring: false,
    recurrence_pattern: 'weekly' as RecurrencePattern,
    recurrence_days: [] as number[],
    recurrence_end_date: '',
    items_to_bring: '',
    special_instructions: '',
    notes_visible_to_coparent: true,
    selected_cubbie_items: [] as string[], // IDs of selected cubbie items
    // Silent Handoff settings
    silent_handoff_enabled: false,
    location_lat: null as number | null,
    location_lng: null as number | null,
    geofence_radius_meters: 100,
    check_in_window_before_minutes: 30,
    check_in_window_after_minutes: 30,
    qr_confirmation_required: false,
  });

  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [caseId]);

  const loadInitialData = async () => {
    try {
      setIsLoadingItems(true);

      // Try to load children - first try family file, then fall back to case
      let loadedChildren: Child[] = [];
      try {
        // Try family file API first (schedule page passes family file ID)
        const familyFileChildren = await familyFilesAPI.getChildren(caseId);
        loadedChildren = (familyFileChildren.items || []).map(fc => ({
          id: fc.id,
          first_name: fc.first_name,
          last_name: fc.last_name,
          date_of_birth: fc.date_of_birth,
          gender: fc.gender || '',
        }));
      } catch {
        // Fall back to case API if family file fails
        try {
          const caseData = await casesAPI.get(caseId);
          loadedChildren = caseData.children || [];
        } catch {
          console.log('Could not load children from case or family file');
        }
      }

      setChildren(loadedChildren);

      // Load cubbie items
      try {
        const itemsData = await cubbieAPI.listForCase(caseId);
        setCubbieItems(itemsData);
      } catch {
        console.log('Could not load cubbie items');
        setCubbieItems({ children: [] });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleGeocodeAddress = async () => {
    if (!formData.location.trim()) {
      setGeocodeError('Please enter an address first');
      return;
    }

    setIsGeocodingAddress(true);
    setGeocodeError(null);

    try {
      const result = await exchangesAPI.geocodeAddress(formData.location);
      setFormData(prev => ({
        ...prev,
        location: result.formatted_address,
        location_lat: result.latitude,
        location_lng: result.longitude,
      }));
    } catch (err: any) {
      setGeocodeError(err.message || 'Failed to geocode address');
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Build pickup/dropoff child lists from child_directions
      const pickupChildIds: string[] = [];
      const dropoffChildIds: string[] = [];

      for (const [childId, direction] of Object.entries(formData.child_directions)) {
        if (direction === 'pickup') {
          pickupChildIds.push(childId);
        } else if (direction === 'dropoff') {
          dropoffChildIds.push(childId);
        }
      }

      // Validate at least one child is selected
      if (pickupChildIds.length === 0 && dropoffChildIds.length === 0) {
        setError('Please select at least one child for pickup or dropoff');
        setIsLoading(false);
        return;
      }

      // Derive exchange_type from selections
      let exchangeType: ExchangeType;
      if (pickupChildIds.length > 0 && dropoffChildIds.length > 0) {
        exchangeType = 'both';
      } else if (pickupChildIds.length > 0) {
        exchangeType = 'pickup';
      } else {
        exchangeType = 'dropoff';
      }

      // Combine all selected child IDs
      const allChildIds = [...new Set([...pickupChildIds, ...dropoffChildIds])];

      // Generate title if not provided
      let title = formData.title;
      if (!title) {
        const typeLabels: Record<ExchangeType, string> = {
          pickup: 'Pickup',
          dropoff: 'Dropoff',
          both: 'Exchange',
        };
        title = typeLabels[exchangeType];
        if (formData.is_recurring) {
          title += ' (Recurring)';
        }
      }

      // Build items_to_bring including selected cubbie items names
      let itemsToBring = formData.items_to_bring;
      if (formData.selected_cubbie_items.length > 0) {
        const selectedItemNames = getAllCubbieItems()
          .filter(item => formData.selected_cubbie_items.includes(item.id))
          .map(item => item.name);
        if (itemsToBring) {
          itemsToBring += ', ' + selectedItemNames.join(', ');
        } else {
          itemsToBring = selectedItemNames.join(', ');
        }
      }

      const exchangeData: CreateCustodyExchangeRequest = {
        case_id: caseId,
        exchange_type: exchangeType,
        title,
        location: formData.location || undefined,
        location_notes: formData.location_notes || undefined,
        scheduled_time: new Date(formData.scheduled_time).toISOString(),
        duration_minutes: formData.duration_minutes,
        child_ids: allChildIds,
        pickup_child_ids: pickupChildIds.length > 0 ? pickupChildIds : undefined,
        dropoff_child_ids: dropoffChildIds.length > 0 ? dropoffChildIds : undefined,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : undefined,
        recurrence_days: formData.is_recurring && formData.recurrence_days.length > 0
          ? formData.recurrence_days
          : undefined,
        recurrence_end_date: formData.is_recurring && formData.recurrence_end_date
          ? new Date(formData.recurrence_end_date).toISOString()
          : undefined,
        items_to_bring: itemsToBring || undefined,
        special_instructions: formData.special_instructions || undefined,
        notes_visible_to_coparent: formData.notes_visible_to_coparent,
        // Silent Handoff settings
        silent_handoff_enabled: formData.silent_handoff_enabled,
        location_lat: formData.silent_handoff_enabled ? formData.location_lat || undefined : undefined,
        location_lng: formData.silent_handoff_enabled ? formData.location_lng || undefined : undefined,
        geofence_radius_meters: formData.silent_handoff_enabled ? formData.geofence_radius_meters : undefined,
        check_in_window_before_minutes: formData.silent_handoff_enabled ? formData.check_in_window_before_minutes : undefined,
        check_in_window_after_minutes: formData.silent_handoff_enabled ? formData.check_in_window_after_minutes : undefined,
        qr_confirmation_required: formData.silent_handoff_enabled ? formData.qr_confirmation_required : undefined,
      };

      const exchange = await exchangesAPI.create(exchangeData);

      // If cubbie items were selected, add them to the exchange
      if (formData.selected_cubbie_items.length > 0) {
        try {
          await cubbieAPI.addItemsToExchange(exchange.id, {
            cubbie_item_ids: formData.selected_cubbie_items,
            condition_sent: 'good', // Default condition
          });
        } catch (itemErr) {
          console.error('Failed to add items to exchange:', itemErr);
          // Don't fail the whole operation, exchange was created successfully
        }
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create exchange');
      console.error('Error creating exchange:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get all cubbie items flattened
  const getAllCubbieItems = (): CubbieItem[] => {
    return cubbieItems.children.flatMap(child => child.items);
  };

  const toggleChild = (childId: string) => {
    setFormData(prev => ({
      ...prev,
      child_ids: prev.child_ids.includes(childId)
        ? prev.child_ids.filter(id => id !== childId)
        : [...prev.child_ids, childId],
    }));
  };

  // Set direction for a specific child (used when exchange_type is "both")
  const setChildDirection = (childId: string, direction: 'pickup' | 'dropoff' | 'none') => {
    setFormData(prev => ({
      ...prev,
      child_directions: {
        ...prev.child_directions,
        [childId]: direction,
      },
    }));
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter(d => d !== day)
        : [...prev.recurrence_days, day].sort(),
    }));
  };

  const toggleCubbieItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_cubbie_items: prev.selected_cubbie_items.includes(itemId)
        ? prev.selected_cubbie_items.filter(id => id !== itemId)
        : [...prev.selected_cubbie_items, itemId],
    }));
  };

  // Get items for selected children only (or all if no children selected)
  const getRelevantCubbieItems = (): { child: CubbieItemListResponse; items: CubbieItem[] }[] => {
    // Get IDs of children with a direction selected
    const selectedChildIds = Object.entries(formData.child_directions)
      .filter(([, direction]) => direction === 'pickup' || direction === 'dropoff')
      .map(([id]) => id);

    return cubbieItems.children
      .filter(child => {
        if (selectedChildIds.length === 0) return true;
        return selectedChildIds.includes(child.child_id);
      })
      .map(child => ({
        child,
        items: child.items.filter(item => item.is_active),
      }))
      .filter(group => group.items.length > 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-2xl max-h-[95vh] overflow-y-auto bg-background">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-6 w-6 text-cg-primary" />
              <h2 className="text-xl font-bold text-foreground">Schedule Pickup/Dropoff</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Children Selection - At the top */}
            {isLoadingItems ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading children...</span>
              </div>
            ) : children.length > 0 ? (
              <div className="p-4 bg-cg-amber-subtle rounded-xl border border-cg-amber/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-cg-amber/20 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 text-cg-amber" />
                  </div>
                  <div>
                    <Label className="text-foreground font-semibold">Children Involved *</Label>
                    <p className="text-xs text-muted-foreground">
                      Select Drop Off or Pick Up for each child
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-cg-sage/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-cg-sage">
                          {child.first_name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-foreground min-w-[60px] truncate">
                        {child.first_name}
                      </span>
                      <div className="flex gap-2 flex-1">
                        <button
                          type="button"
                          onClick={() => setChildDirection(child.id, formData.child_directions[child.id] === 'dropoff' ? 'none' : 'dropoff')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 ${
                            formData.child_directions[child.id] === 'dropoff'
                              ? 'bg-cg-slate text-white shadow-md'
                              : 'bg-cg-slate-subtle text-cg-slate hover:bg-cg-slate/20 border border-cg-slate/30'
                          }`}
                        >
                          Drop Off
                        </button>
                        <button
                          type="button"
                          onClick={() => setChildDirection(child.id, formData.child_directions[child.id] === 'pickup' ? 'none' : 'pickup')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 ${
                            formData.child_directions[child.id] === 'pickup'
                              ? 'bg-cg-sage text-white shadow-md'
                              : 'bg-cg-sage-subtle text-cg-sage hover:bg-cg-sage/20 border border-cg-sage/30'
                          }`}
                        >
                          Pick Up
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-cg-amber-subtle border border-cg-amber/30 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  No children found. Please add children to your family file first.
                </p>
              </div>
            )}

            {/* Title (optional) */}
            <div>
              <Label htmlFor="title" className="text-foreground">Title (optional)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Friday Evening Exchange"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank for auto-generated title</p>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled_time" className="text-foreground">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Date & Time *
                </Label>
                <Input
                  id="scheduled_time"
                  type="datetime-local"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="duration" className="text-foreground">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="120"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 15 })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location" className="text-foreground">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value, location_lat: null, location_lng: null })}
                  placeholder="e.g., School parking lot, Police station"
                  className="flex-1"
                />
                {formData.silent_handoff_enabled && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeocodeAddress}
                    disabled={isGeocodingAddress || !formData.location.trim()}
                    className="shrink-0"
                  >
                    {isGeocodingAddress ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              {formData.location_lat && formData.location_lng && (
                <p className="text-xs text-green-600 mt-1">
                  GPS: {formData.location_lat.toFixed(6)}, {formData.location_lng.toFixed(6)}
                </p>
              )}
              {geocodeError && (
                <p className="text-xs text-destructive mt-1">{geocodeError}</p>
              )}
              <textarea
                id="location_notes"
                value={formData.location_notes}
                onChange={(e) => setFormData({ ...formData, location_notes: e.target.value })}
                placeholder="Additional location notes..."
                rows={2}
                className="w-full mt-2 px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Silent Handoff Settings */}
            <div className="p-4 bg-cg-sage-subtle rounded-lg border border-cg-sage/30">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="silent_handoff_enabled"
                  checked={formData.silent_handoff_enabled}
                  onChange={(e) => setFormData({ ...formData, silent_handoff_enabled: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="silent_handoff_enabled" className="cursor-pointer flex items-center gap-2 text-foreground font-medium">
                  <Navigation className="h-4 w-4 text-cg-sage" />
                  Enable Silent Handoff
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                GPS-verified check-ins for custody exchanges. Location is captured only at check-in moment - no continuous tracking.
              </p>

              {formData.silent_handoff_enabled && (
                <div className="space-y-4 pl-6 border-l-2 border-cg-sage/30">
                  {/* Geofence Radius */}
                  <div>
                    <Label htmlFor="geofence_radius" className="text-foreground text-sm">
                      Geofence Radius: {formData.geofence_radius_meters}m
                    </Label>
                    <input
                      type="range"
                      id="geofence_radius"
                      min="25"
                      max="500"
                      step="25"
                      value={formData.geofence_radius_meters}
                      onChange={(e) => setFormData({ ...formData, geofence_radius_meters: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>25m</span>
                      <span>500m</span>
                    </div>
                  </div>

                  {/* Check-in Window */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="window_before" className="text-foreground text-sm">
                        Window Before (min)
                      </Label>
                      <Input
                        type="number"
                        id="window_before"
                        min="5"
                        max="120"
                        value={formData.check_in_window_before_minutes}
                        onChange={(e) => setFormData({ ...formData, check_in_window_before_minutes: parseInt(e.target.value) || 30 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="window_after" className="text-foreground text-sm">
                        Window After (min)
                      </Label>
                      <Input
                        type="number"
                        id="window_after"
                        min="5"
                        max="120"
                        value={formData.check_in_window_after_minutes}
                        onChange={(e) => setFormData({ ...formData, check_in_window_after_minutes: parseInt(e.target.value) || 30 })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* QR Confirmation */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="qr_confirmation"
                      checked={formData.qr_confirmation_required}
                      onChange={(e) => setFormData({ ...formData, qr_confirmation_required: e.target.checked })}
                      className="rounded border-input"
                    />
                    <Label htmlFor="qr_confirmation" className="cursor-pointer flex items-center gap-2 text-foreground text-sm">
                      <QrCode className="h-4 w-4" />
                      Require QR code confirmation
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When enabled, both parents must scan a QR code to complete the exchange.
                  </p>

                  {/* Geocode reminder */}
                  {!formData.location_lat && formData.location && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded p-2">
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        Click the <Navigation className="inline h-3 w-3" /> button next to the location to set GPS coordinates for the geofence.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recurring */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="is_recurring" className="cursor-pointer flex items-center gap-1 text-foreground">
                  <Repeat className="h-4 w-4" />
                  Make this a recurring exchange
                </Label>
              </div>

              {formData.is_recurring && (
                <div className="mt-4 space-y-4 pl-6 border-l-2 border-cg-primary/30">
                  {/* Recurrence Pattern */}
                  <div>
                    <Label htmlFor="recurrence_pattern" className="text-foreground">Repeat</Label>
                    <select
                      id="recurrence_pattern"
                      value={formData.recurrence_pattern}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurrence_pattern: e.target.value as RecurrencePattern
                      })}
                      className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 weeks</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom days</option>
                    </select>
                  </div>

                  {/* Days of Week (for weekly/custom) */}
                  {(formData.recurrence_pattern === 'weekly' || formData.recurrence_pattern === 'custom') && (
                    <div>
                      <Label className="text-foreground">On these days</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              formData.recurrence_days.includes(day.value)
                                ? 'bg-cg-primary text-white'
                                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* End Date */}
                  <div>
                    <Label htmlFor="recurrence_end_date" className="text-foreground">End Date (optional)</Label>
                    <Input
                      id="recurrence_end_date"
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave blank for no end date</p>
                  </div>
                </div>
              )}
            </div>

            {/* KidsCubbie Items Selector */}
            {!isLoadingItems && getRelevantCubbieItems().length > 0 && (
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Box className="h-5 w-5 text-green-600" />
                  <Label className="text-foreground font-medium">KidsCubbie Items to Transfer</Label>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Select high-value items that will travel with the child during this exchange.
                  Item locations will be automatically updated.
                </p>
                <div className="space-y-4">
                  {getRelevantCubbieItems().map(({ child, items }) => (
                    <div key={child.child_id}>
                      <p className="text-sm font-medium text-foreground mb-2">{child.child_name}'s Items</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map((item) => {
                          const isSelected = formData.selected_cubbie_items.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleCubbieItem(item.id)}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                                isSelected
                                  ? 'border-green-500 bg-green-500/20'
                                  : 'border-border bg-background hover:border-green-500/50'
                              }`}
                            >
                              {isSelected ? (
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <span className="text-lg flex-shrink-0">{CATEGORY_ICONS[item.category] || '📦'}</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {item.current_location.replace('_', ' ')}
                                  {item.estimated_value && ` · $${item.estimated_value}`}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {formData.selected_cubbie_items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-500/30">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      ✓ {formData.selected_cubbie_items.length} item{formData.selected_cubbie_items.length !== 1 ? 's' : ''} will be tracked in this exchange
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Additional Items (text input for non-cubbie items) */}
            <div>
              <Label htmlFor="items_to_bring" className="text-foreground">
                <Package className="inline h-4 w-4 mr-1" />
                Additional Items (not in KidsCubbie)
              </Label>
              <Input
                id="items_to_bring"
                value={formData.items_to_bring}
                onChange={(e) => setFormData({ ...formData, items_to_bring: e.target.value })}
                placeholder="e.g., Library books, permission slip"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                For everyday items not tracked in KidsCubbie
              </p>
            </div>

            {/* Special Instructions */}
            <div>
              <Label htmlFor="special_instructions" className="text-foreground">
                <FileText className="inline h-4 w-4 mr-1" />
                Special Instructions
              </Label>
              <textarea
                id="special_instructions"
                value={formData.special_instructions}
                onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                placeholder="Any specific instructions for this exchange..."
                rows={3}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="notes_visible"
                  checked={formData.notes_visible_to_coparent}
                  onChange={(e) => setFormData({ ...formData, notes_visible_to_coparent: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="notes_visible" className="cursor-pointer text-sm text-foreground">
                  Share notes with co-parent
                </Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="sm:flex-shrink-0"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-cg-sage hover:bg-cg-sage-dark text-white"
              >
                {isLoading ? 'Creating...' : formData.is_recurring ? 'Create Recurring Exchange' : 'Create Exchange'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
