import * as vscode from 'vscode';
import { Project, Activity } from '../types';
import { ProjectService } from '../services/ProjectService';

/**
 * Projects Provider for MyCroft 2.0
 * Manages project creation, milestones, and project-specific analytics
 */
export class ProjectsProvider implements vscode.WebviewViewProvider {
  private projectService: ProjectService;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.projectService = ProjectService.getInstance(context);
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = await this.getWebviewContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'createProject':
          await this.createProject(message.name, message.description);
          break;
        case 'selectProject':
          await this.selectProject(message.projectId);
          break;
        case 'addGoal':
          await this.addGoal(message.projectId, message.title, message.description, message.targetValue, message.unit);
          break;
        case 'addMilestone':
          await this.addMilestone(message.projectId, message.title, message.description, message.dueDate);
          break;
        case 'completeTask':
          await this.completeTask(message.projectId, message.milestoneId, message.taskId);
          break;
        case 'archiveProject':
          await this.archiveProject(message.projectId);
          break;
        case 'refreshProjects':
          webviewView.webview.html = await this.getWebviewContent(webviewView.webview);
          break;
      }
    });
  }

  private async getWebviewContent(webview: vscode.Webview): Promise<string> {
    const projects = await this.projectService.getProjects();
    const activeProjects = projects.filter(p => p.status === 'active');
    const activities = this.context.globalState.get<Activity[]>('activities', []);
    const upcomingDeadlines = await this.projectService.getUpcomingDeadlines();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Projects</title>
        <style>
          ${this.getStyles()}
        </style>
      </head>
      <body>
        <div class="projects-container">
          <div class="header">
            <h2>📁 Projects</h2>
            <button id="createProjectBtn" class="btn-primary">+ New Project</button>
          </div>

          ${upcomingDeadlines.length > 0 ? this.renderUpcomingDeadlines(upcomingDeadlines) : ''}

          <div class="projects-list">
            ${activeProjects.length > 0 ? 
              activeProjects.map(project => this.renderProject(project, activities)).join('') :
              '<div class="no-projects">No active projects. Create your first project to get started!</div>'
            }
          </div>

          ${this.renderCreateProjectForm()}
        </div>

        <script>
          ${this.getScript()}
        </script>
      </body>
      </html>
    `;
  }

  private renderUpcomingDeadlines(deadlines: any[]): string {
    return `
      <div class="deadlines-section">
        <h3>⏰ Upcoming Deadlines</h3>
        <div class="deadlines-list">
          ${deadlines.slice(0, 3).map(deadline => `
            <div class="deadline-item ${deadline.daysUntil <= 3 ? 'urgent' : ''}">
              <div class="deadline-info">
                <div class="deadline-title">${deadline.title}</div>
                <div class="deadline-project">${deadline.projectName}</div>
              </div>
              <div class="deadline-time">
                ${deadline.daysUntil === 0 ? 'Today' : 
                  deadline.daysUntil === 1 ? 'Tomorrow' : 
                  `${deadline.daysUntil} days`}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderProject(project: Project, activities: Activity[]): string {
    const projectActivities = activities.filter(a => a.projectId === project.id);
    const totalTime = projectActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const completedGoals = project.goals.filter(g => g.isCompleted).length;
    const completedMilestones = project.milestones.filter(m => m.completedAt).length;
    
    // Calculate overall progress
    const totalMilestones = project.milestones.length;
    const overallProgress = totalMilestones > 0 ? 
      project.milestones.reduce((sum, m) => sum + m.progress, 0) / totalMilestones : 0;

    return `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-header">
          <div class="project-title-section">
            <div class="project-color" style="background-color: ${project.color}"></div>
            <div class="project-info">
              <h3 class="project-title">${project.name}</h3>
              <p class="project-description">${project.description}</p>
            </div>
          </div>
          <div class="project-actions">
            <button class="btn-icon" onclick="toggleProjectDetails('${project.id}')" title="Toggle Details">
              <span class="expand-icon">▼</span>
            </button>
          </div>
        </div>

        <div class="project-stats">
          <div class="stat-item">
            <span class="stat-value">${projectActivities.length}</span>
            <span class="stat-label">Activities</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${Math.round(totalTime / 60)}h</span>
            <span class="stat-label">Time</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${completedGoals}/${project.goals.length}</span>
            <span class="stat-label">Goals</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${completedMilestones}/${totalMilestones}</span>
            <span class="stat-label">Milestones</span>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-label">Overall Progress: ${Math.round(overallProgress)}%</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${overallProgress}%; background-color: ${project.color}"></div>
          </div>
        </div>

        <div class="project-details" id="details-${project.id}" style="display: none;">
          ${this.renderProjectDetails(project)}
        </div>
      </div>
    `;
  }

  private renderProjectDetails(project: Project): string {
    return `
      <div class="details-section">
        <div class="goals-section">
          <div class="section-header">
            <h4>🎯 Goals</h4>
            <button class="btn-small" onclick="showAddGoalForm('${project.id}')">+ Add Goal</button>
          </div>
          <div class="goals-list">
            ${project.goals.length > 0 ? 
              project.goals.map(goal => `
                <div class="goal-item ${goal.isCompleted ? 'completed' : ''}">
                  <div class="goal-info">
                    <div class="goal-title">${goal.title}</div>
                    <div class="goal-progress">${goal.currentValue}/${goal.targetValue} ${goal.unit}</div>
                  </div>
                  <div class="goal-status">
                    ${goal.isCompleted ? '✅' : `${Math.round((goal.currentValue / goal.targetValue) * 100)}%`}
                  </div>
                </div>
              `).join('') :
              '<div class="empty-state">No goals yet</div>'
            }
          </div>
        </div>

        <div class="milestones-section">
          <div class="section-header">
            <h4>🎯 Milestones</h4>
            <button class="btn-small" onclick="showAddMilestoneForm('${project.id}')">+ Add Milestone</button>
          </div>
          <div class="milestones-list">
            ${project.milestones.length > 0 ? 
              project.milestones.map(milestone => `
                <div class="milestone-item ${milestone.completedAt ? 'completed' : ''}">
                  <div class="milestone-header">
                    <div class="milestone-title">${milestone.title}</div>
                    <div class="milestone-progress">${Math.round(milestone.progress)}%</div>
                  </div>
                  <div class="milestone-tasks">
                    ${milestone.tasks.map(task => `
                      <div class="task-item ${task.isCompleted ? 'completed' : ''}" 
                           onclick="completeTask('${project.id}', '${milestone.id}', '${task.id}')">
                        <span class="task-checkbox">${task.isCompleted ? '✅' : '☐'}</span>
                        <span class="task-title">${task.title}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('') :
              '<div class="empty-state">No milestones yet</div>'
            }
          </div>
        </div>

        <div class="project-controls">
          <button class="btn-danger" onclick="archiveProject('${project.id}')">Archive Project</button>
        </div>
      </div>
    `;
  }

  private renderCreateProjectForm(): string {
    return `
      <div id="createProjectModal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Create New Project</h3>
            <button class="modal-close" onclick="hideCreateProjectForm()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="projectName">Project Name *</label>
              <input type="text" id="projectName" placeholder="Enter project name" required>
            </div>
            <div class="form-group">
              <label for="projectDescription">Description</label>
              <textarea id="projectDescription" placeholder="Brief description of your project"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="hideCreateProjectForm()">Cancel</button>
            <button class="btn-primary" onclick="submitCreateProject()">Create Project</button>
          </div>
        </div>
      </div>
    `;
  }

  private getStyles(): string {
    return `
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
        margin: 0;
        padding: 16px;
      }

      .projects-container {
        max-width: 100%;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .header h2 {
        margin: 0;
        color: var(--vscode-foreground);
      }

      .deadlines-section {
        background: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .deadlines-section h3 {
        margin: 0 0 12px 0;
        color: var(--vscode-foreground);
      }

      .deadline-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
        margin-bottom: 8px;
        border-left: 3px solid var(--vscode-textLink-foreground);
      }

      .deadline-item.urgent {
        border-left-color: #DC3545;
        background: rgba(220, 53, 69, 0.1);
      }

      .deadline-title {
        font-weight: bold;
        margin-bottom: 2px;
      }

      .deadline-project {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .deadline-time {
        font-size: 12px;
        font-weight: bold;
        color: var(--vscode-textLink-foreground);
      }

      .project-card {
        background: var(--vscode-editor-inactiveSelectionBackground);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }

      .project-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .project-title-section {
        display: flex;
        align-items: flex-start;
        flex: 1;
      }

      .project-color {
        width: 4px;
        height: 40px;
        border-radius: 2px;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .project-title {
        margin: 0 0 4px 0;
        color: var(--vscode-foreground);
        font-size: 16px;
      }

      .project-description {
        margin: 0;
        color: var(--vscode-descriptionForeground);
        font-size: 14px;
      }

      .project-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }

      .stat-item {
        text-align: center;
        padding: 8px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
      }

      .stat-value {
        display: block;
        font-size: 16px;
        font-weight: bold;
        color: var(--vscode-textLink-foreground);
        margin-bottom: 2px;
      }

      .stat-label {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
      }

      .progress-section {
        margin-bottom: 16px;
      }

      .progress-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 4px;
      }

      .progress-bar {
        width: 100%;
        height: 6px;
        background: var(--vscode-editor-background);
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        transition: width 0.3s ease;
      }

      .project-details {
        border-top: 1px solid var(--vscode-panel-border);
        padding-top: 16px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .section-header h4 {
        margin: 0;
        color: var(--vscode-foreground);
      }

      .goal-item, .milestone-item {
        background: var(--vscode-editor-background);
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 8px;
      }

      .goal-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .goal-item.completed {
        opacity: 0.7;
      }

      .goal-title {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .goal-progress {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .milestone-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .milestone-title {
        font-weight: bold;
      }

      .task-item {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        margin: 2px 0;
        border-radius: 3px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .task-item:hover {
        background: var(--vscode-list-hoverBackground);
      }

      .task-item.completed {
        opacity: 0.6;
        text-decoration: line-through;
      }

      .task-checkbox {
        margin-right: 8px;
        font-size: 14px;
      }

      .empty-state {
        text-align: center;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
        padding: 20px;
      }

      .no-projects {
        text-align: center;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
        padding: 40px 20px;
      }

      .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .modal-header h3 {
        margin: 0;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--vscode-foreground);
      }

      .modal-body {
        padding: 16px;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px;
        border-top: 1px solid var(--vscode-panel-border);
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        margin-bottom: 4px;
        font-size: 14px;
        color: var(--vscode-foreground);
      }

      .form-group input, .form-group textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        font-family: inherit;
      }

      .form-group textarea {
        resize: vertical;
        min-height: 60px;
      }

      .btn-primary, .btn-secondary, .btn-danger, .btn-small, .btn-icon {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .btn-primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .btn-secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      .btn-danger {
        background: #DC3545;
        color: white;
      }

      .btn-small {
        padding: 4px 8px;
        font-size: 11px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .btn-icon {
        background: none;
        color: var(--vscode-foreground);
        padding: 4px;
      }

      .expand-icon {
        transition: transform 0.2s;
      }

      .expand-icon.expanded {
        transform: rotate(180deg);
      }
    `;
  }

  private getScript(): string {
    return `
      const vscode = acquireVsCodeApi();

      function toggleProjectDetails(projectId) {
        const details = document.getElementById('details-' + projectId);
        const icon = document.querySelector('[data-project-id="' + projectId + '"] .expand-icon');
        
        if (details.style.display === 'none') {
          details.style.display = 'block';
          icon.classList.add('expanded');
        } else {
          details.style.display = 'none';
          icon.classList.remove('expanded');
        }
      }

      function showCreateProjectForm() {
        document.getElementById('createProjectModal').style.display = 'flex';
      }

      function hideCreateProjectForm() {
        document.getElementById('createProjectModal').style.display = 'none';
        document.getElementById('projectName').value = '';
        document.getElementById('projectDescription').value = '';
      }

      function submitCreateProject() {
        const name = document.getElementById('projectName').value.trim();
        const description = document.getElementById('projectDescription').value.trim();
        
        if (!name) {
          alert('Project name is required');
          return;
        }

        vscode.postMessage({
          command: 'createProject',
          name,
          description
        });

        hideCreateProjectForm();
      }

      function completeTask(projectId, milestoneId, taskId) {
        vscode.postMessage({
          command: 'completeTask',
          projectId,
          milestoneId,
          taskId
        });
      }

      function archiveProject(projectId) {
        if (confirm('Are you sure you want to archive this project?')) {
          vscode.postMessage({
            command: 'archiveProject',
            projectId
          });
        }
      }

      // Event listeners
      document.getElementById('createProjectBtn').addEventListener('click', showCreateProjectForm);
    `;
  }

  private async createProject(name: string, description: string): Promise<void> {
    try {
      await this.projectService.createProject(name, description);
      // Refresh the view will be handled by the webview message
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create project: ${error}`);
    }
  }

  private async selectProject(projectId: string): Promise<void> {
    // This could be used to set a current/active project
    this.context.globalState.update('currentProjectId', projectId);
  }

  private async addGoal(projectId: string, title: string, description: string, targetValue: number, unit: string): Promise<void> {
    try {
      await this.projectService.addGoal(projectId, title, description, targetValue, unit);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add goal: ${error}`);
    }
  }

  private async addMilestone(projectId: string, title: string, description: string, dueDate?: string): Promise<void> {
    try {
      await this.projectService.addMilestone(projectId, title, description, dueDate);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add milestone: ${error}`);
    }
  }

  private async completeTask(projectId: string, milestoneId: string, taskId: string): Promise<void> {
    try {
      await this.projectService.completeMilestoneTask(projectId, milestoneId, taskId);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to complete task: ${error}`);
    }
  }

  private async archiveProject(projectId: string): Promise<void> {
    try {
      await this.projectService.archiveProject(projectId);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to archive project: ${error}`);
    }
  }
}
