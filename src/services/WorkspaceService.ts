import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Workspace Service for MyCroft 2.0
 * Integrates with VS Code workspace to provide context-aware features
 */
export class WorkspaceService {
  private static instance: WorkspaceService;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(context: vscode.ExtensionContext): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService(context);
    }
    return WorkspaceService.instance;
  }

  /**
   * Get current workspace information
   */
  public getWorkspaceInfo(): {
    name: string;
    path: string;
    language: string;
    framework: string;
    fileCount: number;
  } | null {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return null;
    }

    const workspacePath = workspaceFolder.uri.fsPath;
    const workspaceName = workspaceFolder.name;
    
    return {
      name: workspaceName,
      path: workspacePath,
      language: this.detectPrimaryLanguage(workspacePath),
      framework: this.detectFramework(workspacePath),
      fileCount: this.getFileCount()
    };
  }

  /**
   * Detect primary programming language
   */
  private detectPrimaryLanguage(workspacePath: string): string {
    try {
      const fs = require('fs');
      const files = fs.readdirSync(workspacePath);
      
      const languageExtensions: { [ext: string]: string } = {
        '.js': 'JavaScript',
        '.ts': 'TypeScript',
        '.py': 'Python',
        '.java': 'Java',
        '.cs': 'C#',
        '.cpp': 'C++',
        '.c': 'C',
        '.go': 'Go',
        '.rs': 'Rust',
        '.php': 'PHP',
        '.rb': 'Ruby',
        '.swift': 'Swift',
        '.kt': 'Kotlin',
        '.dart': 'Dart'
      };

      const extensionCounts: { [lang: string]: number } = {};
      
      files.forEach((file: string) => {
        const ext = path.extname(file);
        const language = languageExtensions[ext];
        if (language) {
          extensionCounts[language] = (extensionCounts[language] || 0) + 1;
        }
      });

      const primaryLanguage = Object.entries(extensionCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0];
      
      return primaryLanguage || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Detect framework/technology
   */
  private detectFramework(workspacePath: string): string {
    try {
      const fs = require('fs');
      const files = fs.readdirSync(workspacePath);
      
      // Check for specific files that indicate frameworks
      if (files.includes('package.json')) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(path.join(workspacePath, 'package.json'), 'utf8'));
          const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          if (dependencies.react) return 'React';
          if (dependencies.vue) return 'Vue.js';
          if (dependencies.angular || dependencies['@angular/core']) return 'Angular';
          if (dependencies.next) return 'Next.js';
          if (dependencies.nuxt) return 'Nuxt.js';
          if (dependencies.express) return 'Express.js';
          if (dependencies.nestjs || dependencies['@nestjs/core']) return 'NestJS';
          if (dependencies.svelte) return 'Svelte';
          
          return 'Node.js';
        } catch {
          return 'Node.js';
        }
      }
      
      if (files.includes('requirements.txt') || files.includes('setup.py')) return 'Python';
      if (files.includes('Cargo.toml')) return 'Rust';
      if (files.includes('go.mod')) return 'Go';
      if (files.includes('pom.xml') || files.includes('build.gradle')) return 'Java';
      if (files.includes('Gemfile')) return 'Ruby';
      if (files.includes('composer.json')) return 'PHP';
      if (files.includes('pubspec.yaml')) return 'Flutter/Dart';
      
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get file count in workspace
   */
  private getFileCount(): number {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return 0;
      
      // This is a simplified count - in a real implementation,
      // you'd want to recursively count files
      const fs = require('fs');
      const files = fs.readdirSync(workspaceFolder.uri.fsPath);
      return files.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get current file context
   */
  public getCurrentFileContext(): {
    fileName: string;
    language: string;
    lineCount: number;
    isGitTracked: boolean;
  } | null {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return null;
    }

    const document = activeEditor.document;
    const fileName = path.basename(document.fileName);
    const language = document.languageId;
    const lineCount = document.lineCount;
    
    return {
      fileName,
      language,
      lineCount,
      isGitTracked: this.isFileGitTracked(document.fileName)
    };
  }

  /**
   * Check if file is tracked by Git
   */
  private isFileGitTracked(filePath: string): boolean {
    try {
      const { execSync } = require('child_process');
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return false;
      
      const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
      execSync(`git ls-files --error-unmatch "${relativePath}"`, { 
        cwd: workspaceFolder.uri.fsPath,
        stdio: 'ignore'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Suggest activity category based on current context
   */
  public suggestActivityCategory(): string {
    const fileContext = this.getCurrentFileContext();
    if (!fileContext) {
      return 'Coding';
    }

    const fileName = fileContext.fileName.toLowerCase();
    const language = fileContext.language.toLowerCase();

    // File name patterns
    if (fileName.includes('test') || fileName.includes('spec')) {
      return 'Testing';
    }
    if (fileName.includes('readme') || fileName.includes('doc')) {
      return 'Documentation';
    }
    if (fileName.includes('config') || fileName.includes('setup')) {
      return 'Configuration';
    }

    // Language-specific suggestions
    switch (language) {
      case 'markdown':
        return 'Documentation';
      case 'json':
      case 'yaml':
      case 'toml':
        return 'Configuration';
      case 'dockerfile':
        return 'Deployment';
      default:
        return 'Coding';
    }
  }

  /**
   * Generate smart activity suggestions
   */
  public generateActivitySuggestions(): string[] {
    const fileContext = this.getCurrentFileContext();
    const workspaceInfo = this.getWorkspaceInfo();
    
    const suggestions: string[] = [];
    
    if (fileContext) {
      const category = this.suggestActivityCategory();
      const fileName = fileContext.fileName;
      
      switch (category) {
        case 'Testing':
          suggestions.push(
            `Added tests for ${fileName}`,
            `Fixed failing tests in ${fileName}`,
            `Improved test coverage for ${fileName}`
          );
          break;
        case 'Documentation':
          suggestions.push(
            `Updated documentation in ${fileName}`,
            `Added README section`,
            `Documented API endpoints`
          );
          break;
        case 'Configuration':
          suggestions.push(
            `Updated configuration in ${fileName}`,
            `Added new environment variables`,
            `Configured deployment settings`
          );
          break;
        default:
          suggestions.push(
            `Implemented feature in ${fileName}`,
            `Fixed bug in ${fileName}`,
            `Refactored ${fileName}`,
            `Added error handling to ${fileName}`
          );
      }
    }

    if (workspaceInfo) {
      suggestions.push(
        `Added ${workspaceInfo.framework} component`,
        `Fixed ${workspaceInfo.language} compilation error`,
        `Optimized ${workspaceInfo.framework} performance`
      );
    }

    // Generic suggestions
    suggestions.push(
      'Fixed authentication bug',
      'Added input validation',
      'Improved error handling',
      'Optimized database queries',
      'Updated dependencies',
      'Added logging',
      'Improved code comments',
      'Refactored legacy code'
    );

    return suggestions.slice(0, 8); // Return top 8 suggestions
  }

  /**
   * Track workspace changes
   */
  public setupWorkspaceWatchers(): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    // Watch for file changes
    const fileWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
      // Could trigger auto-activity logging based on significant changes
      this.onFileChanged(event.document);
    });

    // Watch for active editor changes
    const editorWatcher = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        this.onActiveEditorChanged(editor);
      }
    });

    disposables.push(fileWatcher, editorWatcher);
    return disposables;
  }

  private onFileChanged(document: vscode.TextDocument): void {
    // Could implement auto-activity detection here
    // For example, detect significant code changes and suggest logging
  }

  private onActiveEditorChanged(editor: vscode.TextEditor): void {
    // Could update context-aware suggestions
    // Update status bar with current file context
  }
}
