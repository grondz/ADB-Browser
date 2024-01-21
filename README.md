# adb-browser README

ADB Browser is a lightweight plugin to browse Android device file system from VSCode.
![Main_view](https://github.com/grondz/ADB-Browser/assets/8524706/1f862994-a54b-474c-80de-bc16283f3587)

## Features

To activate the plugin, execute `show adb browser` in your Command Palette, or click on `Adb view` icon.
After picking a device you can browse filesystem on it.

 Supported features:

 * Browse the filesystem
 * Copy file/directory to and from device
 * Copy/move file/directory on device
 * Create directory on device
 * Delete file/directory on device

To access these features, right-click on the item in the browser view.

![Menu_no_device_operation](https://github.com/grondz/ADB-Browser/assets/8524706/1353ba27-dd4c-462b-9418-d8733baf02fe)

To copy/move item on the device, first right click on the item and choose `Start device file operation`.
Then navigate to destination folder and right click on it and select respective operation (`Copy/Move item on device`).

![Menu_with_device_operation](https://github.com/grondz/ADB-Browser/assets/8524706/f700e6b7-f5a2-47f1-90dd-33c91c458626)


## Requirements

This browser assumes that:

* adb CLI utility is available on the target computer
* you can access your device from a CLI via adb

## Extension Settings

No settings available.

## Known Issues

Only one item can be selected at a time.

## Release Notes

See **CHANGELOG** 


