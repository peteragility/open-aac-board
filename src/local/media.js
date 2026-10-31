const MAX_MEDIA_BYTES = 12 * 1024 * 1024;
const SAFE_MEDIA_TYPE =
  /^(image\/(png|jpeg|webp|gif)|audio\/(webm|ogg|mpeg|mp3|mp4|wav|x-wav))(;.*)?$/i;

export function validateLocalMediaURL(value) {
  if (typeof value !== 'string' || value.length > MAX_MEDIA_BYTES * 1.4) {
    throw new Error('Choose a picture or recording smaller than 12 MB.');
  }
  const match = /^data:([^,]+);base64,([A-Za-z0-9+/=\s]*)$/.exec(value);
  if (!match || !SAFE_MEDIA_TYPE.test(match[1])) {
    throw new Error('This picture or recording format is not supported.');
  }
  return value;
}

export function readLocalMedia(file) {
  if (
    !file ||
    file.size > MAX_MEDIA_BYTES ||
    !SAFE_MEDIA_TYPE.test(file.type)
  ) {
    return Promise.reject(
      new Error(
        'Choose a PNG, JPEG, WebP, GIF, or audio file smaller than 12 MB.'
      )
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.onabort = () => reject(new Error('Reading the file was cancelled.'));
    reader.onload = () => {
      try {
        resolve(validateLocalMediaURL(reader.result));
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsDataURL(file);
  });
}
