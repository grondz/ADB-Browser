import Entry from '@devicefarmer/adbkit/dist/src/adb/sync/entry';
import * as vscode from 'vscode';
import { getListOfDirectoryItems, itemSeparator } from './adbUtilities';

const fileIconPath: vscode.ThemeIcon = new vscode.ThemeIcon('file');
const symbolicLinkIconPath: vscode.ThemeIcon = new vscode.ThemeIcon('file-symlink-file');
const binaryFileIconPath: vscode.ThemeIcon = new vscode.ThemeIcon('file-binary');
const directoryIconPath: vscode.ThemeIcon = new vscode.ThemeIcon('file-directory');

export class AdbFilesystemItem extends vscode.TreeItem {
    public readonly label: string;
    public readonly fullPath: string;
    public readonly collapsibleState: vscode.TreeItemCollapsibleState;

    constructor(entry: Entry, parentPath: string
    ) {
        const collapsibleState = (entry.isDirectory() || entry.isSymbolicLink()) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        const itemSuffix = (entry.isDirectory() || entry.isSymbolicLink()) ? itemSeparator : '';
        const itemContext = (entry.isDirectory() || entry.isSymbolicLink()) ? 'directory' : 'file';
        super(entry.name, collapsibleState);
        this.label = entry.name;
        this.fullPath = parentPath + entry.name + itemSuffix;
        this.collapsibleState = collapsibleState;
        this.tooltip = this.fullPath;
        this.contextValue = itemContext;
        if ((entry.isBlockDevice() || entry.isCharacterDevice() || entry.isFIFO() || entry.isSocket())) {
            this.iconPath = binaryFileIconPath;
        } else
            if (entry.isSymbolicLink()) {
                this.iconPath = symbolicLinkIconPath;
            } else
                if (!entry.isDirectory()) {
                    this.iconPath = fileIconPath;
                } else {
                    this.iconPath = directoryIconPath;
                }
    }
}

export class AdbNodeProvider implements vscode.TreeDataProvider<AdbFilesystemItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AdbFilesystemItem | undefined | null | void> = new vscode.EventEmitter<AdbFilesystemItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AdbFilesystemItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private deviceId: string) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AdbFilesystemItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: AdbFilesystemItem | undefined): Promise<AdbFilesystemItem[]> {
        try {
            const directoryContent = element ?
                await getListOfDirectoryItems(this.deviceId, element.fullPath) :
                await getListOfDirectoryItems(this.deviceId, itemSeparator);
            const parentPath = element ? element.fullPath : itemSeparator;
            return Promise.resolve(
                directoryContent.map((entry: Entry) =>
                    new AdbFilesystemItem(entry, parentPath)).sort((a, b) => a.fullPath.localeCompare(b.fullPath))
            );
        } catch (err) {
            return Promise.reject([]);
        }
    }
}