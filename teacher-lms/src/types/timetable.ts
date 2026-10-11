export interface TimetableSlot {
  id: number;
  period_index: number;
  day_of_week: number;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  room?: string | null;
  section_id?: number | null;
  classes?: { id: number; name: string } | null;
  subjects?: { id: number; name: string } | null;
  teachers?: { id?: number; name: string } | null;
}

export interface TimetablePeriodMaster {
  id: string;
  school_id: string | number;
  period_index: number;
  start_time: string;
  end_time: string;
}

export interface TimetableSettingsMaster {
  school_id: string | number;
  break_after_period_index: number;
  break_start_time: string;
  break_end_time: string;
}

export interface PeriodTimelineItem {
  periodIndex: number;
  periodNumber: number;
  timeRange: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakLabel?: string;
  slot?: TimetableSlot;
  isFree: boolean;
  status: 'live' | 'upcoming' | 'completed' | 'free' | 'break';
}
