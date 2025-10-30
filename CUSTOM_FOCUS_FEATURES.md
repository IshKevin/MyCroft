# 🎯 MyCroft 2.1 - Custom Focus Time Features

## 🚀 **New Focus Session Types**

MyCroft now supports **5 different focus session types** to match your workflow needs:

### **🍅 Pomodoro (25 minutes)**
- **Perfect for:** Quick tasks, code reviews, bug fixes
- **Keyboard Shortcut:** `Ctrl+Alt+P` / `Cmd+Alt+P`
- **Command:** `MyCroft: Start Pomodoro Session`
- **Setting:** `mycroft.pomodoroLength` (default: 25)

### **⚡ Short Focus (45 minutes)**
- **Perfect for:** Medium-complexity features, refactoring
- **Keyboard Shortcut:** `Ctrl+Alt+S` / `Cmd+Alt+S`
- **Command:** `MyCroft: Start Short Focus Session`
- **Setting:** `mycroft.shortFocusLength` (default: 45)

### **🧠 Deep Work (90 minutes)**
- **Perfect for:** Complex algorithms, architecture design
- **Keyboard Shortcut:** `Ctrl+Alt+D` / `Cmd+Alt+D`
- **Command:** `MyCroft: Start Deep Work Session`
- **Setting:** `mycroft.deepWorkLength` (default: 90)

### **🎯 Extended Focus (4 hours)**
- **Perfect for:** Major features, research, debugging marathons
- **Keyboard Shortcut:** `Ctrl+Alt+E` / `Cmd+Alt+E`
- **Command:** `MyCroft: Start Extended Focus Session`
- **Setting:** `mycroft.extendedFocusLength` (default: 240)

### **⚙️ Custom Duration (1 min - 8 hours)**
- **Perfect for:** Unique timing requirements
- **Keyboard Shortcut:** `Ctrl+Alt+C` / `Cmd+Alt+C`
- **Command:** `MyCroft: Start Custom Session`
- **Interactive:** Prompts for custom duration input

---

## 🎮 **How to Use**

### **From Command Palette**
1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "MyCroft: Start" to see all session options
3. Select your preferred session type
4. Choose a project (optional)
5. Start focusing!

### **From Timer Panel**
1. Open MyCroft Timer panel in sidebar
2. Click on any session type button
3. Select project if desired
4. Session starts automatically

### **From Status Bar**
1. Click the timer icon in status bar
2. Choose from quick action menu
3. Select session type and start

### **Using Keyboard Shortcuts**
- `Ctrl+Alt+P` - Quick Pomodoro
- `Ctrl+Alt+S` - Quick Short Focus
- `Ctrl+Alt+E` - Quick Extended Focus (4hrs)
- `Ctrl+Alt+C` - Custom Duration (prompts for time)

---

## ⚙️ **Configuration**

### **VS Code Settings**
Add to your `settings.json`:

```json
{
  "mycroft.pomodoroLength": 25,
  "mycroft.shortFocusLength": 45,
  "mycroft.deepWorkLength": 90,
  "mycroft.extendedFocusLength": 240,
  "mycroft.breakLength": 5
}
```

### **Customization Options**
- **Pomodoro:** 15-60 minutes (recommended: 25)
- **Short Focus:** 30-90 minutes (recommended: 45)
- **Deep Work:** 60-120 minutes (recommended: 90)
- **Extended Focus:** 120-480 minutes (recommended: 240)
- **Custom:** 1-480 minutes (any duration)

---

## 📊 **Session Analytics**

All session types are tracked with:
- ✅ **Duration tracking**
- ✅ **Focus score monitoring**
- ✅ **Interruption counting**
- ✅ **Break management**
- ✅ **Project association**
- ✅ **Productivity analytics**

### **Enhanced Status Bar**
- Shows current session type with emoji
- Displays remaining time
- Color-coded progress indicators
- Click for quick actions

---

## 🎯 **Use Case Examples**

### **Daily Workflow Suggestions**

**Morning (High Energy):**
- 🎯 Extended Focus (4hrs) - Major feature development
- ☕ Long break
- 🧠 Deep Work (90min) - Complex problem solving

**Afternoon (Medium Energy):**
- ⚡ Short Focus (45min) - Code reviews
- ☕ Short break
- ⚡ Short Focus (45min) - Bug fixes

**Evening (Lower Energy):**
- 🍅 Pomodoro (25min) - Documentation
- 🍅 Pomodoro (25min) - Planning tomorrow

### **Project-Based Usage**

**New Feature Development:**
1. 🎯 Extended Focus - Research & planning
2. 🧠 Deep Work - Core implementation
3. ⚡ Short Focus - Testing & refinement
4. 🍅 Pomodoro - Documentation

**Bug Fixing:**
1. ⚡ Short Focus - Investigation
2. 🍅 Pomodoro - Quick fixes
3. ⚙️ Custom (60min) - Complex debugging

**Code Review:**
1. 🍅 Pomodoro - Small PRs
2. ⚡ Short Focus - Large PRs
3. ⚙️ Custom - Architecture reviews

---

## 🔧 **Technical Implementation**

### **New Session Types Added**
- `short-focus` - 45-minute concentrated work
- `extended-focus` - 4-hour marathon sessions
- `custom` - User-defined duration

### **Enhanced Services**
- `TimeTrackingService` - Supports all session types
- `StatusBarService` - Shows session-specific icons
- `TimerProvider` - Updated UI with all options

### **Configuration Support**
- All session types configurable
- Validation for custom durations
- Persistent settings storage

---

## 🎉 **Benefits**

### **Flexibility**
- Match session length to task complexity
- Adapt to your energy levels throughout the day
- Handle unique timing requirements

### **Productivity**
- Optimal time blocks for different work types
- Reduced context switching
- Better focus maintenance

### **Analytics**
- Track which session types work best for you
- Identify optimal working patterns
- Improve time estimation skills

---

## 🚀 **Getting Started**

1. **Update MyCroft** to version 2.1.0+
2. **Try different session types** for various tasks
3. **Customize durations** in VS Code settings
4. **Use keyboard shortcuts** for quick access
5. **Review analytics** to optimize your workflow

---

**Happy Focusing! 🎯**

*Transform your productivity with flexible focus sessions tailored to your workflow.*
