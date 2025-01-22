import * as vscode from 'vscode';
let Octokit: any;
(async () => {
  Octokit = (await import('@octokit/rest')).Octokit;
})();
import { REPO_NAME } from '../constants';
import { getGitHubToken } from './auth';

export async function checkAndInitializeRepository() {
  const token = await getGitHubToken();

  if (!token) {
    vscode.window.showInformationMessage('Please sign in to GitHub to use MyCroft Logger');
    return;
  }

  try {
    const octokit = new Octokit({ auth: token });
    const user = await octokit.users.getAuthenticated();

    try {
      await octokit.repos.get({
        owner: user.data.login,
        repo: REPO_NAME,
      });
    } catch (e) {
      await initializeRepository();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to check repository: ${errorMessage}`);
  }
}

export async function initializeRepository() {
  const token = await getGitHubToken();

  if (!token) {
    vscode.window.showErrorMessage('GitHub authentication is required. Please sign in to GitHub.');
    return;
  }

  try {
    const octokit = new Octokit({ auth: token });
    const user = await octokit.users.getAuthenticated();

    try {
      await octokit.repos.createForAuthenticatedUser({
        name: REPO_NAME,
        private: true,
        auto_init: true,
        description: 'My coding activity log tracked by MyCroft VS Code extension',
      });
      vscode.window.showInformationMessage('Created new MyCroft logbook repository!');
    } catch (e) {
      // Repository might already exist
    }

    await initializeReadme(octokit, user.data.login);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to initialize repository: ${errorMessage}`);
  }
}

async function initializeReadme(octokit: InstanceType<typeof Octokit>, owner: string) {
  const readme = `# MyCroft Logbook

A daily log of my coding activities, automatically tracked by the MyCroft VS Code extension.

## Stats Summary
- Total Activities: 0
- Current Streak: 0 days
- Longest Streak: 0 days

## Recent Activities

| Date       | Time     | Activity | Category | Mood | Tags |
|------------|----------|----------|----------|------|------|
`;

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: REPO_NAME,
      path: 'README.md',
      message: 'Initialize MyCroft logbook',
      content: Buffer.from(readme).toString('base64'),
    });
  } catch (e) {
    // README might already exist
  }
}
