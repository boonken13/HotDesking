import { useState } from "react";
import { format, addDays, startOfWeek, isWeekend, isBefore, startOfToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react";
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
}

export function DateSlotPicker({
  selectedDate,
  onDateChange,
  selectedSlots,
  onSlotsChange,
  bulkDates = [],
  onBulkDatesChange,
  bulkMode = false,
}: DateSlotPickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = startOfToday();

  const toggleSlot = (slot: TimeSlot) => {
    if (selectedSlots.includes(slot)) {
      onSlotsChange(selectedSlots.filter(s => s !== slot));
    } else {
      onSlotsChange([...selectedSlots, slot]);
    }
  };

  const selectBothSlots = () => {
    onSlotsChange(["AM", "PM"]);
  };

  const goToPreviousDay = () => {
    const newDate = addDays(selectedDate, -1);
    if (!isBefore(newDate, today)) {
      onDateChange(newDate);
    }
  };

  const goToNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const handleBulkDateSelect = (date: Date | undefined) => {
    if (!date || !onBulkDatesChange) return;
    
    const dateStr = format(date, "yyyy-MM-dd");
    const existingIndex = bulkDates.findIndex(d => format(d, "yyyy-MM-dd") === dateStr);
    
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
        <CardTitle className="text-base font-medium">Select Date & Time Slot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Date</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousDay}
              disabled={isBefore(addDays(selectedDate, -1), today)}
              data-testid="button-prev-day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
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
                  disabled={(date) => isBefore(date, today) || isWeekend(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              data-testid="button-next-day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bulk Date Selection */}
        {bulkMode && onBulkDatesChange && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Bulk Dates</label>
            <div className="flex flex-wrap gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={quickSelectThisWeek} data-testid="button-this-week">
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={quickSelectNextWeek} data-testid="button-next-week">
                Next Week
              </Button>
              <Button variant="outline" size="sm" onClick={() => onBulkDatesChange([])} data-testid="button-clear-dates">
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {bulkDates.map(date => (
                <Badge
                  key={format(date, "yyyy-MM-dd")}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleBulkDateSelect(date)}
                >
                  {format(date, "MMM d")} ×
                </Badge>
              ))}
              {bulkDates.length === 0 && (
                <span className="text-sm text-muted-foreground">No dates selected</span>
              )}
            </div>
          </div>
        )}

        {/* Time Slot Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Time Slot</label>
          <div className="flex gap-2">
            <Button
              variant={selectedSlots.includes("AM") ? "default" : "outline"}
              className={cn(
                "flex-1 gap-2",
                selectedSlots.includes("AM") && "bg-amber-500 hover:bg-amber-600 border-amber-600"
              )}
              onClick={() => toggleSlot("AM")}
              data-testid="button-slot-am"
            >
              <Sun className="h-4 w-4" />
              Morning (AM)
            </Button>
            <Button
              variant={selectedSlots.includes("PM") ? "default" : "outline"}
              className={cn(
                "flex-1 gap-2",
                selectedSlots.includes("PM") && "bg-violet-500 hover:bg-violet-600 border-violet-600"
              )}
              onClick={() => toggleSlot("PM")}
              data-testid="button-slot-pm"
            >
              <Moon className="h-4 w-4" />
              Afternoon (PM)
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
              {bulkMode && bulkDates.length > 0
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
