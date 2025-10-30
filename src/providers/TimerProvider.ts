import * as vscode from 'vscode';
import { TimeSession, SessionType } from '../types';
import { TimeTrackingService } from '../services/TimeTrackingService';
import { ProjectService } from '../services/ProjectService';

/**
 * Timer Provider for MyCroft 2.0
 * Provides Pomodoro timer, deep work sessions, and time tracking interface
 */
export class TimerProvider implements vscode.WebviewViewProvider {
  private timeTrackingService: TimeTrackingService;
  private projectService: ProjectService;
  private webviewView?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.timeTrackingService = TimeTrackingService.getInstance(context);
    this.projectService = ProjectService.getInstance(context);
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this.webviewView = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = await this.getWebviewContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'startPomodoro':
          await this.startSession('pomodoro', message.projectId);
          break;
        case 'startShortFocus':
          await this.startSession('short-focus', message.projectId);
          break;
        case 'startDeepWork':
          await this.startSession('deep-work', message.projectId);
          break;
        case 'startExtendedFocus':
          await this.startSession('extended-focus', message.projectId);
          break;
        case 'startCustomSession':
          await this.startCustomSession(message.projectId);
          break;
        case 'endSession':
          await this.endSession();
          break;
        case 'startBreak':
          await this.startBreak(message.breakType);
          break;
        case 'endBreak':
          await this.endBreak();
          break;
        case 'refreshTimer':
          await this.refreshView();
          break;
      }
    });

    // Refresh view every 30 seconds to update timer
    setInterval(() => {
      this.refreshView();
    }, 30000);
  }

  private async getWebviewContent(webview: vscode.Webview): Promise<string> {
    const currentSession = this.timeTrackingService.getCurrentSession();
    const projects = await this.projectService.getActiveProjects();
    const todayTime = await this.timeTrackingService.getTodayTotalTime();
    const stats = await this.timeTrackingService.getProductivityStats();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Focus Timer</title>
        <style>
          ${this.getStyles()}
        </style>
      </head>
      <body>
        <div class="timer-container">
          <div class="header">
            <h2>⏱️ Focus Timer</h2>
          </div>

          ${currentSession ? this.renderActiveSession(currentSession) : this.renderSessionSelector(projects)}

          <div class="stats-section">
            <h3>📊 Today's Stats</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value">${Math.round(todayTime / 60)}h ${todayTime % 60}m</span>
                <span class="stat-label">Total Time</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${stats.totalSessions}</span>
                <span class="stat-label">Sessions</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${Math.round(stats.averageFocusScore)}/10</span>
                <span class="stat-label">Focus Score</span>
              </div>
            </div>
          </div>

          <div class="recent-sessions">
            <h3>📝 Recent Sessions</h3>
            <div id="recentSessionsList">
              ${await this.renderRecentSessions()}
            </div>
          </div>
        </div>

        <script>
          ${this.getScript(currentSession)}
        </script>
      </body>
      </html>
    `;
  }

  private renderActiveSession(session: TimeSession): string {
    const remainingTime = this.calculateRemainingTime(session);
    const progressPercentage = ((session.duration - remainingTime) / session.duration) * 100;
    
    const sessionTypeNames = {
      'pomodoro': '🍅 Pomodoro',
      'short-focus': '⚡ Short Focus',
      'deep-work': '🧠 Deep Work',
      'extended-focus': '🎯 Extended Focus',
      'custom': '⚙️ Custom',
      'regular': '⏰ Regular',
      'break': '☕ Break'
    };

    const isOnBreak = session.breaks.length > 0 && 
      session.breaks[session.breaks.length - 1].endTime === '';

    return `
      <div class="active-session">
        <div class="session-type">${sessionTypeNames[session.type]}</div>
        
        <div class="timer-display">
          <div class="time-remaining" id="timeRemaining">
            ${this.formatTime(remainingTime)}
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
          </div>
        </div>

        <div class="session-info">
          <div class="focus-score">
            Focus Score: <span class="score-value">${session.focusScore}/10</span>
          </div>
          <div class="interruptions">
            Interruptions: <span class="interruption-count">${session.interruptions}</span>
          </div>
        </div>

        <div class="session-controls">
          ${isOnBreak ? 
            '<button id="endBreakBtn" class="btn-primary">End Break</button>' :
            `<button id="startBreakBtn" class="btn-secondary">Take Break</button>
             <button id="endSessionBtn" class="btn-danger">End Session</button>`
          }
        </div>
      </div>
    `;
  }

  private renderSessionSelector(projects: any[]): string {
    const projectOptions = projects.map(p => 
      `<option value="${p.id}">${p.name}</option>`
    ).join('');

    return `
      <div class="session-selector">
        <div class="project-selection">
          <label for="projectSelect">Select Project (Optional):</label>
          <select id="projectSelect">
            <option value="">No specific project</option>
            ${projectOptions}
          </select>
        </div>

        <div class="session-types">
          <button id="startPomodoroBtn" class="session-btn pomodoro-btn">
            <div class="btn-icon">🍅</div>
            <div class="btn-text">
              <div class="btn-title">Pomodoro</div>
              <div class="btn-subtitle">25 min focused work</div>
            </div>
          </button>

          <button id="startShortFocusBtn" class="session-btn shortfocus-btn">
            <div class="btn-icon">⚡</div>
            <div class="btn-text">
              <div class="btn-title">Short Focus</div>
              <div class="btn-subtitle">45 min concentrated work</div>
            </div>
          </button>

          <button id="startDeepWorkBtn" class="session-btn deepwork-btn">
            <div class="btn-icon">🧠</div>
            <div class="btn-text">
              <div class="btn-title">Deep Work</div>
              <div class="btn-subtitle">90 min intensive focus</div>
            </div>
          </button>

          <button id="startExtendedFocusBtn" class="session-btn extendedfocus-btn">
            <div class="btn-icon">🎯</div>
            <div class="btn-text">
              <div class="btn-title">Extended Focus</div>
              <div class="btn-subtitle">4 hour marathon session</div>
            </div>
          </button>

          <button id="startCustomSessionBtn" class="session-btn custom-btn">
            <div class="btn-icon">⚙️</div>
            <div class="btn-text">
              <div class="btn-title">Custom Duration</div>
              <div class="btn-subtitle">Set your own time</div>
            </div>
          </button>
        </div>
      </div>
    `;
  }

  private async renderRecentSessions(): Promise<string> {
    const sessions = await this.timeTrackingService.getSessionHistory(5);
    const completedSessions = sessions.filter(s => s.endTime);

    if (completedSessions.length === 0) {
      return '<div class="no-sessions">No recent sessions</div>';
    }

    return completedSessions.map(session => {
      const sessionTypeIcons = {
        'pomodoro': '🍅',
        'short-focus': '⚡',
        'deep-work': '🧠',
        'extended-focus': '🎯',
        'custom': '⚙️',
        'regular': '⏰',
        'break': '☕'
      };

      const startTime = new Date(session.startTime);
      const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="session-item">
          <div class="session-icon">${sessionTypeIcons[session.type]}</div>
          <div class="session-details">
            <div class="session-title">${session.type.charAt(0).toUpperCase() + session.type.slice(1)}</div>
            <div class="session-meta">${timeStr} • ${session.duration}min • Focus: ${session.focusScore}/10</div>
          </div>
        </div>
      `;
    }).join('');
  }

  private calculateRemainingTime(session: TimeSession): number {
    const startTime = new Date(session.startTime).getTime();
    const now = Date.now();
    const elapsed = Math.round((now - startTime) / (1000 * 60)); // in minutes
    
    // Subtract break time
    const breakTime = session.breaks.reduce((total, breakSession) => {
      if (breakSession.endTime) {
        return total + breakSession.duration;
      }
      return total;
    }, 0);

    return Math.max(0, session.duration - elapsed + breakTime);
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:00`;
    }
    return `${mins}:00`;
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

      .timer-container {
        max-width: 100%;
      }

      .header h2 {
        margin: 0 0 20px 0;
        color: var(--vscode-foreground);
      }

      .active-session {
        background: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
        text-align: center;
      }

      .session-type {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 16px;
        color: var(--vscode-textLink-foreground);
      }

      .timer-display {
        margin-bottom: 20px;
      }

      .time-remaining {
        font-size: 48px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        color: var(--vscode-textLink-foreground);
        margin-bottom: 12px;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4ECDC4, #007ACC);
        transition: width 0.3s ease;
      }

      .session-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        font-size: 14px;
      }

      .score-value, .interruption-count {
        font-weight: bold;
        color: var(--vscode-textLink-foreground);
      }

      .session-controls {
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .session-selector {
        margin-bottom: 24px;
      }

      .project-selection {
        margin-bottom: 20px;
      }

      .project-selection label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
      }

      .project-selection select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
      }

      .session-types {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .session-btn {
        display: flex;
        align-items: center;
        padding: 16px;
        border: 2px solid var(--vscode-panel-border);
        border-radius: 8px;
        background: var(--vscode-editor-background);
        color: var(--vscode-foreground);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .session-btn:hover {
        border-color: var(--vscode-textLink-foreground);
        background: var(--vscode-editor-inactiveSelectionBackground);
      }

      .btn-icon {
        font-size: 24px;
        margin-right: 12px;
      }

      .btn-text {
        text-align: left;
      }

      .btn-title {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .btn-subtitle {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .stats-section, .recent-sessions {
        margin-bottom: 24px;
      }

      .stats-section h3, .recent-sessions h3 {
        margin-bottom: 12px;
        color: var(--vscode-foreground);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .stat-item {
        text-align: center;
        padding: 12px;
        background: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 6px;
      }

      .stat-value {
        display: block;
        font-size: 18px;
        font-weight: bold;
        color: var(--vscode-textLink-foreground);
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .session-item {
        display: flex;
        align-items: center;
        padding: 12px;
        background: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 6px;
        margin-bottom: 8px;
      }

      .session-icon {
        font-size: 20px;
        margin-right: 12px;
      }

      .session-details {
        flex: 1;
      }

      .session-title {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .session-meta {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .no-sessions {
        text-align: center;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
        padding: 20px;
      }

      .btn-primary, .btn-secondary, .btn-danger {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
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

      .btn-primary:hover, .btn-secondary:hover, .btn-danger:hover {
        opacity: 0.9;
      }
    `;
  }

  private getScript(currentSession?: TimeSession): string {
    return `
      const vscode = acquireVsCodeApi();

      // Event listeners for session controls
      const startPomodoroBtn = document.getElementById('startPomodoroBtn');
      const startShortFocusBtn = document.getElementById('startShortFocusBtn');
      const startDeepWorkBtn = document.getElementById('startDeepWorkBtn');
      const startExtendedFocusBtn = document.getElementById('startExtendedFocusBtn');
      const startCustomSessionBtn = document.getElementById('startCustomSessionBtn');
      const endSessionBtn = document.getElementById('endSessionBtn');
      const startBreakBtn = document.getElementById('startBreakBtn');
      const endBreakBtn = document.getElementById('endBreakBtn');

      if (startPomodoroBtn) {
        startPomodoroBtn.addEventListener('click', () => {
          const projectId = document.getElementById('projectSelect').value;
          vscode.postMessage({ command: 'startPomodoro', projectId });
        });
      }

      if (startShortFocusBtn) {
        startShortFocusBtn.addEventListener('click', () => {
          const projectId = document.getElementById('projectSelect').value;
          vscode.postMessage({ command: 'startShortFocus', projectId });
        });
      }

      if (startDeepWorkBtn) {
        startDeepWorkBtn.addEventListener('click', () => {
          const projectId = document.getElementById('projectSelect').value;
          vscode.postMessage({ command: 'startDeepWork', projectId });
        });
      }

      if (startExtendedFocusBtn) {
        startExtendedFocusBtn.addEventListener('click', () => {
          const projectId = document.getElementById('projectSelect').value;
          vscode.postMessage({ command: 'startExtendedFocus', projectId });
        });
      }

      if (startCustomSessionBtn) {
        startCustomSessionBtn.addEventListener('click', () => {
          const projectId = document.getElementById('projectSelect').value;
          vscode.postMessage({ command: 'startCustomSession', projectId });
        });
      }

      if (endSessionBtn) {
        endSessionBtn.addEventListener('click', () => {
          vscode.postMessage({ command: 'endSession' });
        });
      }

      if (startBreakBtn) {
        startBreakBtn.addEventListener('click', () => {
          vscode.postMessage({ command: 'startBreak', breakType: 'short' });
        });
      }

      if (endBreakBtn) {
        endBreakBtn.addEventListener('click', () => {
          vscode.postMessage({ command: 'endBreak' });
        });
      }

      // Update timer display every second
      ${currentSession ? `
        setInterval(() => {
          const timeElement = document.getElementById('timeRemaining');
          if (timeElement) {
            // This would need to be calculated properly in a real implementation
            // For now, just refresh the view periodically
          }
        }, 1000);
      ` : ''}
    `;
  }

  private async startSession(type: SessionType, projectId?: string): Promise<void> {
    try {
      await this.timeTrackingService.startSession(type, projectId);
      await this.refreshView();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start ${type} session: ${error}`);
    }
  }

  private async endSession(): Promise<void> {
    try {
      await this.timeTrackingService.endSession();
      await this.refreshView();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to end session: ${error}`);
    }
  }

  private async startBreak(breakType: 'short' | 'long'): Promise<void> {
    try {
      await this.timeTrackingService.startBreak(breakType);
      await this.refreshView();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start break: ${error}`);
    }
  }

  private async endBreak(): Promise<void> {
    try {
      await this.timeTrackingService.endBreak();
      await this.refreshView();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to end break: ${error}`);
    }
  }

  private async startCustomSession(projectId?: string): Promise<void> {
    try {
      // This will trigger the VS Code command which handles the duration input
      await vscode.commands.executeCommand('mycroft.startCustomSession');
      await this.refreshView();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start custom session: ${error}`);
    }
  }

  private async refreshView(): Promise<void> {
    if (this.webviewView) {
      this.webviewView.webview.html = await this.getWebviewContent(this.webviewView.webview);
    }
  }
}
