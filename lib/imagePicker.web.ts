export type ImagePickResult = { uri: string; mimeType: string; ext: string } | null;

export async function pickImage(_aspect: [number, number]): Promise<ImagePickResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const uri = URL.createObjectURL(file);
      const ext = file.name.split('.').pop() ?? 'jpg';
      resolve({ uri, mimeType: file.type || 'image/jpeg', ext });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
