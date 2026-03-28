import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Trash2, Calendar as CalendarIcon, CalendarDays } from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DeleteSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDay?: string;
  onOptimisticDelete?: (type: 'day' | 'week', targetDate: Date, dayName?: string) => void;
}

export default function DeleteSessionsModal({ isOpen, onClose, onSuccess, selectedDay, onOptimisticDelete }: DeleteSessionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmationType, setConfirmationType] = useState<'day' | 'week' | null>(null);
  const [selectedDayForDeletion, setSelectedDayForDeletion] = useState<string>(selectedDay || 'Mon');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDeleteDay = async () => {
    if (!selectedDayForDeletion) {
      toast.error('No day selected');
      return;
    }

    const targetDate = getDateForDay(selectedDayForDeletion, selectedDate);
    
    // Optimistically remove sessions from UI
    if (onOptimisticDelete) {
      onOptimisticDelete('day', targetDate, selectedDayForDeletion);
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Calculate the specific date for the selected day
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);

      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('user_id', user.id)
        .gte('starts_at', targetDate.toISOString())
        .lt('starts_at', nextDay.toISOString());

      if (error) throw error;

      toast.success(`Study sessions for ${selectedDayForDeletion}, ${format(targetDate, 'MMM dd, yyyy')} have been deleted`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting day sessions:', error);
      toast.error('Failed to delete day sessions');
      // Refresh data on error to ensure consistency
      onSuccess();
    } finally {
      setLoading(false);
      setConfirmationType(null);
    }
  };

  const handleDeleteWeek = async () => {
    const weekStart = getStartOfWeek(selectedDate);
    
    // Optimistically remove sessions from UI
    if (onOptimisticDelete) {
      onOptimisticDelete('week', weekStart);
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Calculate the start and end of the selected week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('user_id', user.id)
        .gte('starts_at', weekStart.toISOString())
        .lt('starts_at', weekEnd.toISOString());

      if (error) throw error;

      toast.success(`All study sessions for the week of ${format(weekStart, 'MMM dd, yyyy')} have been deleted`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting week sessions:', error);
      toast.error('Failed to delete week sessions');
      // Refresh data on error to ensure consistency
      onSuccess();
    } finally {
      setLoading(false);
      setConfirmationType(null);
    }
  };

  const getDayNumber = (dayName: string) => {
    const dayMap: { [key: string]: number } = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    return dayMap[dayName] || 1;
  };

  const getStartOfWeek = (date: Date): Date => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start of week
    startOfWeek.setDate(date.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  };

  const getDateForDay = (dayName: string, referenceDate: Date): Date => {
    const weekStart = getStartOfWeek(referenceDate);
    const dayNumber = getDayNumber(dayName);
    const targetDate = new Date(weekStart);
    // Adjust for the day of the week (Monday = 1, Sunday = 0)
    const daysToAdd = dayNumber === 0 ? 6 : dayNumber - 1;
    targetDate.setDate(weekStart.getDate() + daysToAdd);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate;
  };

  const handleConfirm = () => {
    if (confirmationType === 'day') {
      handleDeleteDay();
    } else if (confirmationType === 'week') {
      handleDeleteWeek();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Study Sessions
            </DialogTitle>
            <DialogDescription>
              Choose what you'd like to delete. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Week Starting</label>
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? `Week of ${format(getStartOfWeek(selectedDate), "MMM dd, yyyy")}` : <span>Pick a week</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={getStartOfWeek(selectedDate)}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setShowDatePicker(false);
                      }
                    }}
                    disabled={(date) => date.getDay() !== 1} // Only allow Mondays
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    modifiers={{
                      weekStart: (date) => date.getDay() === 1
                    }}
                    modifiersClassNames={{
                      weekStart: 'bg-primary text-primary-foreground font-bold'
                    }}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Only week starting dates (Mondays) can be selected
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => setConfirmationType('day')}
              >
                <div className="flex items-center gap-3 w-full">
                  <CalendarIcon className="h-5 w-5 text-destructive" />
                  <div className="text-left flex-1">
                    <div className="font-medium">Delete Day's Sessions</div>
                    <div className="text-sm text-muted-foreground">
                      Delete sessions for one specific day
                    </div>
                  </div>
                </div>
              </Button>
              
              <div className="ml-8">
                <Select value={selectedDayForDeletion} onValueChange={setSelectedDayForDeletion}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sun">Sunday</SelectItem>
                    <SelectItem value="Mon">Monday</SelectItem>
                    <SelectItem value="Tue">Tuesday</SelectItem>
                    <SelectItem value="Wed">Wednesday</SelectItem>
                    <SelectItem value="Thu">Thursday</SelectItem>
                    <SelectItem value="Fri">Friday</SelectItem>
                    <SelectItem value="Sat">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setConfirmationType('week')}
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-destructive" />
                <div className="text-left">
                  <div className="font-medium">Delete All Week Sessions</div>
                  <div className="text-sm text-muted-foreground">
                    Delete all sessions for the selected week
                  </div>
                </div>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmationType !== null} onOpenChange={() => setConfirmationType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationType === 'day' 
                ? `This will permanently delete all study sessions for ${selectedDayForDeletion}, ${format(getDateForDay(selectedDayForDeletion, selectedDate), 'MMM dd, yyyy')}. This action cannot be undone.`
                : `This will permanently delete all study sessions for the week of ${format(getStartOfWeek(selectedDate), 'MMM dd, yyyy')}. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete Sessions'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}