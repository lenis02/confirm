export interface User {
  id: string;
  email: string;
  name: string;
  jobTitle?: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: 'PM' | 'DEVELOPER' | 'DESIGNER' | 'QA' | 'DEVOPS' | 'OTHER';
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  ownerId: string;
  members: ProjectMember[];
  createdAt: string;
}

export interface Document {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
}

export interface WbsItem {
  id: string;
  taskId?: string;
  order: number;
  phase: string;
  title: string;
  description?: string;
  assignedRole: string;
  complexity?: string;
  durationDays: number;
  startDate?: string;
  endDate?: string;
  dependencies?: string[];
  reasoning?: string;
  isDecisionPoint: boolean;
}

export interface ProjectWbs {
  id: string;
  projectId: string;
  projectSummary?: string;
  totalDuration?: string;
  teamResources?: { department: string; role: string; experience_level: string }[];
  status: 'DRAFT' | 'CONFIRMED';
  items: WbsItem[];
}

export interface MeetingChecklist {
  id: string;
  content: string;
  isDone: boolean;
  order: number;
}

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  type: 'KICKOFF' | 'PROGRESS_CHECK' | 'ISSUE_CHECK' | 'CONSENSUS';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  scheduledAt: string;
  completedAt?: string;
  achievementRate?: number;
  summary?: string;
  minutesFileName?: string;
  checklists?: MeetingChecklist[];
}

export interface MeetingMetrics {
  achievementRate: number;
  summary?: string;
  completedAt: string;
  checklists: MeetingChecklist[];
}

export interface MeetingBriefing {
  previousMeeting?: Pick<Meeting, 'id' | 'title' | 'completedAt'>;
  carriedOverItems: ActionItem[];
}

export interface ActionItem {
  id: string;
  projectId: string;
  title: string;
  status: 'PENDING' | 'COMPLETED';
  dueDate: string;
  completedAt?: string;
  isCarriedOver: boolean;
  assignee?: User;
}

export interface CalendarWeek {
  week: { start: string; end: string };
  projects: {
    id: string;
    name: string;
    status: string;
    myRole: string;
    meetings: Pick<Meeting, 'id' | 'title' | 'type' | 'status' | 'scheduledAt'>[];
    actionItems: Pick<ActionItem, 'id' | 'title' | 'status' | 'dueDate' | 'isCarriedOver'>[];
  }[];
}
