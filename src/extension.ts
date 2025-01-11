import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "mycroft" is now active!');

  const disposable = vscode.commands.registerCommand('mycroft.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from MyCroft! with view');
  });

  context.subscriptions.push(disposable);

  
  vscode.window.registerWebviewViewProvider('mycroftView', new MyCroftViewProvider(context));
}

export function deactivate() {}

class MyCroftViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
    };

    // Set the HTML content for the Webview view
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MyCroft View</title>
      </head>
      <body>
        <h1>Hello from MyCroft!</h1>
        <p>This is your custom view content displayed in the primary sidebar.</p>
      </body>
      </html>
    `;
  }
}
