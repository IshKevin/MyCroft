# MyCroft 2.0 - Development Guide

## 🚀 **Running the Extension Locally**

### **Method 1: Extension Development Host (Recommended)**

1. **Clone and setup:**
```bash
git clone https://github.com/IshKevin/MyCroft.git
cd MyCroft
npm install
```

2. **Compile TypeScript:**
```bash
npm run compile
```

3. **Launch Extension Development Host:**
   - Open the project in VS Code
   - Press `F5` or `Ctrl+Shift+P` → `Debug: Start Debugging`
   - A new VS Code window opens with MyCroft loaded
   - Test all features in the new window

### **Method 2: Package and Install**

1. **Install VSCE:**
```bash
npm install -g vsce
```

2. **Package the extension:**
```bash
npm run package
```

3. **Install locally:**
```bash
code --install-extension mycroft-2.0.0.vsix
```

### **Method 3: Development Scripts**

```bash
# Watch mode (auto-compile on changes)
npm run watch

# Run with development window
npm run dev

# Lint code
npm run lint

# Run tests
npm run test
```

---

## 🏗️ **Architecture Overview**

### **Core Services**
- `TimeTrackingService` - Pomodoro, deep work, session management
- `ProjectService` - Project creation, goals, milestones
- `AchievementService` - XP, leveling, badges, gamification
- `NotificationService` - User notifications and alerts
- `AnalyticsService` - Productivity insights and reporting
- `DataExportService` - Multiple export formats
- `SettingsService` - Configuration management
- `BackupService` - Data backup and restore
- `StatusBarService` - Status bar integration
- `WorkspaceService` - VS Code workspace integration

### **Providers (UI Panels)**
- `ActivityLoggerProvider` - Main activity logging interface
- `AnalyticsProvider` - Charts and analytics dashboard
- `TimerProvider` - Timer controls and session management
- `ProjectsProvider` - Project management interface
- `AchievementsProvider` - Achievements and progress display

### **Data Models**
- `Activity` - Individual logged activities
- `TimeSession` - Timed work sessions
- `Project` - Project organization
- `Achievement` - Gamification badges
- `UserProfile` - User data and preferences

---

## 🎯 **Key Features Implemented**

### **✅ Completed Features**

#### **1. Advanced Time Tracking**
- ✅ Pomodoro Timer (25min sessions)
- ✅ Short Focus Sessions (45min sessions)
- ✅ Deep Work Sessions (90min sessions)
- ✅ Extended Focus Sessions (4hr sessions)
- ✅ Custom Duration Sessions (1min - 8hrs)
- ✅ Break Management
- ✅ Focus Score Tracking
- ✅ Session History
- ✅ Productivity Analytics

#### **2. Project Management**
- ✅ Multi-project Support
- ✅ Goal Setting and Tracking
- ✅ Milestone Management
- ✅ Progress Visualization
- ✅ Project-specific Analytics

#### **3. Gamification System**
- ✅ XP and Leveling
- ✅ Achievement Badges (8+ types)
- ✅ Streak Tracking
- ✅ Progress Visualization
- ✅ Notification System

#### **4. Enhanced Analytics**
- ✅ Comprehensive Charts (Chart.js)
- ✅ Productivity Insights
- ✅ Time Distribution Analysis
- ✅ Category Breakdown
- ✅ Trend Analysis
- ✅ Weekly/Monthly Reports

#### **5. Data Management**
- ✅ Multiple Export Formats (JSON, CSV, Markdown)
- ✅ Automatic Backups
- ✅ Data Import/Export
- ✅ Settings Backup/Restore

#### **6. User Interface**
- ✅ 5 Specialized Panels
- ✅ Status Bar Integration
- ✅ Modern Design
- ✅ Theme Support
- ✅ Responsive Layout

#### **7. Workspace Integration**
- ✅ Context-aware Suggestions
- ✅ Language Detection
- ✅ Framework Detection
- ✅ Smart Activity Categorization

#### **8. Keyboard Shortcuts**
- ✅ `Ctrl+Shift+M` - Quick Log Activity
- ✅ `Ctrl+Alt+P` - Start Pomodoro
- ✅ `Ctrl+Shift+T` - Toggle Timer

---

## 🔧 **Development Commands**

### **Available Scripts**
```bash
npm run compile      # Compile TypeScript
npm run watch        # Watch mode compilation
npm run lint         # ESLint code checking
npm run test         # Run tests
npm run package      # Create .vsix package
npm run dev          # Development mode
```

### **VS Code Commands Added**
- `MyCroft: Initialize Activity Tracking Repository`
- `MyCroft: Set Daily Goal`
- `MyCroft: Start Pomodoro Session`
- `MyCroft: Start Short Focus Session` ⚡ **NEW**
- `MyCroft: Start Deep Work Session`
- `MyCroft: Start Extended Focus Session` 🎯 **NEW**
- `MyCroft: Start Custom Session` ⚙️ **NEW**
- `MyCroft: Create New Project`
- `MyCroft: Generate Analytics`
- `MyCroft: Manage Settings`
- `MyCroft: Export Data`
- `MyCroft: Create Backup`
- `MyCroft: Restore Backup`
- `MyCroft: Quick Log Activity`

---

## 📊 **Testing the Extension**

### **Manual Testing Checklist**

#### **Activity Logging**
- [ ] Log activity with all fields
- [ ] Project selection works
- [ ] XP is awarded correctly
- [ ] Activity appears in list
- [ ] GitHub sync works

#### **Time Tracking**
- [ ] Start Pomodoro session (25min)
- [ ] Start Short Focus session (45min)
- [ ] Start Deep Work session (90min)
- [ ] Start Extended Focus session (4hrs)
- [ ] Start Custom Duration session
- [ ] Break management
- [ ] Session completion
- [ ] Timer status bar updates
- [ ] All session types display correctly

#### **Project Management**
- [ ] Create new project
- [ ] Add goals and milestones
- [ ] Track progress
- [ ] Project analytics
- [ ] Archive projects

#### **Achievements**
- [ ] XP calculation
- [ ] Level progression
- [ ] Achievement unlocks
- [ ] Notifications
- [ ] Progress display

#### **Analytics**
- [ ] Charts render correctly
- [ ] Data accuracy
- [ ] Export functions
- [ ] Insights generation
- [ ] Report generation

#### **Settings & Backup**
- [ ] Settings save/load
- [ ] Backup creation
- [ ] Data restore
- [ ] Import/export
- [ ] Reset to defaults

---

## 🐛 **Common Issues & Solutions**

### **Compilation Errors**
```bash
# Clear compiled files and rebuild
rm -rf out/
npm run compile
```

### **Extension Not Loading**
- Check VS Code version (requires 1.96.0+)
- Verify all dependencies installed
- Check console for errors

### **GitHub Integration Issues**
- Verify GitHub token has `repo` permissions
- Check repository name is correct
- Ensure repository exists and is accessible

### **Data Not Persisting**
- Check VS Code global state
- Verify backup service is working
- Check file permissions

---

## 🚀 **Publishing**

### **Prepare for Publishing**
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Test thoroughly
4. Create package: `npm run package`

### **Publish to Marketplace**
```bash
vsce publish
```

---

## 🤝 **Contributing**

### **Development Setup**
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

### **Code Style**
- Use TypeScript
- Follow ESLint rules
- Add JSDoc comments
- Write tests for new features

---

## 📈 **Performance Considerations**

- Status bar updates every 30 seconds
- Auto-backup every hour
- Chart.js for efficient rendering
- Lazy loading for large datasets
- Efficient data structures

---

## 🔮 **Future Enhancements**

### **Potential Features**
- [ ] AI-powered insights
- [ ] Team collaboration
- [ ] Cloud synchronization
- [ ] Mobile companion app
- [ ] Integration with other tools
- [ ] Advanced reporting
- [ ] Custom themes
- [ ] Plugin system

---

**Happy Developing! 🚀**
