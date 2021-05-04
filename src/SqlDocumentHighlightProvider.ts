import * as vscode from 'vscode';
import SqlSelectionParser from './SqlSelectionParser';

export default class SqlDocumentHighlightProvider implements vscode.DocumentHighlightProvider {
	public provideDocumentHighlights(
			document: vscode.TextDocument,
			position: vscode.Position,
			token: vscode.CancellationToken
		): vscode.DocumentHighlight[] | Thenable<vscode.DocumentHighlight[]> {
		if (vscode.window.activeTextEditor) {
			const sqlSelectionParser = new SqlSelectionParser(vscode.window.activeTextEditor, position);
			const sql = sqlSelectionParser.getSelectedText();
			const range = sqlSelectionParser.getRange();
			if (sql !== '' && range) {
				return [new vscode.DocumentHighlight(range)];
			}
		}
		return [];
	}
}
