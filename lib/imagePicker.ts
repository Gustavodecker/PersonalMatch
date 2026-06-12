import * as ImagePicker from 'expo-image-picker';

export type ImagePickResult = { uri: string; mimeType: string; ext: string } | null;

export async function pickImage(aspect: [number, number]): Promise<ImagePickResult> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    ext: asset.uri.split('.').pop() ?? 'jpg',
  };
}
