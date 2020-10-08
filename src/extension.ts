import * as vscode from 'vscode';
import { URL } from 'url';

import open = require('open');

export function activate(context: vscode.ExtensionContext) {
  /**
   * Checks the urlstring is a valid Percipio URL
   * it must be https:// and must end .percipio.com
   *
   * @param {string} [urlstring]
   * @returns {boolean}
   */
  const isValidPercipioUrl = (urlstring?: string): boolean => {
    if (!urlstring) {
      return false;
    }
    let parsedurl;

    try {
      parsedurl = new URL(urlstring);
    } catch (_) {
      return false;
    }

    // Check
    return (parsedurl.protocol === 'https:' && parsedurl.hostname.toLowerCase().endsWith('.percipio.com'));
  };

  /**
   * Gets the selected text from the active editor
   *
   * @returns {string}
   */
  const getSelectedText = (): string => {
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
  };

  /**
   * Get the current language of the editor
   *
   * @returns {string}
   */
  const getLanguageId = (): string => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return '';
    }
    const { document } = editor;
    return document.languageId;
  };

  /**
   * Opens a new browser window to the Percipio site with the searchterm
   *
   * @param {string} searchTerm
   * @returns {void}
   */
  const executeSearch = (searchTerm: string): void => {
    if (!searchTerm || searchTerm.trim() === '') {
      return;
    }

    const currentSite = vscode.workspace.getConfiguration('percipioSearch').get<string>('siteUrl');
    if (!currentSite || currentSite.trim() === '') {
      return;
    }

    const language = getLanguageId();
    const search = language !== '' ? `"${searchTerm.trim()}" ${language}` : searchTerm.trim();
    const encodedWebSearchTerm = encodeURIComponent(search);
    const percipioSearchUrl = `${currentSite}/search?q=${encodedWebSearchTerm}`;

    open(percipioSearchUrl);
  };

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

  const validatePercipioInput = (value: string): string => {
    if (isValidPercipioUrl(value)) {
      return '';
    } else {
      return 'Please enter a valid Percipio site url, such as https://demo.percipio.com';
    }
  };

  const configureSearch = vscode.commands.registerCommand('config.commands.configure-percipio-search', async () => {
    const config = vscode.workspace.getConfiguration('percipioSearch');

    const currentSite = config.get<string>('siteUrl');
    // 1) Getting the Site Url
    const percipioSite = await vscode.window.showInputBox({ placeHolder: 'Enter the Percipio Site URL', value: currentSite, validateInput: validatePercipioInput });

    // Validate the url
    if (percipioSite && isValidPercipioUrl(percipioSite) && currentSite !== percipioSite) {
      // Clean the URL removing any path info etc
      const myURL = new URL(percipioSite);

      // 2) Update if different
      config.update('siteUrl', myURL.origin, vscode.ConfigurationTarget.Global);
    }
  });

  context.subscriptions.push(configureSearch);
  context.subscriptions.push(searchBySelection);
  context.subscriptions.push(searchWithPrompt);
}
