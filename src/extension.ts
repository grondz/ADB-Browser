import * as vscode from 'vscode';
import { openDevice, pullFileFromDevice, pullDirectoryFromDevice, pushToDevice, makeDirectory, removeDirectory, removeFile, renameItem,
	startDeviceFilesystemOperation, moveItemOnDeviceFilesystem, copyItemOnDeviceFilesystem } from './extensionCommands';
import { AdbFilesystemItem } from './AdbNodeProvider';

export function activate(context: vscode.ExtensionContext) {

	const openDeviceCommand = vscode.commands.registerCommand('adb-browser.openDevice', () => {
		openDevice();
	});

	const pullFileFromDeviceCommand = vscode.commands.registerCommand('adb-browser.pullFile', (filesystemItem: AdbFilesystemItem) => {
		pullFileFromDevice(filesystemItem);
	});

	const pullDirectoryFromDeviceCommand = vscode.commands.registerCommand('adb-browser.pullDirectory', (filesystemItem: AdbFilesystemItem) => {
		pullDirectoryFromDevice(filesystemItem);
	});

	const pushToDeviceCommand = vscode.commands.registerCommand('adb-browser.pushItemsToDevice', (filesystemItem: AdbFilesystemItem) => {
		pushToDevice(filesystemItem);
	});

	const makeDirectoryCommand = vscode.commands.registerCommand('adb-browser.makeDirectory', (filesystemItem: AdbFilesystemItem) => {
		makeDirectory(filesystemItem);
	});

	const removeDirectoryCommand = vscode.commands.registerCommand('adb-browser.removeDirectory', (filesystemItem: AdbFilesystemItem) => {
		removeDirectory(filesystemItem);
	});

	const removeFileCommand = vscode.commands.registerCommand('adb-browser.removeFile', (filesystemItem: AdbFilesystemItem) => {
		removeFile(filesystemItem);
	});

	const renameItemOnDeviceCommand = vscode.commands.registerCommand('adb-browser.renameItemOnDevice', (filesystemItem: AdbFilesystemItem) => {
		renameItem(filesystemItem);
	});

	const startDeviceFilesystemOperationCommand = vscode.commands.registerCommand('adb-browser.startDeviceFileOperation', (filesystemItem: AdbFilesystemItem) => {
		startDeviceFilesystemOperation(filesystemItem);
	});

	const moveItemOnDeviceCommand = vscode.commands.registerCommand('adb-browser.moveItemOnDevice', (filesystemItem: AdbFilesystemItem) => {
		moveItemOnDeviceFilesystem(filesystemItem);
	});

	const copyItemOnDeviceCommand = vscode.commands.registerCommand('adb-browser.copyItemOnDevice', (filesystemItem: AdbFilesystemItem) => {
		copyItemOnDeviceFilesystem(filesystemItem);
	});

	context.subscriptions.push(openDeviceCommand);
	context.subscriptions.push(pullFileFromDeviceCommand);
	context.subscriptions.push(pullDirectoryFromDeviceCommand);
	context.subscriptions.push(pushToDeviceCommand);
	context.subscriptions.push(makeDirectoryCommand);
	context.subscriptions.push(removeDirectoryCommand);
	context.subscriptions.push(removeFileCommand);
	context.subscriptions.push(renameItemOnDeviceCommand);
	context.subscriptions.push(startDeviceFilesystemOperationCommand);
	context.subscriptions.push(moveItemOnDeviceCommand);
	context.subscriptions.push(copyItemOnDeviceCommand);
}

export function deactivate() { }