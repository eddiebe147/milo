export type GoalState = 'proposed' | 'active' | 'review' | 'done' | 'archived';

export interface Goal {
  state: GoalState;
  title: string;
  section: string;
  metadata: Record<string, string>;
  raw: string;
}

export interface ParsedTodoFile {
  goals: Goal[];
  preamble: string;
  sections: string[];
}

export interface GoalProposal {
  title: string;
  section: string;
  metadata: Record<string, string>;
}
