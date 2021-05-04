import * as vscode from 'vscode';
import TableListProvider from './TableListProvider';
import SqlSelectionParser from './SqlSelectionParser';
import SqlDocumentHighlightProvider from './SqlDocumentHighlightProvider';
import SimpleConnector from './SimpleConnector';

export async function activate(context: vscode.ExtensionContext) {
	const output = vscode.window.createOutputChannel('Result');
	const config = vscode.workspace.getConfiguration('sql-runner');
	const loginPath = config.get<string>('loginPath');
	const database = config.get<string>('database');
	const selectLimit = config.get<number>('selectLimit');
	const connector = new SimpleConnector(loginPath, database, selectLimit);

	const tableListProvider = new TableListProvider(connector);
	vscode.window.registerTreeDataProvider('tables', tableListProvider);
	const treeview = vscode.window.createTreeView('tables', {
		treeDataProvider: tableListProvider,
		showCollapseAll: false,
		canSelectMany: false
	});
	context.subscriptions.push(vscode.commands.registerCommand("tables.selectNode", (item:vscode.TreeItem) => {
		const selectSql = `SELECT * FROM ${String(item.label)};`;
		vscode.env.clipboard.writeText(selectSql);
	}));
	context.subscriptions.push(vscode.commands.registerCommand("mysql-runner.changeConnection", async () => {
		const loginPathName = await connector.getLoginPathName();
		const loginPathList = await connector.getLoginPathList();
		vscode.window.showQuickPick(
			loginPathList.map(entry => ({
				label: `$(accounts-view-bar-icon) ${entry.name}`,
				description: entry.user,
				detail: entry.host,
				picked: entry.name === loginPathName,
			})),
			{ ignoreFocusOut: true, placeHolder: 'Change DB Path' }
		).then(async picked => {
			if (picked) {
				const pickedName = picked.label.substr(26);
				const dbList = await connector.changeConnection(pickedName).fetchDatabases();

				vscode.window.showQuickPick(
					dbList.map(dbName => ({ label: `$(database) ${dbName}` })),
					{ ignoreFocusOut: true, placeHolder: 'Select Database' }
				).then(async pickedDB => {
					if (pickedDB) {
						const pickedDbName = pickedDB.label.substr(12);
						connector.setDatabase(pickedDbName);
						tableListProvider.refresh();
					}
				});
			}
		});
	}));
	context.subscriptions.push(vscode.commands.registerCommand("mysql-runner.runSelectQuery", async () => {
		if (vscode.window.activeTextEditor) {
			const sqlSelectionParser = new SqlSelectionParser(vscode.window.activeTextEditor);
			const sql = sqlSelectionParser.getSelectedText();
			if (sql !== '') {
				const range = sqlSelectionParser.getRange();
				const result = await connector.query(sql);

				output.clear();
				output.append(result);
				output.show(true);

				if (range) {
					vscode.window.activeTextEditor.selection = new vscode.Selection(range.start, range.end);
				}
			}
		}
	}));
	context.subscriptions.push(vscode.languages.registerDocumentHighlightProvider('sql', new SqlDocumentHighlightProvider()));
}

// this method is called when your extension is deactivated
export function deactivate() {}
