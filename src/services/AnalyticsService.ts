import * as vscode from 'vscode';
import { Activity, TimeSession, Project, UserProfile } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

/**
 * Analytics Service for MyCroft 2.0
 * Provides comprehensive analytics and insights for productivity tracking
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(context: vscode.ExtensionContext): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(context);
    }
    return AnalyticsService.instance;
  }

  /**
   * Generate comprehensive productivity report
   */
  public async generateProductivityReport(activities: Activity[], sessions: TimeSession[], projects: Project[]): Promise<{
    summary: ProductivitySummary;
    trends: ProductivityTrends;
    insights: ProductivityInsight[];
    recommendations: string[];
  }> {
    const summary = this.calculateProductivitySummary(activities, sessions);
    const trends = this.analyzeProductivityTrends(activities, sessions);
    const insights = this.generateProductivityInsights(activities, sessions, projects);
    const recommendations = this.generateRecommendations(activities, sessions, insights);

    return {
      summary,
      trends,
      insights,
      recommendations
    };
  }

  /**
   * Calculate daily productivity patterns
   */
  public analyzeDailyPatterns(activities: Activity[]): DailyPattern[] {
    const hourlyActivity: { [hour: number]: number } = {};
    const hourlyFocus: { [hour: number]: number[] } = {};

    activities.forEach(activity => {
      const date = new Date(`${activity.date} ${activity.time}`);
      const hour = date.getHours();
      
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      
      if (activity.focusScore) {
        if (!hourlyFocus[hour]) {
          hourlyFocus[hour] = [];
        }
        hourlyFocus[hour].push(activity.focusScore);
      }
    });

    const patterns: DailyPattern[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const activityCount = hourlyActivity[hour] || 0;
      const focusScores = hourlyFocus[hour] || [];
      const averageFocus = focusScores.length > 0 
        ? focusScores.reduce((sum, score) => sum + score, 0) / focusScores.length 
        : 0;

      patterns.push({
        hour,
        activityCount,
        averageFocus: Math.round(averageFocus * 10) / 10,
        productivity: this.calculateHourlyProductivity(activityCount, averageFocus)
      });
    }

    return patterns;
  }

  /**
   * Analyze weekly productivity trends
   */
  public analyzeWeeklyTrends(activities: Activity[], weeks: number = 12): WeeklyTrend[] {
    const weeklyData: { [weekKey: string]: { activities: Activity[]; totalTime: number } } = {};
    
    activities.forEach(activity => {
      const date = parseISO(activity.date);
      const weekStart = startOfWeek(date);
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { activities: [], totalTime: 0 };
      }
      
      weeklyData[weekKey].activities.push(activity);
      weeklyData[weekKey].totalTime += activity.duration || 0;
    });

    const trends: WeeklyTrend[] = Object.entries(weeklyData)
      .map(([weekKey, data]) => ({
        weekStart: weekKey,
        activityCount: data.activities.length,
        totalTime: data.totalTime,
        averageFocus: this.calculateAverageFocus(data.activities),
        categoryBreakdown: this.calculateCategoryBreakdown(data.activities),
        productivity: this.calculateWeeklyProductivity(data.activities, data.totalTime)
      }))
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())
      .slice(0, weeks);

    return trends;
  }

  /**
   * Generate project analytics
   */
  public analyzeProjectPerformance(projectId: string, activities: Activity[], sessions: TimeSession[]): ProjectAnalytics {
    const projectActivities = activities.filter(a => a.projectId === projectId);
    const projectSessions = sessions.filter(s => s.projectId === projectId);
    
    const totalTime = projectActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalSessions = projectSessions.length;
    const averageSessionLength = totalSessions > 0 ? totalTime / totalSessions : 0;
    
    const categoryBreakdown = this.calculateCategoryBreakdown(projectActivities);
    const dailyActivity = this.calculateDailyActivity(projectActivities);
    const focusAnalysis = this.analyzeFocusPatterns(projectActivities);
    
    return {
      projectId,
      totalActivities: projectActivities.length,
      totalTime,
      totalSessions,
      averageSessionLength,
      categoryBreakdown,
      dailyActivity,
      focusAnalysis,
      productivity: this.calculateProjectProductivity(projectActivities, totalTime)
    };
  }

  /**
   * Calculate streak analytics
   */
  public analyzeStreakPatterns(activities: Activity[]): StreakAnalytics {
    const dailyActivity: { [date: string]: number } = {};
    
    activities.forEach(activity => {
      dailyActivity[activity.date] = (dailyActivity[activity.date] || 0) + 1;
    });

    const dates = Object.keys(dailyActivity).sort();
    const streaks: number[] = [];
    let currentStreak = 0;
    let longestStreak = 0;
    let totalActiveDays = dates.length;

    for (let i = 0; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      const nextDate = i < dates.length - 1 ? new Date(dates[i + 1]) : null;
      
      currentStreak++;
      
      if (!nextDate || (nextDate.getTime() - currentDate.getTime()) > 24 * 60 * 60 * 1000) {
        streaks.push(currentStreak);
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 0;
      }
    }

    const averageStreak = streaks.length > 0 ? streaks.reduce((sum, s) => sum + s, 0) / streaks.length : 0;
    
    return {
      currentStreak: this.calculateCurrentStreak(activities),
      longestStreak,
      averageStreak: Math.round(averageStreak * 10) / 10,
      totalActiveDays,
      streakDistribution: this.calculateStreakDistribution(streaks)
    };
  }

  // Private helper methods
  private calculateProductivitySummary(activities: Activity[], sessions: TimeSession[]): ProductivitySummary {
    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalSessions = sessions.length;
    const averageFocus = this.calculateAverageFocus(activities);
    const categoryBreakdown = this.calculateCategoryBreakdown(activities);
    
    return {
      totalActivities: activities.length,
      totalTime,
      totalSessions,
      averageSessionLength: totalSessions > 0 ? totalTime / totalSessions : 0,
      averageFocus,
      categoryBreakdown,
      mostProductiveDay: this.findMostProductiveDay(activities),
      mostProductiveHour: this.findMostProductiveHour(activities)
    };
  }

  private analyzeProductivityTrends(activities: Activity[], sessions: TimeSession[]): ProductivityTrends {
    const last30Days = activities.filter(a => {
      const activityDate = new Date(a.date);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return activityDate >= thirtyDaysAgo;
    });

    const last7Days = activities.filter(a => {
      const activityDate = new Date(a.date);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return activityDate >= sevenDaysAgo;
    });

    return {
      dailyAverage: last30Days.length / 30,
      weeklyAverage: last7Days.length,
      monthlyGrowth: this.calculateGrowthRate(activities, 30),
      focusTrend: this.calculateFocusTrend(activities),
      productivityTrend: this.calculateProductivityTrend(activities)
    };
  }

  private generateProductivityInsights(activities: Activity[], sessions: TimeSession[], projects: Project[]): ProductivityInsight[] {
    const insights: ProductivityInsight[] = [];
    
    // Most productive time insight
    const hourlyPatterns = this.analyzeDailyPatterns(activities);
    const mostProductiveHour = hourlyPatterns.reduce((max, current) => 
      current.productivity > max.productivity ? current : max
    );
    
    insights.push({
      type: 'time_optimization',
      title: 'Peak Productivity Time',
      description: `You're most productive at ${mostProductiveHour.hour}:00 with ${mostProductiveHour.activityCount} activities and ${mostProductiveHour.averageFocus}/10 focus.`,
      impact: 'high',
      actionable: true
    });

    // Focus pattern insight
    const averageFocus = this.calculateAverageFocus(activities);
    if (averageFocus < 7) {
      insights.push({
        type: 'focus_improvement',
        title: 'Focus Enhancement Opportunity',
        description: `Your average focus score is ${averageFocus.toFixed(1)}/10. Consider using Pomodoro technique or eliminating distractions.`,
        impact: 'medium',
        actionable: true
      });
    }

    // Category balance insight
    const categoryBreakdown = this.calculateCategoryBreakdown(activities);
    const categories = Object.keys(categoryBreakdown);
    if (categories.length < 3) {
      insights.push({
        type: 'variety',
        title: 'Work Variety',
        description: 'Consider diversifying your activities across more categories for balanced skill development.',
        impact: 'low',
        actionable: true
      });
    }

    return insights;
  }

  private generateRecommendations(activities: Activity[], sessions: TimeSession[], insights: ProductivityInsight[]): string[] {
    const recommendations: string[] = [];
    
    // Based on insights
    insights.forEach(insight => {
      if (insight.actionable) {
        switch (insight.type) {
          case 'time_optimization':
            recommendations.push('Schedule your most important tasks during your peak productivity hours.');
            break;
          case 'focus_improvement':
            recommendations.push('Try the Pomodoro technique to improve focus and reduce distractions.');
            break;
          case 'variety':
            recommendations.push('Explore different types of coding activities to develop diverse skills.');
            break;
        }
      }
    });

    // Session-based recommendations
    const completedSessions = sessions.filter(s => s.endTime);
    if (completedSessions.length > 0) {
      const averageSessionLength = completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length;
      
      if (averageSessionLength < 25) {
        recommendations.push('Consider longer focused work sessions for better deep work.');
      } else if (averageSessionLength > 90) {
        recommendations.push('Take more frequent breaks to maintain high focus levels.');
      }
    }

    return recommendations;
  }

  private calculateAverageFocus(activities: Activity[]): number {
    const focusScores = activities.filter(a => a.focusScore).map(a => a.focusScore!);
    return focusScores.length > 0 ? focusScores.reduce((sum, score) => sum + score, 0) / focusScores.length : 0;
  }

  private calculateCategoryBreakdown(activities: Activity[]): { [category: string]: number } {
    const breakdown: { [category: string]: number } = {};
    activities.forEach(activity => {
      breakdown[activity.category] = (breakdown[activity.category] || 0) + 1;
    });
    return breakdown;
  }

  private calculateDailyActivity(activities: Activity[]): { [date: string]: number } {
    const daily: { [date: string]: number } = {};
    activities.forEach(activity => {
      daily[activity.date] = (daily[activity.date] || 0) + 1;
    });
    return daily;
  }

  private analyzeFocusPatterns(activities: Activity[]): FocusAnalysis {
    const focusScores = activities.filter(a => a.focusScore).map(a => a.focusScore!);
    
    if (focusScores.length === 0) {
      return { average: 0, trend: 'stable', distribution: {} };
    }

    const average = focusScores.reduce((sum, score) => sum + score, 0) / focusScores.length;
    const distribution: { [score: number]: number } = {};
    
    focusScores.forEach(score => {
      distribution[score] = (distribution[score] || 0) + 1;
    });

    // Calculate trend (simplified)
    const recentScores = focusScores.slice(-10);
    const olderScores = focusScores.slice(0, -10);
    const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const olderAvg = olderScores.length > 0 ? olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length : recentAvg;
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 0.5) trend = 'improving';
    else if (recentAvg < olderAvg - 0.5) trend = 'declining';

    return { average, trend, distribution };
  }

  private calculateHourlyProductivity(activityCount: number, averageFocus: number): number {
    return activityCount * (averageFocus / 10);
  }

  private calculateWeeklyProductivity(activities: Activity[], totalTime: number): number {
    const averageFocus = this.calculateAverageFocus(activities);
    return (activities.length * averageFocus * totalTime) / 1000; // Normalized score
  }

  private calculateProjectProductivity(activities: Activity[], totalTime: number): number {
    const averageFocus = this.calculateAverageFocus(activities);
    return (activities.length * averageFocus * totalTime) / 1000; // Normalized score
  }

  private findMostProductiveDay(activities: Activity[]): string {
    const dailyActivity = this.calculateDailyActivity(activities);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayActivity: { [day: string]: number } = {};

    Object.keys(dailyActivity).forEach(date => {
      const dayOfWeek = dayNames[new Date(date).getDay()];
      dayActivity[dayOfWeek] = (dayActivity[dayOfWeek] || 0) + dailyActivity[date];
    });

    return Object.entries(dayActivity).reduce((max, [day, count]) => 
      count > (dayActivity[max] || 0) ? day : max, 'Monday'
    );
  }

  private findMostProductiveHour(activities: Activity[]): number {
    const hourlyActivity: { [hour: number]: number } = {};
    
    activities.forEach(activity => {
      const hour = new Date(`${activity.date} ${activity.time}`).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    return Object.entries(hourlyActivity).reduce((maxHour, [hour, count]) => 
      count > (hourlyActivity[maxHour] || 0) ? parseInt(hour) : maxHour, 9
    );
  }

  private calculateGrowthRate(activities: Activity[], days: number): number {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentActivities = activities.filter(a => new Date(a.date) >= cutoffDate);
    const olderActivities = activities.filter(a => new Date(a.date) < cutoffDate);
    
    const recentAvg = recentActivities.length / days;
    const olderAvg = olderActivities.length / Math.max(1, olderActivities.length / 30); // Approximate older period
    
    return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  }

  private calculateFocusTrend(activities: Activity[]): 'improving' | 'declining' | 'stable' {
    const focusScores = activities.filter(a => a.focusScore).map(a => a.focusScore!);
    if (focusScores.length < 10) return 'stable';
    
    const recentScores = focusScores.slice(-10);
    const olderScores = focusScores.slice(0, -10);
    
    const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;
    
    if (recentAvg > olderAvg + 0.5) return 'improving';
    if (recentAvg < olderAvg - 0.5) return 'declining';
    return 'stable';
  }

  private calculateProductivityTrend(activities: Activity[]): 'improving' | 'declining' | 'stable' {
    if (activities.length < 20) return 'stable';
    
    const recentActivities = activities.slice(-10);
    const olderActivities = activities.slice(0, -10);
    
    const recentProductivity = this.calculateWeeklyProductivity(recentActivities, 
      recentActivities.reduce((sum, a) => sum + (a.duration || 0), 0));
    const olderProductivity = this.calculateWeeklyProductivity(olderActivities,
      olderActivities.reduce((sum, a) => sum + (a.duration || 0), 0));
    
    if (recentProductivity > olderProductivity * 1.1) return 'improving';
    if (recentProductivity < olderProductivity * 0.9) return 'declining';
    return 'stable';
  }

  private calculateCurrentStreak(activities: Activity[]): number {
    const today = new Date().toISOString().split('T')[0];
    const dailyActivity: { [date: string]: number } = {};
    
    activities.forEach(activity => {
      dailyActivity[activity.date] = (dailyActivity[activity.date] || 0) + 1;
    });

    let streak = 0;
    let currentDate = new Date(today);
    
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (dailyActivity[dateStr]) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  private calculateStreakDistribution(streaks: number[]): { [range: string]: number } {
    const distribution: { [range: string]: number } = {
      '1-3 days': 0,
      '4-7 days': 0,
      '8-14 days': 0,
      '15-30 days': 0,
      '30+ days': 0
    };

    streaks.forEach(streak => {
      if (streak <= 3) distribution['1-3 days']++;
      else if (streak <= 7) distribution['4-7 days']++;
      else if (streak <= 14) distribution['8-14 days']++;
      else if (streak <= 30) distribution['15-30 days']++;
      else distribution['30+ days']++;
    });

    return distribution;
  }
}

// Type definitions for analytics
interface ProductivitySummary {
  totalActivities: number;
  totalTime: number;
  totalSessions: number;
  averageSessionLength: number;
  averageFocus: number;
  categoryBreakdown: { [category: string]: number };
  mostProductiveDay: string;
  mostProductiveHour: number;
}

interface ProductivityTrends {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyGrowth: number;
  focusTrend: 'improving' | 'declining' | 'stable';
  productivityTrend: 'improving' | 'declining' | 'stable';
}

interface ProductivityInsight {
  type: 'time_optimization' | 'focus_improvement' | 'variety' | 'consistency';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface DailyPattern {
  hour: number;
  activityCount: number;
  averageFocus: number;
  productivity: number;
}

interface WeeklyTrend {
  weekStart: string;
  activityCount: number;
  totalTime: number;
  averageFocus: number;
  categoryBreakdown: { [category: string]: number };
  productivity: number;
}

interface ProjectAnalytics {
  projectId: string;
  totalActivities: number;
  totalTime: number;
  totalSessions: number;
  averageSessionLength: number;
  categoryBreakdown: { [category: string]: number };
  dailyActivity: { [date: string]: number };
  focusAnalysis: FocusAnalysis;
  productivity: number;
}

interface FocusAnalysis {
  average: number;
  trend: 'improving' | 'declining' | 'stable';
  distribution: { [score: number]: number };
}

interface StreakAnalytics {
  currentStreak: number;
  longestStreak: number;
  averageStreak: number;
  totalActiveDays: number;
  streakDistribution: { [range: string]: number };
}
