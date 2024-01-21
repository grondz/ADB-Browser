import * as vscode from 'vscode';
import {
    createDirectory, deleteDirectoryRecursively, deleteFile, getDeviceIds, copyItemOnDevice,
    pullDirectory, pullFile, pushItem, renameItemOnDevice, moveItemOnDevice, getLastPartOfPath, removeTrailingPathSeparator
} from './adbUtilities';
import { AdbNodeProvider, AdbFilesystemItem } from './AdbNodeProvider';

let deviceId: string | undefined;

const saveDialogOptions: vscode.SaveDialogOptions = {
    saveLabel: 'Save',
    title: "Save item",
    defaultUri: vscode.Uri.parse("Undefined", false)
};

const openDialogOptions: vscode.OpenDialogOptions = {
    openLabel: "Copy",
    title: "Select file to transfer",
    canSelectFolders: true,
    canSelectFiles: true
};

const quickPickOptions: vscode.QuickPickOptions = {
    title: 'Choose device',
    canPickMany: false
};

const inputBoxOptions: vscode.InputBoxOptions = {
    placeHolder: "directory name",
    prompt: "Enter a directory name",
    value: ''
};

const newNameInputBoxOptions: vscode.InputBoxOptions = {
    placeHolder: "new name",
    prompt: "Enter new name",
    value: ''
};

let adbNodeProvider: AdbNodeProvider;

let adbTreeView: vscode.TreeView<AdbFilesystemItem | vscode.TreeItem>;
let operationPending = false;
let deviceItemToProcess: string | null = null;

export async function openDevice() {
    try {
        const deviceIdsList = await getDeviceIds();
        await vscode.window.showQuickPick(deviceIdsList, quickPickOptions).then((selectedOption) => {
            deviceId = selectedOption;
        });

        if (isDeviceSet() && !isOperationPending()) {
            vscode.window.showInformationMessage(`Selected device: ${deviceId}`);
            adbNodeProvider = new AdbNodeProvider(deviceId!);
            adbTreeView = vscode.window.createTreeView('adb-browser-view', {
                treeDataProvider: adbNodeProvider
            });
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Error when initializing extension: ${err}`);
    }
}

export async function pullFileFromDevice(filesystemItem: AdbFilesystemItem) {
    if (isDeviceSet() && !isOperationPending()) {
        saveDialogOptions.defaultUri = vscode.Uri.file(filesystemItem.fullPath);
        const fileUri = await vscode.window.showSaveDialog(saveDialogOptions);
        if (fileUri) {
            try {
                operationPending = true;
                const errorMessage = await pullFile(deviceId!, filesystemItem.fullPath, fileUri.fsPath);
                if (errorMessage) {
                    vscode.window.showErrorMessage(`Error while pulling ${filesystemItem.fullPath}: ${errorMessage}`);
                } else {
                    vscode.window.showInformationMessage(`Item ${filesystemItem.fullPath} pull succeeded.`);
                }
            }
            catch (err) {
                vscode.window.showErrorMessage(`Error while pulling ${filesystemItem.fullPath}: ${err}`);
            } finally {
                operationPending = false;
            }
        }
    }
}

export async function pullDirectoryFromDevice(filesystemItem: AdbFilesystemItem) {
    if (isDeviceSet() && !isOperationPending()) {
        saveDialogOptions.defaultUri = vscode.Uri.file(filesystemItem.fullPath);
        const fileUri = await vscode.window.showSaveDialog(saveDialogOptions);
        if (fileUri) {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Window,
                    title: 'Copy data from device'
                },
                async progress => {
                    try {
                        operationPending = true;
                        progress.report({ message: `copying data from device` });
                        const errorMessage = await pullDirectory(deviceId!, filesystemItem.fullPath, fileUri.fsPath);
                        if (errorMessage) {
                            vscode.window.showErrorMessage(`Error while pulling ${filesystemItem.fullPath}: ${errorMessage}`);
                        } else {
                            vscode.window.showInformationMessage(`Directory ${filesystemItem.fullPath} pull succeeded.`);
                        }
                    }
                    catch (err) {
                        vscode.window.showErrorMessage(`Error while pulling ${filesystemItem.fullPath}: ${err}`);
                    } finally {
                        operationPending = false;
                    }
                }
            );
        }
    }
}

export async function pushToDevice(filesystemItem: AdbFilesystemItem) {
    if (isDeviceSet() && !isOperationPending()) {
        const fileUris = await vscode.window.showOpenDialog(openDialogOptions);
        if (fileUris) {
            let allOK: boolean = true;
            operationPending = true;
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Window,
                    title: 'Copy data to device'
                },
                async progress => {
                    return new Promise<void>(async resolve => {
                        try {
                            for (var i = 0; i < fileUris.length; i++) {
                                progress.report({ message: `Pushing item: "${fileUris[i].fsPath}" to device.` });
                                const errorMessage = await pushItem(deviceId!, filesystemItem.fullPath, fileUris[i].fsPath);
                                if (errorMessage) {
                                    vscode.window.showErrorMessage(`Error while pushing item "${fileUris[i].fsPath}"to "${filesystemItem.label}": ${errorMessage}`);
                                    allOK = false;
                                }
                            }
                        }
                        catch (err) {
                            vscode.window.showErrorMessage(`Error while pushing items to ${filesystemItem.label}: ${err}`);
                            allOK = false;
                        } finally {
                            operationPending = false;
                        }

                        if (allOK) {
                            vscode.window.showInformationMessage(`Items push succeeded.`);
                            adbNodeProvider.refresh();
                        }
                        resolve();
                    });
                });
        }
    }
}

export async function makeDirectory(filesystemItem: AdbFilesystemItem) {
    if (isDeviceSet() && !isOperationPending()) {
        const directoryName = await vscode.window.showInputBox(inputBoxOptions);

        if (!directoryName || directoryName.trim() === '') {
            vscode.window.showErrorMessage('Directory name is mandatory when creating a directory');
            return;
        }

        try {
            operationPending = true;
            const errorMessage = await createDirectory(deviceId!, filesystemItem.fullPath + directoryName);
            if (errorMessage) {
                vscode.window.showErrorMessage(`Error when creating directory "${filesystemItem.fullPath + directoryName}": ${errorMessage}`);
            } else {
                vscode.window.showInformationMessage(`Directory "${filesystemItem.fullPath + directoryName}" created.`);
                adbNodeProvider.refresh();
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Error: ${err}`);
        } finally {
            operationPending = false;
        }
    }
}

export async function removeDirectory(filesystemItem: AdbFilesystemItem) {
    if (isDeviceSet() && !isOperationPending()) {
        const answer = await vscode.window.showInformationMessage(`Do you want to delete ${filesystemItem.fullPath} directory and all subdirectories?`, "Yes", "No");
        if (answer === "Yes") {
            try {
                operationPending = true;
                const errorMessage = await deleteDirectoryRecursively(deviceId!, filesystemItem.fullPath);
                if (errorMessage) {
                    vscode.window.showErrorMessage(`Error when deleting directory "${filesystemItem.fullPath}": ${errorMessage}`);
                } else {
                    vscode.window.showInformationMessage(`Directory "${filesystemItem.fullPath}" deleted.`);
                    adbNodeProvider.refresh();
                }
            } catch (err) {
                vscode.window.showErrorMessage(`Error: ${err}`);
            } finally {
                operationPending = false;
            }
        }
    }
}

export async function removeFile(filesystemItem: AdbFilesystemItem) {
    if (isDeviceSet() && !isOperationPending()) {
        const answer = await vscode.window.showInformationMessage(`Do you want to delete ${filesystemItem.fullPath} file?`, "Yes", "No");
        if (answer === "Yes") {
            try {
                operationPending = true;
                const errorMessage = await deleteFile(deviceId!, filesystemItem.fullPath);
                if (errorMessage) {
                    vscode.window.showErrorMessage(`Error when deleting file "${filesystemItem.fullPath}": ${errorMessage}`);
                } else {
                    vscode.window.showInformationMessage(`File "${filesystemItem.fullPath}" deleted.`);
                    adbNodeProvider.refresh();
                }
            } catch (err) {
                vscode.window.showErrorMessage(`Error: ${err}`);
            } finally {
                operationPending = false;
            }
        }
    }
}

export async function renameItem(filesystemItem: AdbFilesystemItem) {
    if (isDeviceSet() && !isOperationPending()) {
        newNameInputBoxOptions.value = getLastPartOfPath(removeTrailingPathSeparator(filesystemItem.fullPath));
        const directoryName = await vscode.window.showInputBox(newNameInputBoxOptions);

        if (!directoryName || directoryName.trim() === '') {
            vscode.window.showErrorMessage('Name must not be empty');
            return;
        }

        try {
            operationPending = true;
            const errorMessage = await renameItemOnDevice(deviceId!, filesystemItem.fullPath, directoryName);
            if (errorMessage) {
                vscode.window.showErrorMessage(`Error when creating directory "${filesystemItem.fullPath + directoryName}": ${errorMessage}`);
            } else {
                vscode.window.showInformationMessage(`Item "${filesystemItem.fullPath}" renamed to "${directoryName}".`);
                adbNodeProvider.refresh();
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Error: ${err}`);
        } finally {
            operationPending = false;
        }
    }
}

export function startDeviceFilesystemOperation(filesystemItem: AdbFilesystemItem) {
    deviceItemToProcess = filesystemItem.fullPath.trim();
}

export async function moveItemOnDeviceFilesystem(filesystemItem: AdbFilesystemItem) {
    if (isDeviceSet() && !isOperationPending() && isDeviceFilesystemOperationPending()) {
        try {
            operationPending = true;
            const errorMessage = await moveItemOnDevice(deviceId!, deviceItemToProcess!!, filesystemItem.fullPath);
            if (errorMessage) {
                vscode.window.showErrorMessage(`Error when moving item "${deviceItemToProcess}" to "${filesystemItem.fullPath}": ${errorMessage}`);
            } else {
                vscode.window.showInformationMessage(`Item "${deviceItemToProcess}" moved to "${filesystemItem.fullPath}".`);
                adbNodeProvider.refresh();
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Error: ${err}`);
        } finally {
            operationPending = false;
            deviceItemToProcess = null;
        }
    }
}

export async function copyItemOnDeviceFilesystem(filesystemItem: AdbFilesystemItem) {
    if (isDeviceSet() && !isOperationPending() && isDeviceFilesystemOperationPending()) {
        try {
            operationPending = true;
            const errorMessage = await copyItemOnDevice(deviceId!, deviceItemToProcess!!, filesystemItem.fullPath);
            if (errorMessage) {
                vscode.window.showErrorMessage(`Error when copying item "${deviceItemToProcess}" to "${filesystemItem.fullPath}": ${errorMessage}`);
            } else {
                vscode.window.showInformationMessage(`Item "${deviceItemToProcess}" copied to "${filesystemItem.fullPath}".`);
                adbNodeProvider.refresh();
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Error: ${err}`);
        } finally {
            operationPending = false;
            deviceItemToProcess = null;
        }
    }
}

function isDeviceFilesystemOperationPending() {
    if (deviceItemToProcess && deviceItemToProcess.trim() !== '') {
        return true;
    } else {
        vscode.window.showErrorMessage('Source item for the operation not selected.');
    }
    return false;
}

function isDeviceSet(): boolean {
    if (deviceId) {
        return true;
    } else {
        vscode.window.showErrorMessage('Choose device ID before using this command');
    }
    return false;
}

function isOperationPending(): boolean {
    if (!operationPending) {
        return false;
    } else {
        vscode.window.showErrorMessage('Operation is pending. Please wait before executing other command.');
    }
    return true;
}