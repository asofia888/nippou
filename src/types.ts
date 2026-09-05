export interface DailyReport {
  id: string;
  date: string; // YYYY-MM-DD
  workingHours?: number; // Optional working hours (e.g., 8.5)
  tasksCompleted: string; // 今日の業務・活動内容
  achievements: string; // 成果・売上・決定事項
  learnings: string; // 課題・気づき・反省
  tomorrowPlans: string; // 明日の予定・最優先タスク
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface ReportFormData {
  date: string;
  workingHours: string;
  tasksCompleted: string;
  achievements: string;
  learnings: string;
  tomorrowPlans: string;
}

