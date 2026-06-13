export interface MenuItem {
  id: string;
  name: string;
}

export type MenuItemType = 'task' | 'process';

export interface TaskDetails {
  name?: string;
  assignee?: string;
  dueDate?: string;
  createTime?: string;
}

export interface TaskHeader {
  name: string;
  assignee: string;
  dueDate: string;
  createdDate: string;
}
