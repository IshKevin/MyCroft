import * as vscode from 'vscode';
import { Activity, TimeSession, Project, UserProfile, Achievement } from '../types';
import { AnalyticsService } from './AnalyticsService';
import { format } from 'date-fns';

/**
 * Data Export Service for MyCroft 2.0
 * Handles exporting data in various formats (JSON, CSV, Markdown)
 */
export class DataExportService {
  private static instance: DataExportService;
  private analyticsService: AnalyticsService;

  private constructor(context: vscode.ExtensionContext) {
    this.analyticsService = AnalyticsService.getInstance(context);
  }

  public static getInstance(context: vscode.ExtensionContext): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService(context);
    }
    return DataExportService.instance;
  }

  /**
   * Export comprehensive data package
   */
  public async exportComprehensiveData(
    activities: Activity[],
    sessions: TimeSession[],
    projects: Project[],
    userProfile: UserProfile,
    achievements: Achievement[]
  ): Promise<void> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        totalActivities: activities.length,
        totalSessions: sessions.length,
        totalProjects: projects.length,
        userLevel: userProfile.level,
        userXP: userProfile.xp
      },
      activities,
      sessions,
      projects,
      userProfile,
      achievements,
      analytics: await this.generateAnalyticsReport(activities, sessions, projects)
    };

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`mycroft-complete-export-${format(new Date(), 'yyyy-MM-dd')}.json`),
      filters: { 'JSON': ['json'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportData, null, 2)));
      vscode.window.showInformationMessage('Complete data export saved successfully!');
    }
  }

  /**
   * Export activities as CSV
   */
  public async exportActivitiesCSV(activities: Activity[]): Promise<void> {
    const csvHeader = 'Date,Time,Activity,Category,Mood,Tags,Project,Duration,Focus Score,Energy\n';
    const csvRows = activities.map(activity => {
      const tags = activity.tags.join(';');
      const projectName = activity.projectId || '';
      const duration = activity.duration || 0;
      const focusScore = activity.focusScore || '';
      const energy = activity.energy || '';
      
      return `"${activity.date}","${activity.time}","${activity.activity}","${activity.category}","${activity.mood}","${tags}","${projectName}",${duration},${focusScore},"${energy}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`mycroft-activities-${format(new Date(), 'yyyy-MM-dd')}.csv`),
      filters: { 'CSV': ['csv'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(csvContent));
      vscode.window.showInformationMessage('Activities exported to CSV successfully!');
    }
  }

  /**
   * Export time sessions as CSV
   */
  public async exportSessionsCSV(sessions: TimeSession[]): Promise<void> {
    const csvHeader = 'Start Time,End Time,Duration,Type,Project,Focus Score,Interruptions,Breaks\n';
    const csvRows = sessions.map(session => {
      const endTime = session.endTime || '';
      const projectName = session.projectId || '';
      const breakCount = session.breaks.length;
      
      return `"${session.startTime}","${endTime}",${session.duration},"${session.type}","${projectName}",${session.focusScore},${session.interruptions},${breakCount}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`mycroft-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`),
      filters: { 'CSV': ['csv'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(csvContent));
      vscode.window.showInformationMessage('Time sessions exported to CSV successfully!');
    }
  }

  /**
   * Generate productivity report in Markdown format
   */
  public async exportProductivityReport(
    activities: Activity[],
    sessions: TimeSession[],
    projects: Project[],
    userProfile: UserProfile
  ): Promise<void> {
    const report = await this.analyticsService.generateProductivityReport(activities, sessions, projects);
    const streakAnalytics = this.analyticsService.analyzeStreakPatterns(activities);
    const dailyPatterns = this.analyticsService.analyzeDailyPatterns(activities);
    
    const markdown = this.generateMarkdownReport(
      activities,
      sessions,
      projects,
      userProfile,
      report,
      streakAnalytics,
      dailyPatterns
    );

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`mycroft-productivity-report-${format(new Date(), 'yyyy-MM-dd')}.md`),
      filters: { 'Markdown': ['md'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown));
      vscode.window.showInformationMessage('Productivity report exported successfully!');
    }
  }

  /**
   * Export project-specific report
   */
  public async exportProjectReport(
    projectId: string,
    activities: Activity[],
    sessions: TimeSession[],
    projects: Project[]
  ): Promise<void> {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      vscode.window.showErrorMessage('Project not found');
      return;
    }

    const projectAnalytics = this.analyticsService.analyzeProjectPerformance(projectId, activities, sessions);
    const projectActivities = activities.filter(a => a.projectId === projectId);
    const projectSessions = sessions.filter(s => s.projectId === projectId);

    const reportData = {
      project,
      analytics: projectAnalytics,
      activities: projectActivities,
      sessions: projectSessions,
      generatedAt: new Date().toISOString()
    };

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`mycroft-project-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.json`),
      filters: { 'JSON': ['json'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(reportData, null, 2)));
      vscode.window.showInformationMessage(`Project "${project.name}" report exported successfully!`);
    }
  }

  /**
   * Export achievements summary
   */
  public async exportAchievements(achievements: Achievement[], userProfile: UserProfile): Promise<void> {
    const unlockedAchievements = achievements.filter(a => a.unlockedAt);
    const inProgressAchievements = achievements.filter(a => !a.unlockedAt && a.progress > 0);
    
    const achievementData = {
      userProfile: {
        username: userProfile.username,
        level: userProfile.level,
        xp: userProfile.xp,
        totalActivities: userProfile.totalActivities,
        currentStreak: userProfile.currentStreak,
        longestStreak: userProfile.longestStreak
      },
      summary: {
        totalAchievements: achievements.length,
        unlockedCount: unlockedAchievements.length,
        inProgressCount: inProgressAchievements.length,
        completionPercentage: Math.round((unlockedAchievements.length / achievements.length) * 100)
      },
      unlockedAchievements,
      inProgressAchievements,
      exportedAt: new Date().toISOString()
    };

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`mycroft-achievements-${format(new Date(), 'yyyy-MM-dd')}.json`),
      filters: { 'JSON': ['json'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(achievementData, null, 2)));
      vscode.window.showInformationMessage('Achievements exported successfully!');
    }
  }

  // Private helper methods
  private async generateAnalyticsReport(activities: Activity[], sessions: TimeSession[], projects: Project[]) {
    const report = await this.analyticsService.generateProductivityReport(activities, sessions, projects);
    const streakAnalytics = this.analyticsService.analyzeStreakPatterns(activities);
    const weeklyTrends = this.analyticsService.analyzeWeeklyTrends(activities, 12);
    const dailyPatterns = this.analyticsService.analyzeDailyPatterns(activities);

    return {
      summary: report.summary,
      trends: report.trends,
      insights: report.insights,
      recommendations: report.recommendations,
      streakAnalytics,
      weeklyTrends,
      dailyPatterns
    };
  }

  private generateMarkdownReport(
    activities: Activity[],
    sessions: TimeSession[],
    projects: Project[],
    userProfile: UserProfile,
    report: any,
    streakAnalytics: any,
    dailyPatterns: any[]
  ): string {
    const reportDate = format(new Date(), 'MMMM dd, yyyy');
    const mostProductiveHour = dailyPatterns.reduce((max, current) => 
      current.productivity > max.productivity ? current : max
    );

    return `# MyCroft Productivity Report
*Generated on ${reportDate}*

## 👤 User Profile
- **Username:** ${userProfile.username}
- **Level:** ${userProfile.level}
- **Total XP:** ${userProfile.xp.toLocaleString()}
- **Total Activities:** ${userProfile.totalActivities.toLocaleString()}
- **Current Streak:** ${userProfile.currentStreak} days
- **Longest Streak:** ${userProfile.longestStreak} days

## 📊 Summary Statistics
- **Total Activities:** ${report.summary.totalActivities.toLocaleString()}
- **Total Time Tracked:** ${Math.round(report.summary.totalTime / 60)} hours ${report.summary.totalTime % 60} minutes
- **Total Sessions:** ${report.summary.totalSessions}
- **Average Session Length:** ${Math.round(report.summary.averageSessionLength)} minutes
- **Average Focus Score:** ${report.summary.averageFocus.toFixed(1)}/10
- **Most Productive Day:** ${report.summary.mostProductiveDay}
- **Most Productive Hour:** ${report.summary.mostProductiveHour}:00

## 🔥 Streak Analytics
- **Current Streak:** ${streakAnalytics.currentStreak} days
- **Longest Streak:** ${streakAnalytics.longestStreak} days
- **Average Streak:** ${streakAnalytics.averageStreak} days
- **Total Active Days:** ${streakAnalytics.totalActiveDays}

## 📈 Productivity Trends
- **Daily Average:** ${report.trends.dailyAverage.toFixed(1)} activities
- **Weekly Average:** ${report.trends.weeklyAverage} activities
- **Monthly Growth:** ${report.trends.monthlyGrowth.toFixed(1)}%
- **Focus Trend:** ${report.trends.focusTrend}
- **Productivity Trend:** ${report.trends.productivityTrend}

## 🎯 Category Breakdown
${Object.entries(report.summary.categoryBreakdown)
  .sort(([,a], [,b]) => (b as number) - (a as number))
  .map(([category, count]) => `- **${category}:** ${count} activities`)
  .join('\n')}

## ⏰ Daily Productivity Patterns
**Peak Productivity Time:** ${mostProductiveHour.hour}:00 (${mostProductiveHour.activityCount} activities, ${mostProductiveHour.averageFocus.toFixed(1)} focus)

### Hourly Breakdown
${dailyPatterns
  .filter(p => p.activityCount > 0)
  .sort((a, b) => b.productivity - a.productivity)
  .slice(0, 10)
  .map(p => `- **${p.hour}:00:** ${p.activityCount} activities, ${p.averageFocus.toFixed(1)} focus`)
  .join('\n')}

## 📁 Project Overview
${projects.length > 0 ? projects.map(project => {
  const projectActivities = activities.filter(a => a.projectId === project.id);
  const projectTime = projectActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
  return `### ${project.name}
- **Status:** ${project.status}
- **Activities:** ${projectActivities.length}
- **Time Spent:** ${Math.round(projectTime / 60)}h ${projectTime % 60}m
- **Goals:** ${project.goals.filter(g => g.isCompleted).length}/${project.goals.length} completed
- **Milestones:** ${project.milestones.filter(m => m.completedAt).length}/${project.milestones.length} completed`;
}).join('\n\n') : '*No projects created yet*'}

## 💡 Key Insights
${report.insights.map((insight: any) => `### ${insight.title}
${insight.description}
${insight.actionable ? '*Actionable insight*' : ''}`).join('\n\n')}

## 🎯 Recommendations
${report.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

---
*Report generated by MyCroft 2.0 - Your Developer Productivity Companion*
`;
  }
}
