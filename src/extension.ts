import * as vscode from 'vscode';
import { URL } from 'url';

import open = require('open');


/**
 * Gets the selected text from the active editor
 *
 * @returns {string}
 */
function getSelectedText(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return '';
  }

  const { document } = editor;
  const eol = document.eol === 1 ? '\n' : '\r\n';

  const selectedTextLines = editor.selections.map((selection) => {
    if (
      selection.start.line === selection.end.line
      && selection.start.character === selection.end.character
    ) {
      const { range } = document.lineAt(selection.start);
      const text = editor.document.getText(range);
      return `${text}${eol}`;
    }

    return editor.document.getText(selection);
  });

  let result = '';
  if (selectedTextLines.length > 0) {
    result = selectedTextLines[0].trim();
  }

  return result;
}

/**
 * Get the current language of the editor
 *
 * @returns {string}
 */
function getLanguageId(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return '';
  }
  const { document } = editor;
  return document.languageId;
}

/**
 * Opens a new browser window to the Percipio site with the searchterm
 *
 * @param {string} searchTerm
 * @returns {void}
 */
function executeSearch(searchTerm: string): void {
  if (!searchTerm || searchTerm.trim() === '') {
    return;
  }

  const currentSite = vscode.workspace.getConfiguration('percipioSearch').get<string>('siteUrl');
  if (!currentSite || currentSite.trim() === '') {
    vscode.window.showInformationMessage('You need to configure the Percipio Site', 'Open Settings').then(function (button) {
      if (button === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'percipioSearch');
      }
    });
    return;
  }

  const language = getLanguageId();
  const search = language !== '' ? `"${searchTerm.trim()}" ${language}` : searchTerm.trim();
  const encodedWebSearchTerm = encodeURIComponent(search);
  const percipioSearchUrl = `${currentSite}/search?q=${encodedWebSearchTerm}`;

  open(percipioSearchUrl);
}



export function activate(context: vscode.ExtensionContext) {


  const searchBySelection = vscode.commands.registerCommand(
    'extension.percipio-search-selection',
    async () => {
      const searchTerm = getSelectedText();
      await executeSearch(searchTerm);
    },
  );

  const searchWithPrompt = vscode.commands.registerCommand(
    'extension.percipio-search',
    async () => {
      const selectedText = getSelectedText();
      const searchTerm = await vscode.window.showInputBox({
        ignoreFocusOut: selectedText === '',
        placeHolder: 'Enter your Percipio search query',
        // prompt: 'search for tooltip',
        value: selectedText,
        valueSelection: [0, selectedText.length + 1],
      });
      if (searchTerm) {
        await executeSearch(searchTerm);
      }
    },
  );

  const configureSearch = vscode.commands.registerCommand('config.commands.configure-percipio-search', async () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'percipioSearch');
  });

  context.subscriptions.push(configureSearch);
  context.subscriptions.push(searchBySelection);
  context.subscriptions.push(searchWithPrompt);

  const currentSite = vscode.workspace.getConfiguration('percipioSearch').get<string>('siteUrl');
  if (!currentSite || currentSite.trim() === '') {
    vscode.window.showInformationMessage('You need to configure the Percipio Site', 'Open Settings').then(function (button) {
      if (button === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'percipioSearch');
      }
    });
  }

}
