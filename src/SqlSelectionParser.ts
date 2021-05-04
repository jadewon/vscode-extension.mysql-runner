import * as vscode from 'vscode';

interface IPosition { line: number; character: number; indexOf: number; }

export default class SqlSelectionParser {
  private text: string = '';
  private selectedText: string = '';
  private range?: vscode.Range;
  private position!: vscode.Position;

  constructor(private editor: vscode.TextEditor, position?: vscode.Position) {
    this.position = position ? position : this.editor.selection.start;
    this.init();
  }

  public setRangeByEmptySelection(searchString: string): void {
    const position = this.position;
    let lastIndexOf = Math.max(this.text.split('\n').slice(0, position.line + 1).map((v, i) => i === position.line ? v.substr(0, position.character) : v).join('\n').length - searchString.length, 0);
    while (lastIndexOf !== -1) {
      const indexOf = this.text.indexOf(searchString, lastIndexOf);
      if (indexOf !== -1) {
        const fromTextArray = this.text.substr(0, indexOf).split('\n');
        const toTextArray = this.text.substr(0, indexOf + searchString.length).split('\n');
        const fromTextLine = fromTextArray.length - 1;
        const toTextLine = toTextArray.length - 1;
        if (position.line >= fromTextLine && position.line <= toTextLine) {
          this.range = new vscode.Range(
            new vscode.Position(fromTextLine, fromTextArray[fromTextLine].length),
            new vscode.Position(toTextLine, toTextArray[toTextLine].length)
          );
          break;
        } else if (position.line <= toTextLine) {
          this.range = new vscode.Range(
            new vscode.Position(fromTextLine, 0),
            new vscode.Position(toTextLine, toTextArray[toTextLine].length)
          );
          break;
        }
        lastIndexOf = indexOf + 1;
      } else {
        lastIndexOf = -1;
      }
    }
  }

  public init(): void {
    if (this.editor.selection.isEmpty) {
      const firstLine = this.editor.document.lineAt(0);
      const lastLine = this.editor.document.lineAt(this.editor.document.lineCount - 1);
      const textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
      this.text = this.editor.document.getText(textRange).trim();

      const beforeTextRange = new vscode.Range(firstLine.range.start, this.position);
      const afterTextRange = new vscode.Range(this.position, lastLine.range.end);
      const before = this.editor.document.getText(beforeTextRange);
      const after = this.editor.document.getText(afterTextRange);

      const startIndexOf = before.lastIndexOf(';') + 1;
      const beforeText = before.substr(startIndexOf);
      const afterText = after.substr(0, after.indexOf(';') + 1);
      this.selectedText = (beforeText + afterText).trim();
      this.selectedText !== '' && this.setRangeByEmptySelection(this.selectedText);
    } else {
      this.range = this.editor.selection;
      this.selectedText = this.editor.document.getText(this.editor.selection);
    }
  }

  public getSelectedText(): string {
    return this.selectedText.trim();
  }
  public getRange(): vscode.Range | undefined {
    return this.range;
  }
}
