import * as vscode from 'vscode';
import SimpleConnector from './SimpleConnector';

export default class TableListProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  constructor(private connector: SimpleConnector) {}

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    return this.connector.query('show tables').then((value: unknown) => {
      const list: string[] | null = String(value).match(/([\w\d_]+)/g);
      return (list && list.length > 1) ? list.slice(1) : ([] as string[]);
    }).then((list: string[]) => list.map(row => {
      const item = new vscode.TreeItem(row);
      item.command = {
        command: "tables.selectNode",
        title: "Select Node",
        arguments: [item]
      };
      return item;
    }));
  }
}
