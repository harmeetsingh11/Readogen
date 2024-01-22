// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Check if API key is set on extension activation
  const apiKey = vscode.workspace.getConfiguration().get('readogen.apiKey');
  if (!apiKey) {
    vscode.window
      .showInformationMessage(
        'To activate the extension, please set the OpenAI API key in the extension settings.',
        'Go to Settings'
      )
      .then((selection) => {
        if (selection === 'Go to Settings') {
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'readogen.apiKey'
          );
        }
      });
  }

  let disposable = vscode.commands.registerCommand(
    'readogen.generateReadme',
    async () => {
      /* const apiKey = vscode.workspace.getConfiguration().get('readogen.apiKey');
      if (!apiKey) {
        vscode.window.showErrorMessage(
          'Please set the OpenAI API key in the extension settings.'
        );
        return;
      } */

      const projectTitle = await vscode.window.showInputBox({
        prompt: 'Enter project title',
      });
      const projectDescription = await vscode.window.showInputBox({
        prompt: 'Enter project description',
      });
      const techStack = await vscode.window.showInputBox({
        prompt: 'Enter tech stack (comma-separated)',
      });

      if (!projectTitle || !projectDescription || !techStack) {
        vscode.window.showErrorMessage(
          'Please provide all required information.'
        );
        return;
      }

      const techStackArray = techStack.split(',').map((stack) => stack.trim());

      // Use withProgress to show loading message while fetching data
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating README, please wait...',
          cancellable: false,
        },
        async (progress, token) => {
          try {
            const response = await axios.post(
              'https://api.openai.com/v1/chat/completions',
              {
                model: 'gpt-3.5-turbo',
                messages: [
                  { role: 'system', content: 'You are a helpful assistant.' },
                  {
                    role: 'user',
                    content: `generate github README for ${projectTitle} with ${projectDescription}, tech stack ${techStackArray} in latest badges, highlight key features of project and add emojis to all headings`,
                  },
                ],
                temperature: 0.25,
                max_tokens: 1500,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiKey}`,
                },
              }
            );

            const generatedReadme = `# ${projectTitle}\n\n${projectDescription}\n\nTech Stack: ${techStack}\n\n${response.data.choices[0].message.content}`;

            // Check if there is an active workspace
            const rootPath =
              vscode.workspace.workspaceFolders &&
              vscode.workspace.workspaceFolders[0].uri.fsPath;

            if (rootPath) {
              const readmePath = path.join(rootPath, 'README.md');

              try {
                // Check if README file exists
                if (fs.existsSync(readmePath)) {
                  // Write/overwrite content to the README.md file
                  fs.writeFileSync(readmePath, generatedReadme);
                  vscode.window.showInformationMessage(
                    'README.md updated successfully!'
                  );
                } else {
                  // If it doesn't exist, create it and write content
                  fs.writeFileSync(readmePath, generatedReadme);
                  vscode.window.showInformationMessage(
                    'README.md created successfully!'
                  );
                }
              } catch (error) {
                vscode.window.showErrorMessage(
                  `Error updating README.md: ${error.message}`
                );
              }
            } else {
              vscode.window.showErrorMessage('No active workspace found.');
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              `Error generating README: ${error.message}`
            );
          }
        }
      );
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
