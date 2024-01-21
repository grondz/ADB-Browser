import { DeviceClient } from '@devicefarmer/adbkit';
import Adb from '@devicefarmer/adbkit';
import Entry from '@devicefarmer/adbkit/dist/src/adb/sync/entry';
import fs from 'fs';
import adb from '@devicefarmer/adbkit/dist/src/adb';

export const itemSeparator: string = '/';
const adbMkdirCommand: string = 'mkdir';
const adbRmdirCommand: string = 'rmdir';
const adbDeleteFileCommand: string = 'rm -f';
const adbRmdirRecursivelyCommand: string = 'rm -rf';
const adbMoveItemOnDevice: string = 'mv';
const adbCopyItemOnDevice: string = 'cp -r';

const client = Adb.createClient();

export async function getDeviceIds(): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
        try {
            const devices = await client.listDevices();
            resolve(devices.map(device => device.id));
        } catch (err) {
            reject(new Error(`Error when getting list of devices: ${err}`));
        }
    }
    );
}

export function getListOfDirectoryItems(deviceId: string, directoryPath: string): Promise<Entry[]> {
    return new Promise(async (resolve, reject) => {
        try {
            const deviceClient = new DeviceClient(client, deviceId);
            resolve(await deviceClient.readdir(directoryPath));
        } catch (err) {
            reject(new Error(`Error when reading directory "${directoryPath}": ${err}`));
        }
    });
};

export async function pullFile(deviceId: string, deviceFilePath: string, localDirectoryPath: string): Promise<string> {
    const deviceClient = new DeviceClient(client, deviceId);
    return _pullFile(deviceClient, deviceFilePath, localDirectoryPath);
};

export async function pullDirectory(deviceId: string, deviceDirectoryPath: string, localDirectoryPath: string): Promise<string> {
    const lastPart = getLastPartOfPath(deviceDirectoryPath);
    const rootLocalDirectoryName = localDirectoryPath + itemSeparator + lastPart;
    try {
        fs.mkdirSync(rootLocalDirectoryName, { recursive: true });
        pullDirectoryRecursively(deviceId, rootLocalDirectoryName, deviceDirectoryPath);
        return Promise.resolve('');
    } catch (err) {
        return Promise.reject(`Error when puling directory "${deviceDirectoryPath}" to "${localDirectoryPath}": ${err}`);
    }
};

async function _pullFile(deviceClient: DeviceClient, deviceFilePath: string, localDirectoryPath: string): Promise<string> {
    const transfer = await deviceClient.pull(deviceFilePath);
    return new Promise((resolve, reject) => {
        try {
            transfer.on('end', () => resolve(''));
            transfer.on('error', () => reject(`Error when pulling item: ${deviceFilePath}`));
            transfer.pipe(fs.createWriteStream(localDirectoryPath));
        } catch (err) {
            reject(`Error when pulling item "${deviceFilePath}": ${err}`);
        }
    });
}

export async function pushItem(deviceId: string, deviceDirectoryPath: string, localFilePath: string): Promise<string> {
    const deviceClient = new DeviceClient(client, deviceId);
    const lastPart = getLastPartOfPath(localFilePath);
    try {
        const stats = fs.statSync(localFilePath);
        if (stats.isDirectory()) {
            const rootDeviceDirectoryName = deviceDirectoryPath + itemSeparator + lastPart;
            const result = await createDirectory(deviceId, rootDeviceDirectoryName);
            if (!result) {
                await pushDirectoryRecursively(deviceId, localFilePath, rootDeviceDirectoryName);
                return Promise.resolve('');
            } else {
                return Promise.reject(`Error when creating directory: ${result}`);
            }
        } else {
            if (stats.isFile()) {
                return _pushItem(deviceClient, deviceDirectoryPath + lastPart, localFilePath);
            } else {
                return Promise.reject('Error: item is not a regular file or a directory');
            }
        }
    } catch (err) {
        return Promise.reject(`Error when pushing item "${localFilePath}" to "${deviceDirectoryPath}": ${err}`);
    }
};

async function _pushItem(deviceClient: DeviceClient, deviceFilePath: string, localFilePath: string): Promise<string> {
    const transfer = await deviceClient.push(localFilePath, deviceFilePath);
    return new Promise((resolve, reject) => {
        try {
            transfer.on('end', () => resolve(''));
            transfer.on('error', () => reject(`Error when pushing item: ${localFilePath}`));
        } catch (err) {
            reject(`Error when pushing item ${localFilePath}: ${err}`);
        }
    });
}

export async function createDirectory(deviceId: string, deviceDirectoryPath: string): Promise<string> {
    return executeShellCommand(deviceId, `${adbMkdirCommand} "${deviceDirectoryPath}"`);
}

export async function deleteDirectory(deviceId: string, deviceDirectoryPath: string): Promise<string> {
    return executeShellCommand(deviceId, `${adbRmdirCommand} "${deviceDirectoryPath}"`);
}

export async function deleteDirectoryRecursively(deviceId: string, deviceDirectoryPath: string): Promise<string> {
    return executeShellCommand(deviceId, `${adbRmdirRecursivelyCommand} "${deviceDirectoryPath}"`);
}

export async function renameItemOnDevice(deviceId: string, sourceItemPath: string, newName: string): Promise<string> {
    const destinationItemPath = replaceLastPartOfPath(sourceItemPath, newName);
    return executeShellCommand(deviceId, `${adbMoveItemOnDevice} "${sourceItemPath}" "${destinationItemPath}"`);
}

export async function moveItemOnDevice(deviceId: string, sourceItemPath: string, destinationItemPath: string): Promise<string> {
    return executeShellCommand(deviceId, `${adbMoveItemOnDevice} "${sourceItemPath}" "${destinationItemPath}"`);
}

export async function copyItemOnDevice(deviceId: string, sourceItemPath: string, destinationItemPath: string): Promise<string> {
    return executeShellCommand(deviceId, `${adbCopyItemOnDevice} "${sourceItemPath}" "${destinationItemPath}"`);
}

export async function deleteFile(deviceId: string, deviceDirectoryPath: string): Promise<string> {
    return executeShellCommand(deviceId, `${adbDeleteFileCommand} "${deviceDirectoryPath}"`);
}

async function executeShellCommand(deviceId: string, command: string): Promise<string> {
    const deviceClient = new DeviceClient(client, deviceId);
    return new Promise((resolve, reject) => {
        try {
            deviceClient.shell(command)
                .then(adb.util.readAll)
                .then(function (output) { resolve(output.toString().trim()); })
                .error(() => reject(`Unknown error when executing command "${command}".`))
                .catch(() => reject(`Unknow error when executing command "${command}".`));
        } catch (err) {
            reject(`Error when executing command "${command}":  ${err}`);
        }
    });
};

async function pushDirectoryRecursively(deviceId: string, localDirectoryPath: string, deviceDirectoryPath: string) {
    let dir = fs.opendirSync(localDirectoryPath);
    try {
        let dirEntry = dir.readSync();
        while (dirEntry) {
            const devicePath = deviceDirectoryPath + itemSeparator + dirEntry.name;
            const localPath = localDirectoryPath + itemSeparator + dirEntry.name;
            if (dirEntry.isFile()) {
                await pushItem(deviceId, deviceDirectoryPath + itemSeparator, localPath);
            } else
                if (dirEntry.isDirectory()) {
                    await createDirectory(deviceId, devicePath);
                    pushDirectoryRecursively(deviceId, localPath, devicePath);
                }
            dirEntry = dir.readSync();
        }
    } catch (err) {
        throw new Error('Error while pushing items: ${err}');
    }
    finally {
        dir.closeSync();
    }
}

async function pullDirectoryRecursively(deviceId: string, localDirectoryPath: string, deviceDirectoryPath: string) {
    try {
        const directoryEntries = await getListOfDirectoryItems(deviceId, deviceDirectoryPath);
        directoryEntries.forEach(async function(entry) {
                const devicePath = deviceDirectoryPath + itemSeparator + entry.name;
                const localPath = localDirectoryPath + itemSeparator + entry.name;
                if (entry.isFile()) {
                    await pullFile(deviceId, devicePath, localPath);
                } else {
                    if (entry.isDirectory()) {
                        fs.mkdirSync(localPath, { recursive: true });
                        pullDirectoryRecursively(deviceId, localPath, devicePath);
                    }
                }
            }
        ); 
    } catch (err) {
        throw new Error(`Error while pulling items: ${err}`);
    }
}

export function getLastPartOfPath(fromPath: string): string {
    const items = fromPath.split(itemSeparator);
    return items.pop()!;
}

function replaceLastPartOfPath(inPath: string, newPart: string): string {
    const items = inPath.split(itemSeparator);
    while (items.pop() === ""){};
    items.push(newPart);
    return items.join(itemSeparator);
}

export function removeTrailingPathSeparator(fromPath: string): string {
    if (fromPath.endsWith(itemSeparator)) {
        return fromPath.slice(0, -1);
    }
    return fromPath;
}