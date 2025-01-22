import * as vscode from 'vscode';

export async function getGitHubToken(): Promise<string | undefined> {
  try {
    const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
    return session.accessToken;
  } catch (e) {
    return vscode.workspace.getConfiguration('mycroft').get('githubToken');
  }
}