import * as vscode from 'vscode';
import { ActivityLoggerProvider } from './providers/ActivityLoggerProvider';
import { checkAndInitializeRepository, initializeRepository } from './github/repository';
import { DEFAULT_DAILY_GOAL } from './constants';

export async function activate(context: vscode.ExtensionContext) {
  const provider = new ActivityLoggerProvider(context);

  let initCommand = vscode.commands.registerCommand('mycroft.initRepo', async () => {
    await initializeRepository();
  });

  let setGoalCommand = vscode.commands.registerCommand('mycroft.setGoal', async () => {
    const goal = await vscode.window.showInputBox({
      prompt: 'Set your daily goal for the number of activities',
      placeHolder: `e.g., ${DEFAULT_DAILY_GOAL}`,
    });
    if (goal) {
      context.globalState.update('dailyGoal', parseInt(goal, 10));
      vscode.window.showInformationMessage(`Daily goal set to ${goal} activities!`);
    }
  });

  await checkAndInitializeRepository();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mycroftView', provider),
    initCommand,
    setGoalCommand
  );
}

export function deactivate() {}