# **MyCroft - VS Code Activity Tracker**

**Effortlessly track and log your coding activities directly to GitHub from VS Code.**

MyCroft helps developers maintain a structured record of their work by automatically syncing activities to a dedicated repository. Keep track of your progress, milestones, and daily coding tasks with ease.

---

## 🚀 **Features**

- 🔗 **GitHub Integration** – Automatically sync coding activities to your GitHub repository.  
- 📊 **Activity Tracking** – Log tasks, achievements, and milestones in real-time.  
- 📌 **Custom Categories** – Organize your activities with tags and categories.  
- 🎨 **Visual Dashboard** – Monitor progress with an intuitive sidebar interface.  
- 🔄 **Automated Syncing** – Ensure seamless integration with your GitHub repository.  

---

## ⚙️ **Setup**

1. **Install the MyCroft extension** from the VS Code marketplace.  
2. **Configure GitHub settings:**  
   - Add your **GitHub Personal Access Token** (with `repo` permissions).  
   - Set the **repository name** for storing activity logs.  
3. Run the command: **`MyCroft: Initialize Activity Tracking Repository`**.  

---

## 🔧 **Configuration**

This extension requires:  

- **GitHub Personal Access Token** with `repo` permissions.  
- **VS Code version 1.96.0 or higher**.  

### **Settings Example**  

Add the following configuration to your VS Code `settings.json`:  

```json
{
  "mycroft.githubToken": "your-github-token",
  "mycroft.repositoryName": "your-activity-repo"
}
```

---

## 🎯 **Usage**

1. Open **MyCroft** from the VS Code activity bar.  
2. Use the **Activity Logger** to record your work.  
3. Your activities **automatically sync** to GitHub.  

### **Available Commands**  

- `MyCroft: Initialize Activity Tracking Repository` – Set up GitHub tracking for your activities.  

---

## ⚠️ **Known Issues**  

- **Initial setup required** – Ensure your GitHub repository is set up before logging activities.  
- **Token validation timeouts** – May occur on slow internet connections.  

---

## 📌 **Release Notes**

### **v2.1.0** 🎯 **Custom Focus Time Update**

**New Focus Session Types:**
- ⚡ **Short Focus (45min)** - Perfect for medium-complexity tasks
- 🎯 **Extended Focus (4hrs)** - Marathon sessions for major projects
- ⚙️ **Custom Duration** - Set any time from 1 minute to 8 hours
- Enhanced timer controls with 5 different session types

**Keyboard Shortcuts Added:**
- `Ctrl+Alt+S` - Start Short Focus Session
- `Ctrl+Alt+E` - Start Extended Focus Session (4 hours)
- `Ctrl+Alt+C` - Start Custom Duration Session

**Configuration Options:**
- `mycroft.shortFocusLength` - Customize short focus duration
- `mycroft.extendedFocusLength` - Customize extended focus duration
- All session types now configurable in VS Code settings

### **v2.0.0** 🎉 **Major Release - Complete Productivity Overhaul**

- ⏱️ **Advanced Time Tracking** with Pomodoro and Deep Work sessions
- 📁 **Project Management** with goals, milestones, and analytics
- 🏆 **Gamification System** with achievements, XP, and leveling
- 📊 **Enhanced Analytics** with comprehensive dashboards
- 🎨 **Modern UI** with multiple specialized panels
- 🔥 **Advanced Streak Tracking** with detailed analytics
- 📈 **Visual Charts** using Chart.js for better insights
- 🎯 **Goal Setting** for projects and daily targets
- 📤 **Data Export** with comprehensive reporting

### **v1.1.0**
- Enhanced UI for the activity logger sidebar
- Improved visual dashboard for better progress monitoring
- Bug fixes and performance improvements

### **v1.0.0**
- Initial release with GitHub integration
- Activity logging dashboard and automatic syncing
- Support for custom activity categories

---

## 📋 **Requirements**  

- **GitHub account**  
- **Personal Access Token**  
- **Node.js** (for extension development)  

---

## 📜 **License**  

This project is licensed under the **MIT License**.  

---

## 🤝 **Contributing**  

Contributions are welcome! Feel free to submit **issues** or **pull requests** on [GitHub](https://github.com/IshKevin/MyCroft.git).  
