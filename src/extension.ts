import * as vscode from 'vscode';

// We'll load Octokit dynamically
let Octokit: any;

const REPO_NAME = 'mycroft-logbook';

export async function activate(context: vscode.ExtensionContext) {
  // Dynamically import Octokit
  const { Octokit: OctokitClass } = await import('@octokit/rest');
  Octokit = OctokitClass;

  // Register the custom webview view provider
  const provider = new ActivityLoggerProvider(context);
  
  // Register the initialize repository command
  let initCommand = vscode.commands.registerCommand('mycroft.initRepo', async () => {
    await initializeRepository();
  });

  // Try to initialize repository on activation
  await checkAndInitializeRepository();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mycroftView', provider),
    initCommand
  );
}

async function getGitHubToken(): Promise<string | undefined> {
  // First try to get token from VS Code GitHub authentication
  try {
    const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
    return session.accessToken;
  } catch (e) {
    // If GitHub authentication fails, try to get token from settings
    return vscode.workspace.getConfiguration('mycroft').get('githubToken');
  }
}

async function checkAndInitializeRepository() {
  const token = await getGitHubToken();
  
  if (!token) {
    vscode.window.showInformationMessage('Please sign in to GitHub to use MyCroft Logger');
    return;
  }

  try {
    const octokit = new Octokit({ auth: token });
    const user = await octokit.users.getAuthenticated();
    
    try {
      // Check if repo exists
      await octokit.repos.get({
        owner: user.data.login,
        repo: REPO_NAME
      });
    } catch (e) {
      // If repo doesn't exist, create it
      await initializeRepository();
    }
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to check repository: ${errorMessage}`);
  }
}

async function initializeRepository() {
  const token = await getGitHubToken();

  if (!token) {
    vscode.window.showErrorMessage('GitHub authentication is required. Please sign in to GitHub.');
    return;
  }

  try {
    const octokit = new Octokit({ auth: token });
    const user = await octokit.users.getAuthenticated();
    
    // Try to create the repository
    try {
      await octokit.repos.createForAuthenticatedUser({
        name: REPO_NAME,
        private: true,
        auto_init: true,
        description: 'My coding activity log tracked by MyCroft VS Code extension'
      });
      
      vscode.window.showInformationMessage('Created new MyCroft logbook repository!');
    } catch (e) {
      // Repository might already exist, which is fine
    }

    // Initialize or update README.md
    const readme = `# MyCroft Logbook

A daily log of my coding activities, automatically tracked by the MyCroft VS Code extension.

## Recent Activities
`;
    
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: user.data.login,
        repo: REPO_NAME,
        path: 'README.md',
        message: 'Initialize MyCroft logbook',
        content: Buffer.from(readme).toString('base64'),
      });
    } catch (e) {
      // README might already exist
    }
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to initialize repository: ${errorMessage}`);
  }
}

class ActivityLoggerProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = this.getWebviewContent(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async message => {
      if (message.command === 'shipActivity') {
        await this.shipActivity(message.text);
      }
    });
  }

  private async shipActivity(activity: string) {
    const token = await getGitHubToken();

    if (!token) {
      vscode.window.showErrorMessage('Please sign in to GitHub to log your activity.');
      return;
    }

    try {
      const octokit = new Octokit({ auth: token });
      const user = await octokit.users.getAuthenticated();

      // Ensure repository exists
      await checkAndInitializeRepository();

      // Get current README content
      const { data: file } = await octokit.repos.getContent({
        owner: user.data.login,
        repo: REPO_NAME,
        path: 'README.md'
      });

      if (!('content' in file)) {
        throw new Error('README.md not found');
      }

      const content = Buffer.from(file.content, 'base64').toString();
      const date = new Date().toISOString().split('T')[0];
      const newActivity = `\n### ${date}\n- ${activity}`;
      
      // Add new activity after the "Recent Activities" section
      const updatedContent = content.includes('## Recent Activities')
        ? content.replace('## Recent Activities\n', `## Recent Activities\n${newActivity}\n`)
        : `${content}\n## Recent Activities\n${newActivity}\n`;

      await octokit.repos.createOrUpdateFileContents({
        owner: user.data.login,
        repo: REPO_NAME,
        path: 'README.md',
        message: `Add activity: ${date}`,
        content: Buffer.from(updatedContent).toString('base64'),
        sha: file.sha
      });

      vscode.window.showInformationMessage('Activity logged successfully!');
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to log activity: ${errorMessage}`);
    }
  }

  private getWebviewContent(webview: vscode.Webview) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Activity Logger</title>
        <style>
          body { 
            padding: 10px; 
            display: flex;
            flex-direction: column;
            height: 100vh;
          }
          textarea {
            width: 100%;
            height: 100px;
            margin-bottom: 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            resize: vertical;
          }
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .ship-icon {
            width: 16px;
            height: 16px;
          }
        </style>
      </head>
      <body>
        <textarea id="activityInput" placeholder="What did you code today? Describe your activity..."></textarea>
        <button id="shipButton">
          <svg class="ship-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0L16 8L8 16L0 8L8 0ZM8 2.8L2.8 8L8 13.2L13.2 8L8 2.8Z"/>
          </svg>
          Ship It!
        </button>
        <script>
          const vscode = acquireVsCodeApi();
          
          // Handle Enter + Cmd/Ctrl to submit
          document.getElementById('activityInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              document.getElementById('shipButton').click();
            }
          });

          document.getElementById('shipButton').addEventListener('click', () => {
            const text = document.getElementById('activityInput').value;
            if (text) {
              vscode.postMessage({
                command: 'shipActivity',
                text: text
              });
              document.getElementById('activityInput').value = '';
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}

export function deactivate() {}