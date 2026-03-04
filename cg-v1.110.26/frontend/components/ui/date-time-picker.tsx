"use client";

import * as React from "react";
import { format, parse, setHours, setMinutes, isValid } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DateTimePickerProps {
    /** Current value in datetime-local format (YYYY-MM-DDTHH:mm) */
    value: string;
    /** Called when the value changes */
    onChange: (value: string) => void;
    /** Minimum date/time allowed */
    min?: string;
    /** Label for the field */
    label?: string;
    /** Whether the field is required */
    required?: boolean;
    /** Placeholder text */
    placeholder?: string;
    /** Whether to show only date (no time) */
    dateOnly?: boolean;
    /** Disabled state */
    disabled?: boolean;
}

// Generate time options in 15-minute increments
const generateTimeOptions = () => {
    const options: { value: string; label: string }[] = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const h = hour.toString().padStart(2, "0");
            const m = minute.toString().padStart(2, "0");
            const value = `${h}:${m}`;
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const ampm = hour < 12 ? "AM" : "PM";
            const label = `${displayHour}:${m} ${ampm}`;
            options.push({ value, label });
        }
    }
    return options;
};

const TIME_OPTIONS = generateTimeOptions();

export function DateTimePicker({
    value,
    onChange,
    min,
    label,
    required,
    placeholder = "Select date & time",
    dateOnly = false,
    disabled = false,
}: DateTimePickerProps) {
    const [open, setOpen] = React.useState(false);

    // Parse the current value
    const parseValue = (val: string): { date: Date | undefined; time: string } => {
        if (!val) return { date: undefined, time: "09:00" };

        try {
            // Handle datetime-local format: YYYY-MM-DDTHH:mm
            if (val.includes("T")) {
                const [datePart, timePart] = val.split("T");
                const date = parse(datePart, "yyyy-MM-dd", new Date());
                return {
                    date: isValid(date) ? date : undefined,
                    time: timePart?.slice(0, 5) || "09:00",
                };
            }
            // Handle date-only format: YYYY-MM-DD
            const date = parse(val, "yyyy-MM-dd", new Date());
            return {
                date: isValid(date) ? date : undefined,
                time: "09:00",
            };
        } catch {
            return { date: undefined, time: "09:00" };
        }
    };

    const { date: selectedDate, time: selectedTime } = parseValue(value);

    // Parse min date
    const minDate = React.useMemo(() => {
        if (!min) return undefined;
        try {
            const minDatePart = min.includes("T") ? min.split("T")[0] : min;
            const parsed = parse(minDatePart, "yyyy-MM-dd", new Date());
            return isValid(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    }, [min]);

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;

        const dateStr = format(date, "yyyy-MM-dd");
        if (dateOnly) {
            onChange(dateStr);
        } else {
            onChange(`${dateStr}T${selectedTime}`);
        }
    };

    const handleTimeChange = (time: string) => {
        if (!selectedDate) {
            // If no date selected, use today
            const today = format(new Date(), "yyyy-MM-dd");
            onChange(`${today}T${time}`);
        } else {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            onChange(`${dateStr}T${time}`);
        }
    };

    const formatDisplayValue = () => {
        if (!value) return placeholder;

        if (selectedDate && isValid(selectedDate)) {
            const dateStr = format(selectedDate, "MMM d, yyyy");
            if (dateOnly) return dateStr;

            // Format time for display
            const [hours, minutes] = selectedTime.split(":").map(Number);
            const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            const ampm = hours < 12 ? "AM" : "PM";
            const timeStr = `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;

            return `${dateStr} at ${timeStr}`;
        }

        return placeholder;
    };

    return (
        <div className="space-y-2">
            {label && (
                <Label>
                    <Clock className="h-4 w-4 inline mr-1" />
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}

            <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground"
                )}
                onClick={() => setOpen(true)}
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDisplayValue()}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-fit p-0">
                    <DialogHeader className="px-4 pt-4 pb-2">
                        <DialogTitle className="text-base">
                            {label || "Select Date & Time"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col sm:flex-row gap-4 p-4 pt-0">
                        {/* Calendar */}
                        <div className="border rounded-lg">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                disabled={(date) => minDate ? date < minDate : false}
                                initialFocus
                            />
                        </div>

                        {/* Time Selector */}
                        {!dateOnly && (
                            <div className="flex flex-col gap-3 min-w-[140px]">
                                <Label className="text-sm font-medium">Time</Label>
                                <Select value={selectedTime} onValueChange={handleTimeChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select time" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[280px]">
                                        {TIME_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Quick time buttons */}
                                <div className="grid grid-cols-2 gap-1.5 mt-2">
                                    {["09:00", "12:00", "14:00", "17:00"].map((time) => {
                                        const [h] = time.split(":").map(Number);
                                        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                                        const ampm = h < 12 ? "AM" : "PM";
                                        return (
                                            <Button
                                                key={time}
                                                type="button"
                                                variant={selectedTime === time ? "default" : "outline"}
                                                size="sm"
                                                className="text-xs"
                                                onClick={() => handleTimeChange(time)}
                                            >
                                                {displayH}:00 {ampm}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 p-4 pt-0 border-t mt-2">
                        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={() => setOpen(false)}>
                            Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
