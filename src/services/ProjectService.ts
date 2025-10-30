import * as vscode from 'vscode';
import { Project, ProjectStatus, ProjectGoal, Milestone, MilestoneTask, Activity } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { PROJECT_COLORS } from '../constants';

/**
 * Project Management Service for MyCroft 2.0
 * Handles project creation, milestone tracking, and project-specific analytics
 */
export class ProjectService {
  private static instance: ProjectService;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(context: vscode.ExtensionContext): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService(context);
    }
    return ProjectService.instance;
  }

  /**
   * Create a new project
   */
  public async createProject(name: string, description: string, repositories?: string[]): Promise<Project> {
    const projects = await this.getProjects();
    const colorIndex = projects.length % PROJECT_COLORS.length;
    
    const project: Project = {
      id: uuidv4(),
      name,
      description,
      color: PROJECT_COLORS[colorIndex],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      goals: [],
      milestones: [],
      repositories: repositories || [],
      totalTime: 0,
      totalActivities: 0,
      completionPercentage: 0
    };

    projects.push(project);
    await this.saveProjects(projects);
    
    vscode.window.showInformationMessage(`Project "${name}" created successfully!`);
    return project;
  }

  /**
   * Get all projects
   */
  public async getProjects(): Promise<Project[]> {
    return this.context.globalState.get<Project[]>('projects', []);
  }

  /**
   * Get project by ID
   */
  public async getProject(id: string): Promise<Project | undefined> {
    const projects = await this.getProjects();
    return projects.find(p => p.id === id);
  }

  /**
   * Update project
   */
  public async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const projects = await this.getProjects();
    const projectIndex = projects.findIndex(p => p.id === id);
    
    if (projectIndex === -1) {
      return undefined;
    }

    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveProjects(projects);
    return projects[projectIndex];
  }

  /**
   * Delete project
   */
  public async deleteProject(id: string): Promise<boolean> {
    const projects = await this.getProjects();
    const filteredProjects = projects.filter(p => p.id !== id);
    
    if (filteredProjects.length === projects.length) {
      return false; // Project not found
    }

    await this.saveProjects(filteredProjects);
    return true;
  }

  /**
   * Add goal to project
   */
  public async addGoal(projectId: string, title: string, description: string, targetValue: number, unit: string, deadline?: string): Promise<ProjectGoal | undefined> {
    const project = await this.getProject(projectId);
    if (!project) {
      return undefined;
    }

    const goal: ProjectGoal = {
      id: uuidv4(),
      title,
      description,
      targetValue,
      currentValue: 0,
      unit,
      deadline,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    project.goals.push(goal);
    await this.updateProject(projectId, { goals: project.goals });
    
    return goal;
  }

  /**
   * Update goal progress
   */
  public async updateGoalProgress(projectId: string, goalId: string, currentValue: number): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project) {
      return false;
    }

    const goal = project.goals.find(g => g.id === goalId);
    if (!goal) {
      return false;
    }

    goal.currentValue = currentValue;
    goal.isCompleted = currentValue >= goal.targetValue;

    await this.updateProject(projectId, { goals: project.goals });
    
    if (goal.isCompleted) {
      vscode.window.showInformationMessage(`🎉 Goal "${goal.title}" completed!`);
    }

    return true;
  }

  /**
   * Add milestone to project
   */
  public async addMilestone(projectId: string, title: string, description: string, dueDate?: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<Milestone | undefined> {
    const project = await this.getProject(projectId);
    if (!project) {
      return undefined;
    }

    const milestone: Milestone = {
      id: uuidv4(),
      title,
      description,
      dueDate,
      progress: 0,
      tasks: [],
      priority
    };

    project.milestones.push(milestone);
    await this.updateProject(projectId, { milestones: project.milestones });
    
    return milestone;
  }

  /**
   * Add task to milestone
   */
  public async addMilestoneTask(projectId: string, milestoneId: string, title: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project) {
      return false;
    }

    const milestone = project.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      return false;
    }

    const task: MilestoneTask = {
      id: uuidv4(),
      title,
      isCompleted: false
    };

    milestone.tasks.push(task);
    await this.updateProject(projectId, { milestones: project.milestones });
    
    return true;
  }

  /**
   * Complete milestone task
   */
  public async completeMilestoneTask(projectId: string, milestoneId: string, taskId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project) {
      return false;
    }

    const milestone = project.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      return false;
    }

    const task = milestone.tasks.find(t => t.id === taskId);
    if (!task) {
      return false;
    }

    task.isCompleted = true;
    task.completedAt = new Date().toISOString();

    // Update milestone progress
    const completedTasks = milestone.tasks.filter(t => t.isCompleted).length;
    milestone.progress = (completedTasks / milestone.tasks.length) * 100;

    // Check if milestone is completed
    if (milestone.progress === 100 && !milestone.completedAt) {
      milestone.completedAt = new Date().toISOString();
      vscode.window.showInformationMessage(`🎯 Milestone "${milestone.title}" completed!`);
    }

    await this.updateProject(projectId, { milestones: project.milestones });
    return true;
  }

  /**
   * Get project statistics
   */
  public async getProjectStats(projectId: string, activities: Activity[]): Promise<{
    totalActivities: number;
    totalTime: number;
    completedGoals: number;
    completedMilestones: number;
    averageSessionLength: number;
    mostActiveDay: string;
    categoryBreakdown: { [category: string]: number };
  }> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const projectActivities = activities.filter(a => a.projectId === projectId);
    const totalTime = projectActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const completedGoals = project.goals.filter(g => g.isCompleted).length;
    const completedMilestones = project.milestones.filter(m => m.completedAt).length;

    // Calculate average session length
    const sessionsWithTime = projectActivities.filter(a => a.duration && a.duration > 0);
    const averageSessionLength = sessionsWithTime.length > 0 
      ? sessionsWithTime.reduce((sum, a) => sum + a.duration!, 0) / sessionsWithTime.length 
      : 0;

    // Find most active day
    const dayActivity: { [day: string]: number } = {};
    projectActivities.forEach(activity => {
      const day = new Date(activity.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayActivity[day] = (dayActivity[day] || 0) + 1;
    });
    const mostActiveDay = Object.entries(dayActivity)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No data';

    // Category breakdown
    const categoryBreakdown: { [category: string]: number } = {};
    projectActivities.forEach(activity => {
      categoryBreakdown[activity.category] = (categoryBreakdown[activity.category] || 0) + 1;
    });

    return {
      totalActivities: projectActivities.length,
      totalTime,
      completedGoals,
      completedMilestones,
      averageSessionLength,
      mostActiveDay,
      categoryBreakdown
    };
  }

  /**
   * Get active projects
   */
  public async getActiveProjects(): Promise<Project[]> {
    const projects = await this.getProjects();
    return projects.filter(p => p.status === 'active');
  }

  /**
   * Archive project
   */
  public async archiveProject(id: string): Promise<boolean> {
    const result = await this.updateProject(id, { status: 'archived' });
    return result !== undefined;
  }

  /**
   * Get project completion percentage
   */
  public async calculateProjectCompletion(projectId: string): Promise<number> {
    const project = await this.getProject(projectId);
    if (!project) {
      return 0;
    }

    if (project.milestones.length === 0) {
      return 0;
    }

    const totalProgress = project.milestones.reduce((sum, milestone) => sum + milestone.progress, 0);
    return totalProgress / project.milestones.length;
  }

  /**
   * Get upcoming deadlines
   */
  public async getUpcomingDeadlines(): Promise<Array<{
    type: 'goal' | 'milestone';
    projectName: string;
    title: string;
    deadline: string;
    daysUntil: number;
  }>> {
    const projects = await this.getActiveProjects();
    const deadlines: Array<{
      type: 'goal' | 'milestone';
      projectName: string;
      title: string;
      deadline: string;
      daysUntil: number;
    }> = [];

    const now = new Date();

    projects.forEach(project => {
      // Check goal deadlines
      project.goals.forEach(goal => {
        if (goal.deadline && !goal.isCompleted) {
          const deadline = new Date(goal.deadline);
          const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil >= 0 && daysUntil <= 30) { // Next 30 days
            deadlines.push({
              type: 'goal',
              projectName: project.name,
              title: goal.title,
              deadline: goal.deadline,
              daysUntil
            });
          }
        }
      });

      // Check milestone deadlines
      project.milestones.forEach(milestone => {
        if (milestone.dueDate && !milestone.completedAt) {
          const deadline = new Date(milestone.dueDate);
          const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil >= 0 && daysUntil <= 30) { // Next 30 days
            deadlines.push({
              type: 'milestone',
              projectName: project.name,
              title: milestone.title,
              deadline: milestone.dueDate,
              daysUntil
            });
          }
        }
      });
    });

    return deadlines.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  // Private methods
  private async saveProjects(projects: Project[]): Promise<void> {
    await this.context.globalState.update('projects', projects);
  }
}
