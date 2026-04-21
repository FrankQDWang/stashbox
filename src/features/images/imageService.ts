import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { createImageId } from '@/utils/id';

const MAX_IMAGE_COUNT = 3;
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

export async function pickImagesFromLibrary(): Promise<ImagePicker.ImagePickerAsset[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('需要相册权限，才能为宝贝添加照片。');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_IMAGE_COUNT,
    orderedSelection: true,
    quality: 0.75,
  });

  if (result.canceled) {
    return [];
  }

  const validationError = validatePickedAssets(result.assets);
  if (validationError) {
    throw new Error(validationError);
  }

  return result.assets.slice(0, MAX_IMAGE_COUNT);
}

export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error('需要相机权限，才能拍摄宝贝照片。');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.75,
  });

  if (result.canceled) {
    return null;
  }

  const validationError = validatePickedAssets(result.assets);
  if (validationError) {
    throw new Error(validationError);
  }

  return result.assets[0] ?? null;
}

export function validatePickedAssets(assets: ImagePicker.ImagePickerAsset[]): string | null {
  if (assets.length > MAX_IMAGE_COUNT) {
    return '最多添加 3 张照片。';
  }

  const oversized = assets.find((asset) => (asset.fileSize ?? 0) > MAX_IMAGE_SIZE_BYTES);
  if (oversized) {
    return '单张照片不能超过 8MB。';
  }

  return null;
}

export function persistPickedImagesForItem(
  itemId: string,
  assets: ImagePicker.ImagePickerAsset[],
): string[] {
  return persistImageUrisForItem(
    itemId,
    assets.map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
    })),
  );
}

export function persistImageUrisForItem(
  itemId: string,
  images: { uri: string; fileName?: string }[],
): string[] {
  if (images.length === 0) {
    return [];
  }

  const itemDirectory = ensureItemImageDirectory(itemId);

  return images.slice(0, MAX_IMAGE_COUNT).map((image, index) => {
    const source = new File(image.uri);
    const extension = getExtension(image.fileName, source);
    const destination = new File(itemDirectory, `${index}-${createImageId()}${extension}`);

    source.copy(destination);
    return destination.uri;
  });
}

export function deleteLocalImage(localUri: string): void {
  try {
    const file = new File(localUri);

    if (file.exists) {
      file.delete();
    }
  } catch {
    // File deletion is best effort because records may outlive manually removed files.
  }
}

export function deleteLocalImages(localUris: string[]): void {
  localUris.forEach(deleteLocalImage);
}

export function deleteItemImageDirectory(itemId: string): void {
  try {
    const directory = new Directory(Paths.document, 'images', itemId);

    if (directory.exists) {
      directory.delete();
    }
  } catch {
    // Best effort cleanup.
  }
}

function ensureItemImageDirectory(itemId: string): Directory {
  const root = new Directory(Paths.document, 'images');
  if (!root.exists) {
    root.create({ idempotent: true, intermediates: true });
  }

  const itemDirectory = new Directory(root, itemId);
  if (!itemDirectory.exists) {
    itemDirectory.create({ idempotent: true, intermediates: true });
  }

  return itemDirectory;
}

function getExtension(fileName: string | undefined, file: File): string {
  if (file.extension) {
    return file.extension;
  }

  const match = /\.[a-zA-Z0-9]+$/.exec(fileName ?? '');
  return match?.[0] ?? '.jpg';
}
