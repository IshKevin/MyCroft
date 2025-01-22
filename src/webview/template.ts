// src/webview/template.ts
import * as vscode from 'vscode';
import { Activity } from '../types';
import { CATEGORIES, MOODS } from '../constants';

interface WebviewTemplateData {
  activities: Activity[];
  dailyGoal: number;
  currentStreak: number;
  totalShips: number;
  longestStreak: number;
  todayCount: number;
}

// Styles organized by component
const styles = {
  base: `
    body {
      padding: 15px;
      display: flex;
      flex-direction: column;
      height: 100vh;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
    }
  `,
  
  inputs: `
    .input-group {
      background: var(--vscode-editor-background);
      padding: 15px;
      border-radius: 6px;
      border: 1px solid var(--vscode-widget-border);
      margin-bottom: 20px;
      display: grid;
      gap: 10px;
    }
    textarea, select, input {
      width: 100%;
      padding: 8px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
      font-family: var(--vscode-font-family);
      resize: vertical;
    }
    textarea:focus, select:focus, input:focus {
      outline: 1px solid var(--vscode-focusBorder);
      border-color: var(--vscode-focusBorder);
    }
  `,
  
  button: `
    button {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 4px;
      font-weight: 500;
      width: 100%;
      transition: background-color 0.2s;
    }
    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    button:active {
      transform: translateY(1px);
    }
  `,
  
  stats: `
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat {
      background: var(--vscode-editor-background);
      padding: 15px;
      border-radius: 6px;
      border: 1px solid var(--vscode-widget-border);
      text-align: center;
      transition: transform 0.2s;
    }
    .stat:hover {
      transform: translateY(-2px);
    }
    .stat h2 {
      margin: 0;
      font-size: 28px;
      color: var(--vscode-textLink-foreground);
      font-weight: 600;
    }
    .stat p {
      margin: 5px 0 0;
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
    }
  `,
  
  activities: `
    .activity-list {
      display: grid;
      gap: 12px;
    }
    .activity-item {
      padding: 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      transition: transform 0.2s;
    }
    .activity-item:hover {
      transform: translateX(4px);
    }
    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .activity-date {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
    }
    .activity-content {
      margin-bottom: 12px;
      line-height: 1.4;
    }
    .activity-meta {
      display: flex;
      gap: 12px;
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      flex-wrap: wrap;
      align-items: center;
    }
  `,
  
  tags: `
    .tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      white-space: nowrap;
    }
  `,
  
  progress: `
    .progress-container {
      background: var(--vscode-input-background);
      height: 4px;
      border-radius: 2px;
      margin-top: 10px;
      overflow: hidden;
    }
    .progress-bar {
      background: var(--vscode-progressBar-background);
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease;
    }
  `,
  
  chart: `
    .chart-container {
      margin: 20px 0;
      padding: 20px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
    }
  `,
  
  sections: `
    .section-title {
      margin: 24px 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-widget-border);
      font-size: 1.1em;
      font-weight: 600;
    }
  `
};

function getActivityChart(data: WebviewTemplateData) {
  const last30Days = [...Array(30)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const dailyStats = last30Days.map(date => ({
    date,
    count: data.activities.filter(a => a.date === date).length
  }));

  return {
    labels: dailyStats.map(stat => stat.date),
    data: dailyStats.map(stat => stat.count)
  };
}

function renderStats(data: WebviewTemplateData) {
  return `
    <div class="stats">
      <div class="stat">
        <h2>${data.dailyGoal}</h2>
        <p>Daily Goal</p>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${Math.min(100, (data.todayCount / data.dailyGoal) * 100)}%"></div>
        </div>
      </div>
      <div class="stat">
        <h2>${data.currentStreak}</h2>
        <p>Day Streak</p>
      </div>
      <div class="stat">
        <h2>${data.totalShips}</h2>
        <p>Total Ships</p>
      </div>
      <div class="stat">
        <h2>${data.longestStreak}</h2>
        <p>Longest Streak</p>
      </div>
    </div>
  `;
}

function renderInputForm() {
  return `
    <div class="input-group">
      <textarea 
        id="activityInput" 
        placeholder="What did you ship today? (Ctrl/Cmd + Enter to submit)" 
        rows="3"
      ></textarea>
      
      <select id="categoryInput">
        ${CATEGORIES.map(category => 
          `<option value="${category}">${category}</option>`
        ).join('')}
      </select>
      
      <select id="moodInput">
        ${MOODS.map(mood => 
          `<option value="${mood}">${mood}</option>`
        ).join('')}
      </select>
      
      <input 
        id="tagsInput" 
        type="text" 
        placeholder="Add tags (comma separated, e.g., frontend, bugfix, feature)"
      >
      
      <button id="shipButton">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0L16 8L8 16L0 8L8 0ZM8 2.8L2.8 8L8 13.2L13.2 8L8 2.8Z"/>
        </svg>
        Ship It!
      </button>
    </div>
  `;
}

function renderActivityList(activities: Activity[]) {
  if (activities.length === 0) {
    return `
      <div class="activity-item" style="text-align: center;">
        <p>No activities logged yet. Start shipping to see your progress!</p>
      </div>
    `;
  }

  return activities.map(activity => `
    <div class="activity-item">
      <div class="activity-header">
        <div class="activity-date">${activity.date} at ${activity.time}</div>
        <div class="activity-mood">${activity.mood}</div>
      </div>
      <div class="activity-content">${activity.activity}</div>
      <div class="activity-meta">
        <span>📁 ${activity.category}</span>
        <div class="tags">
          ${activity.tags.map(tag => 
            `<span class="tag">${tag}</span>`
          ).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

export async function getWebviewContent(webview: vscode.Webview, data: WebviewTemplateData): Promise<string> {
  const chartData = getActivityChart(data);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Activity Logger</title>
      <style>
        ${Object.values(styles).join('\n')}
      </style>
    </head>
    <body>
      <div class="container">
        ${renderStats(data)}
        
        ${renderInputForm()}
        
        <h3 class="section-title">Activity Trends</h3>
        <div class="chart-container">
          <canvas id="activityChart"></canvas>
        </div>
        
        <h3 class="section-title">Recent Activities</h3>
        <div class="activity-list">
          ${renderActivityList(data.activities)}
        </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script>
        const vscode = acquireVsCodeApi();
        
        // Setup keyboard shortcuts
        document.getElementById('activityInput').addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            document.getElementById('shipButton').click();
          }
        });
        
        // Handle form submission
        document.getElementById('shipButton').addEventListener('click', () => {
          const text = document.getElementById('activityInput').value.trim();
          const category = document.getElementById('categoryInput').value;
          const mood = document.getElementById('moodInput').value;
          const tags = document.getElementById('tagsInput').value
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean);
            
          if (text) {
            vscode.postMessage({
              command: 'shipActivity',
              text,
              category,
              mood,
              tags
            });
            
            // Clear form
            document.getElementById('activityInput').value = '';
            document.getElementById('tagsInput').value = '';
          }
        });
        
        // Initialize activity chart
        const ctx = document.getElementById('activityChart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(chartData.labels)},
            datasets: [{
              label: 'Activities',
              data: ${JSON.stringify(chartData.data)},
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2,
              fill: true,
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                displayColors: false
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `;
}