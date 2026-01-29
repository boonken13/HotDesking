import { useState, useEffect } from "react";
import {
  format,
  addDays,
  startOfWeek,
  isWeekend,
  isBefore,
  startOfToday,
  eachDayOfInterval,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Sun, Moon, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeSlot } from "@shared/schema";

interface DateSlotPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedSlots: TimeSlot[];
  onSlotsChange: (slots: TimeSlot[]) => void;
  bulkDates?: Date[];
  onBulkDatesChange?: (dates: Date[]) => void;
  bulkMode?: boolean;
  dateRangeMode?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  onStartDateChange?: (date: Date | null) => void;
  onEndDateChange?: (date: Date | null) => void;
}

export function DateSlotPicker({
  selectedDate,
  onDateChange,
  selectedSlots,
  onSlotsChange,
  bulkDates = [],
  onBulkDatesChange,
  bulkMode = false,
  dateRangeMode = false,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateSlotPickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const today = startOfToday();

  const toggleSlot = (slot: TimeSlot) => {
    if (selectedSlots.includes(slot)) {
      onSlotsChange(selectedSlots.filter((s) => s !== slot));
    } else {
      onSlotsChange([...selectedSlots, slot]);
    }
  };

  const selectBothSlots = () => {
    onSlotsChange(["AM", "PM"]);
  };

  const handleBulkDateSelect = (date: Date | undefined) => {
    if (!date || !onBulkDatesChange) return;

    const dateStr = format(date, "yyyy-MM-dd");
    const existingIndex = bulkDates.findIndex(
      (d) => format(d, "yyyy-MM-dd") === dateStr,
    );

    if (existingIndex >= 0) {
      onBulkDatesChange(bulkDates.filter((_, i) => i !== existingIndex));
    } else {
      onBulkDatesChange([...bulkDates, date]);
    }
  };

  const quickSelectThisWeek = () => {
    if (!onBulkDatesChange) return;
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekDays: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const day = addDays(weekStart, i);
      if (!isBefore(day, today)) {
        weekDays.push(day);
      }
    }
    onBulkDatesChange(weekDays);
  };

  const quickSelectNextWeek = () => {
    if (!onBulkDatesChange) return;
    const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
    const weekDays: Date[] = [];
    for (let i = 0; i < 5; i++) {
      weekDays.push(addDays(nextWeekStart, i));
    }
    onBulkDatesChange(weekDays);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          Select Date & Time Slot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Selection */}
        {dateRangeMode && onStartDateChange && onEndDateChange ? (
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              Date Range
            </label>

            {/* From Date */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Popover
                open={startCalendarOpen}
                onOpenChange={setStartCalendarOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, "EEEE, MMM d, yyyy")
                      : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate || undefined}
                    onSelect={(date) => {
                      if (date) {
                        onStartDateChange(date);
                        if (endDate && isBefore(endDate, date)) {
                          onEndDateChange(null);
                        }
                        setStartCalendarOpen(false);
                      }
                    }}
                    disabled={(date) =>
                      isBefore(date, today) || isWeekend(date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-end-date"
                    disabled={!startDate}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate
                      ? format(endDate, "EEEE, MMM d, yyyy")
                      : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate || undefined}
                    onSelect={(date) => {
                      if (date) {
                        onEndDateChange(date);
                        setEndCalendarOpen(false);
                      }
                    }}
                    disabled={(date) =>
                      isBefore(date, today) ||
                      isWeekend(date) ||
                      (startDate ? isBefore(date, startDate) : false)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range Summary */}
            {startDate && endDate && (
              <div className="rounded-lg bg-muted/50 p-2 text-xs">
                <span className="font-medium">
                  {(() => {
                    const days = eachDayOfInterval({
                      start: startDate,
                      end: endDate,
                    }).filter((d) => !isWeekend(d));
                    return `${days.length} weekday${days.length === 1 ? "" : "s"} selected`;
                  })()}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Single Date Selection */
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Date
            </label>
            <div className="flex items-center gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 justify-start text-left font-normal"
                    data-testid="button-date-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        onDateChange(date);
                        setCalendarOpen(false);
                      }
                    }}
                    disabled={(date) =>
                      isBefore(date, today) || isWeekend(date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Time Slot Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Time Slot
          </label>
          <div className="flex gap-2">
            <Button
              variant={selectedSlots.includes("AM") ? "default" : "outline"}
              className={cn(
                "flex-1 gap-2",
                selectedSlots.includes("AM") &&
                  "bg-amber-500 hover:bg-amber-600 border-amber-600",
              )}
              onClick={() => toggleSlot("AM")}
              data-testid="button-slot-am"
            >
              <Sun className="h-4 w-4" />
              AM
            </Button>
            <Button
              variant={selectedSlots.includes("PM") ? "default" : "outline"}
              className={cn(
                "flex-1 gap-2",
                selectedSlots.includes("PM") &&
                  "bg-violet-500 hover:bg-violet-600 border-violet-600",
              )}
              onClick={() => toggleSlot("PM")}
              data-testid="button-slot-pm"
            >
              <Moon className="h-4 w-4" />
              PM
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={selectBothSlots}
            data-testid="button-full-day"
          >
            Select Full Day
          </Button>
        </div>

        {/* Selection Summary */}
        {selectedSlots.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">Selected:</p>
            <p className="text-muted-foreground">
              {dateRangeMode && startDate && endDate
                ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
                : bulkMode && bulkDates.length > 0
                  ? `${bulkDates.length} date(s)`
                  : format(selectedDate, "MMM d, yyyy")}
              {" • "}
              {selectedSlots.join(" & ")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
