import { useState, useEffect } from "react";
import { format, setHours, setMinutes, parse, isValid } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
}

export function DateTimePicker({ value, onChange, minDate }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(value);
  const [dateInput, setDateInput] = useState(format(value, "MMMM do, yyyy"));
  const [timeInput, setTimeInput] = useState(format(value, "HH:mm"));
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // Sync inputs when value changes externally
  useEffect(() => {
    setSelectedDate(value);
    setDateInput(format(value, "MMMM do, yyyy"));
    setTimeInput(format(value, "HH:mm"));
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDate = setHours(setMinutes(date, selectedDate.getMinutes()), selectedDate.getHours());
      setSelectedDate(newDate);
      setDateInput(format(newDate, "MMMM do, yyyy"));
      onChange(newDate);
    }
  };

  const handleTimeChange = (hour: number, minute: number) => {
    const newDate = setHours(setMinutes(selectedDate, minute), hour);
    setSelectedDate(newDate);
    setTimeInput(format(newDate, "HH:mm"));
    onChange(newDate);
  };

  const handleTimeInputChange = (value: string) => {
    setTimeInput(value);
    // Try to parse time in HH:mm format
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        const newDate = setHours(setMinutes(selectedDate, minute), hour);
        setSelectedDate(newDate);
        onChange(newDate);
      }
    }
  };

  const handleTimeInputBlur = () => {
    // Reset to valid format on blur
    setTimeInput(format(selectedDate, "HH:mm"));
  };

  const quickOptions = [
    { label: "+1h", hours: 1 },
    { label: "+3h", hours: 3 },
    { label: "+6h", hours: 6 },
    { label: "+12h", hours: 12 },
    { label: "+24h", hours: 24 },
  ];

  return (
    <div className="space-y-3">
      {/* Quick Time Buttons */}
      <div className="flex flex-wrap gap-2">
        {quickOptions.map((opt) => (
          <Button
            key={opt.label}
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              const newDate = new Date(Date.now() + opt.hours * 60 * 60 * 1000);
              setSelectedDate(newDate);
              setDateInput(format(newDate, "MMMM do, yyyy"));
              setTimeInput(format(newDate, "HH:mm"));
              onChange(newDate);
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Calendar Picker Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(selectedDate, "PPP")}
            <Clock className="ml-auto mr-2 h-4 w-4" />
            {format(selectedDate, "HH:mm")}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 bg-background border shadow-lg z-[100]" 
          align="start"
          sideOffset={4}
        >
          <div className="flex pointer-events-auto">
            {/* Calendar */}
            <div className="p-3 border-r">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => minDate ? date < minDate : false}
                initialFocus
                className="pointer-events-auto"
              />
            </div>
            
            {/* Time Picker */}
            <div className="flex flex-col">
              <div className="p-2 border-b bg-muted/50">
                <p className="text-xs font-medium text-center">Time</p>
              </div>
              <div className="flex">
                {/* Hours */}
                <ScrollArea className="h-[280px] w-14 border-r">
                  <div className="p-1 pointer-events-auto">
                    {hours.map((hour) => (
                      <Button
                        key={hour}
                        variant={selectedDate.getHours() === hour ? "default" : "ghost"}
                        size="sm"
                        className="w-full text-xs mb-0.5 pointer-events-auto"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleTimeChange(hour, selectedDate.getMinutes());
                        }}
                      >
                        {hour.toString().padStart(2, '0')}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Minutes */}
                <ScrollArea className="h-[280px] w-14">
                  <div className="p-1 pointer-events-auto">
                    {minutes.map((minute) => (
                      <Button
                        key={minute}
                        variant={selectedDate.getMinutes() === minute ? "default" : "ghost"}
                        size="sm"
                        className="w-full text-xs mb-0.5 pointer-events-auto"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleTimeChange(selectedDate.getHours(), minute);
                        }}
                      >
                        {minute.toString().padStart(2, '0')}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-2 border-t flex justify-between items-center bg-muted/30 pointer-events-auto">
            <span className="text-xs text-muted-foreground">
              {format(selectedDate, "EEEE, MMM d 'at' HH:mm")}
            </span>
            <Button 
              size="sm" 
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
              className="pointer-events-auto"
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Typeable Date & Time Inputs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={dateInput}
            readOnly
            className="bg-muted/50 cursor-pointer"
            onClick={() => setOpen(true)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={timeInput}
            onChange={(e) => handleTimeInputChange(e.target.value)}
            onBlur={handleTimeInputBlur}
            placeholder="HH:mm"
            className="w-20 text-center font-mono"
          />
        </div>
      </div>
    </div>
  );
}
