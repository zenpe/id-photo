import { defineStore } from 'pinia';
import { ref } from 'vue';
import { PhotoSize, photoSizes } from '@/model/PhotoSize';
import { PhotoPath } from '@/model/Interfaces';

export const usePhotoStore = defineStore('photo', () => {
  const photoConfig = ref<PhotoSize>({ ...photoSizes[0] });
  const photoPath = ref<PhotoPath>({ base64: '', base64HD: '', base64Path: '', base64HDPath: '' });
  function setPhotoSize(value: PhotoSize) { photoConfig.value = value; }
  function setPhotoPath(value: PhotoPath) { photoPath.value = value; }
  return { photoConfig, photoPath, setPhotoSize, setPhotoPath };
});
