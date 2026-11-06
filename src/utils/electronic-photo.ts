/**
 * 电子照存储管理工具
 * 小程序本地最多两张，满额由用户删除，不自动替换
 */

export interface ElectronicPhoto {
  id: string;
  name: string;
  size: string;
  color: string;
  hdBase64: string;
  sdBase64: string;
  createdAt: number;
}

export class ElectronicPhotoManager {
  private static readonly STORAGE_KEY = 'electronic_photos';
  private static readonly MAX_COUNT = 2; // 最多保存2张

  /**
   * 检查是否可以保存更多电子照
   */
  static canSaveMore(): boolean {
    try {
      const photos = this.getAll();
      return photos.length < this.MAX_COUNT;
    } catch (error) {
      console.error('检查电子照数量失败:', error);
      return false;
    }
  }

  /**
   * 保存电子照
   */
  static save(photo: Omit<ElectronicPhoto, 'id' | 'createdAt'>): boolean {
    try {
      
      // 确保base64数据格式正确
      const processedPhoto = {
        ...photo,
        hdBase64: photo.hdBase64.startsWith('data:') ? photo.hdBase64 : `data:image/png;base64,${photo.hdBase64}`,
        sdBase64: !photo.sdBase64 || photo.sdBase64 === photo.hdBase64 ? '' :
          (photo.sdBase64.startsWith('data:') ? photo.sdBase64 : `data:image/png;base64,${photo.sdBase64}`)
      };
      
      
      const stored = uni.getStorageSync(this.STORAGE_KEY);
      if (stored && !Array.isArray(stored)) return false;
      const photos: ElectronicPhoto[] = stored || [];
      
      // Do not overwrite old photos or treat a storage read error as an empty library.
      if (photos.length >= this.MAX_COUNT) {
        return false;
      }

      const now = Date.now();
      const newPhoto: ElectronicPhoto = {
        ...processedPhoto,
        id: this.generateId(),
        createdAt: now
      };

      photos.push(newPhoto);
      
      // 强制同步存储
      uni.setStorageSync(this.STORAGE_KEY, photos);
      
      return true;
    } catch (error) {
      console.error('保存电子照失败:', error);
      return false;
    }
  }

  /**
   * 获取所有电子照
   */
  static getAll(): ElectronicPhoto[] {
    try {
      const photos = uni.getStorageSync(this.STORAGE_KEY) || [];
      
      // 直接返回所有照片，不再过滤过期照片
      return photos.sort((a: ElectronicPhoto, b: ElectronicPhoto) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('获取电子照列表失败:', error);
      return [];
    }
  }

  /**
   * 获取单个电子照
   */
  static getById(id: string): ElectronicPhoto | null {
    try {
      const photos = this.getAll();
      return photos.find(photo => photo.id === id) || null;
    } catch (error) {
      console.error('获取电子照失败:', error);
      return null;
    }
  }

  /**
   * 删除电子照
   */
  static delete(id: string): boolean {
    try {
      const photos = this.getAll();
      const filteredPhotos = photos.filter(photo => photo.id !== id);
      uni.setStorageSync(this.STORAGE_KEY, filteredPhotos);
      return true;
    } catch (error) {
      console.error('删除电子照失败:', error);
      return false;
    }
  }

  /**
   * 清空所有电子照
   */
  static clear(): boolean {
    try {
      uni.removeStorageSync(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('清空电子照失败:', error);
      return false;
    }
  }

  /**
   * 获取存储统计信息
   */
  static getStats(): { total: number; size: string; oldestDate: string | null } {
    try {
      const photos = this.getAll();
      const total = photos.length;
      
      // 计算存储大小（粗略估算）
      const sizeInBytes = photos.reduce((total, photo) => {
        return total + photo.hdBase64.length + photo.sdBase64.length;
      }, 0);
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      
      // 获取最早的照片日期，格式化为 YYYY-MM-dd
      const oldestDate = photos.length > 0 
        ? this.formatDateString(Math.min(...photos.map(p => p.createdAt)))
        : null;
      
      return {
        total,
        size: `${sizeInMB}MB`,
        oldestDate
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return { total: 0, size: '0MB', oldestDate: null };
    }
  }

  /**
   * 格式化日期为 YYYY-MM-dd
   */
  static formatDateString(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 生成唯一ID
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

}
