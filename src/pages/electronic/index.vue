<template>
  <view class="electronic-page">
    <!-- 顶部导航栏 -->
    <view class="header-bar">
      <view class="header-title">
        <u-icon name="folder" size="24" color="#cc3d35" />
        <text class="title-text">我的电子照</text>
      </view>
      <view class="header-actions">
        <view class="stats-info">
          <text class="stats-text">{{ photos.length }}/{{ MAX_COUNT }}</text>
        </view>
      </view>
    </view>

    <!-- 主要内容区域 -->
    <scroll-view class="content-scroll" scroll-y="true">
      <view v-if="photos.length" class="save-policy">{{ saveHint }}</view>
      <!-- 统计信息卡片 -->
      <view class="stats-card" v-if="photos.length > 0">
        <view class="stats-grid">
          <view class="stats-item">
            <view class="stats-value">{{ stats.total }}</view>
            <view class="stats-label">总数量</view>
          </view>
          <view class="stats-divider"></view>
          <view class="stats-item">
            <view class="stats-value">{{ stats.size }}</view>
            <view class="stats-label">占用空间</view>
          </view>
          <view class="stats-divider"></view>
          <view class="stats-item">
            <view class="stats-value">{{ stats.oldestDate || '-' }}</view>
            <view class="stats-label">最早日期</view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <InlineState v-if="photos.length === 0" title="暂无电子照" description="制作证件照后，可选择保存到本机" action-text="开始制作" icon="photo" @action="navigateToPhoto" />

      <!-- 电子照列表 -->
      <view class="photo-list" v-else>
        <view 
          class="photo-item" 
          v-for="photo in photos" 
          :key="photo.id"
          role="button"
          :aria-label="'查看' + photo.name"
          @click="selectPhoto(photo)">
          <view class="photo-preview">
            <image 
              :src="photo.hdBase64" 
              mode="aspectFit" 
              class="photo-image"
            />
          </view>
          
          <view class="photo-info">
            <view class="photo-header">
              <text class="photo-name">{{ photo.name }}</text>
              <view class="photo-actions">
                <view class="action-btn" :aria-label="saveHint" @click.stop="downloadPhoto(photo)">
                  <u-icon name="download" size="16" color="#cc3d35" />
                </view>
                <view class="action-btn delete" @click.stop="deletePhoto(photo.id)">
                  <u-icon name="trash" size="16" color="#FF4D4F" />
                </view>
              </view>
            </view>
            
            <view class="photo-details">
              <view class="detail-item">
                <text class="detail-label">创建:</text>
                <text class="detail-value">{{ formatDateString(photo.createdAt) }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">颜色:</text>
                <view class="color-preview" :style="{ backgroundColor: photo.color }"></view>
                <text class="detail-value">{{ getColorName(photo.color) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部占位区域 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-action-bar" v-if="photos.length > 0">
      <view class="action-container">
        <u-button 
          :plain="true" 
          text="清空全部" 
          :custom-style="secondaryButtonStyle" 
          @click="clearAll" 
        />
        <u-button 
          color="#cc3d35"
          text="制作证件照"
          :custom-style="primaryButtonStyle" 
          @click="navigateToPhoto" 
        />
      </view>
    </view>

    <!-- 原生分享按钮 - 使用open-type="share"直接触发分享 -->
    <button v-show="false" open-type="share" class="native-share-button" @getuserinfo="onShareSuccess">
      <u-icon name="share" size="20" color="white" />
    </button>

    <!-- 加载页面 -->
    <LoadingOverlay :show="processing" text="正在保存照片" />
  </view>
</template>

<script setup lang="ts">
import { saveToAlbum, showSaveFailure } from '@/utils/album';
import { ElectronicPhotoManager, ElectronicPhoto } from '@/utils/electronic-photo';
import { adManager } from '@/utils/ad-manager';
import { writeTemporaryImage, removeTemporaryImage } from '@/utils/image-file';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import InlineState from '@/components/InlineState.vue';
// 声明微信小程序类型
declare const wx: any;
import { productConfig } from '@/config';
import { ref, computed, onMounted } from 'vue';
import { onShow, onUnload, onShareTimeline, onShareAppMessage } from '@dcloudio/uni-app';

const saveHint = computed(() => {
    return adManager.hint();
});

const electronicPhotoManager = ref(ElectronicPhotoManager);

const primaryButtonStyle = ref({
    width: '280rpx',
    height: '88rpx',
    borderRadius: '20rpx',
    fontSize: '30rpx',
    fontWeight: '600',
    boxShadow: 'none'
});

const secondaryButtonStyle = ref({
    width: '280rpx',
    height: '88rpx',
    borderRadius: '20rpx',
    fontSize: '30rpx',
    fontWeight: '600',
    borderColor: '#e8eaed',
    color: '#17191c'
});

const photos = ref<ElectronicPhoto[]>([]);

const loading = ref<boolean>(false);

const processing = ref<boolean>(false);

const previewing = ref<boolean>(false);

const previewPaths = ref<{ [id: string]: string }>({});

const MAX_COUNT = ref(2);

function handleOnMounted() {
    loadPhotos();
    // 显示分享菜单，包括分享到朋友圈
    // #ifdef MP-WEIXIN
    wx.showShareMenu({
        menus: ['shareAppMessage', 'shareTimeline'],
        fail: () => {
            // No shareTimeline permission on some AppIDs: keep the basic share entry.
            wx.showShareMenu({ menus: ['shareAppMessage'], fail: () => {} });
        }
    });
    // #endif
}

function handleOnShow() {
    // 页面显示时重新加载数据
    loadPhotos();
}

function loadPhotos() {
    const savedPhotos = ElectronicPhotoManager.getAll();
    Object.keys(previewPaths.value).forEach(id => {
        if (!savedPhotos.some(photo => photo.id === id)) {
            removeTemporaryImage(previewPaths.value[id]);
            delete previewPaths.value[id];
        }
    });
    photos.value = savedPhotos;
}

const stats = computed(() => {
    return ElectronicPhotoManager.getStats();
});

async function selectPhoto(photo: ElectronicPhoto) {
    if (previewing.value)
        return;
    previewing.value = true;
    try {
        if (!photo.hdBase64)
            throw new Error('照片已失效，请重新制作');
        let path = previewPaths.value[photo.id] || photo.hdBase64;
        if (path.startsWith('data:image/')) {
            path = await writeTemporaryImage(path, 'electronic-preview');
            previewPaths.value[photo.id] = path;
        }
        uni.previewImage({ current: path, urls: [path], fail: () => uni.showToast({ title: '照片无法预览', icon: 'none' }) });
    }
    catch (error: any) {
        uni.showToast({ title: error.message || '照片无法预览', icon: 'none' });
    }
    finally {
        previewing.value = false;
    }
}

function handleOnUnload() {
    Object.keys(previewPaths.value).forEach(id => removeTemporaryImage(previewPaths.value[id]));
    previewPaths.value = {};
}

async function downloadPhoto(photo: ElectronicPhoto) {
    if (loading.value)
        return;
    loading.value = true;
    let path = '';
    try {
        if (!await adManager.show('electronic:' + photo.id))
            return;
        processing.value = true;
        path = await writeTemporaryImage(photo.hdBase64, 'electronic');
        await saveToAlbum(path);
        uni.showToast({ title: '保存成功', icon: 'success' });
    }
    catch (error: any) {
        showSaveFailure(error);
    }
    finally {
        removeTemporaryImage(path);
        processing.value = false;
        loading.value = false;
    }
}

function deletePhoto(id: string) {
    uni.showModal({
        title: '确认删除',
        content: '确定要删除这张电子照吗？删除后无法恢复。',
        success: (res) => {
            if (res.confirm) {
                if (ElectronicPhotoManager.delete(id)) {
                    loadPhotos();
                    uni.showToast({
                        title: '删除成功',
                        icon: 'success'
                    });
                }
                else {
                    uni.showToast({
                        title: '删除失败',
                        icon: 'none'
                    });
                }
            }
        }
    });
}

function clearAll() {
    uni.showModal({
        title: '确认清空',
        content: '确定要清空所有电子照吗？清空后无法恢复。',
        success: (res) => {
            if (res.confirm) {
                if (ElectronicPhotoManager.clear()) {
                    loadPhotos();
                    uni.showToast({
                        title: '清空成功',
                        icon: 'success'
                    });
                }
                else {
                    uni.showToast({
                        title: '清空失败',
                        icon: 'none'
                    });
                }
            }
        }
    });
}

function getColorName(color: string): string {
    const colorNames: {
        [key: string]: string;
    } = {
        '#FFFFFF': '白色',
        '#4A90E2': '蓝色',
        '#F5F5F5': '浅灰',
        '#E5E5E5': '灰色',
        '#D4E5F7': '淡蓝',
        '#FF6B6B': '红色',
        '#4ECDC4': '青色',
        '#45B7D1': '天蓝',
        '#96CEB4': '薄荷绿',
        '#FFEAA7': '浅黄',
        '#DDA0DD': '梅花红',
        '#F8B500': '橙色'
    };
    return colorNames[color] || color;
}

function formatDateString(timestamp: number): string {
    return ElectronicPhotoManager.formatDateString(timestamp);
}

function navigateToPhoto() {
    uni.switchTab({
        url: '/pages/index/index'
    });
}

function onShareSuccess() {
    uni.showToast({
        title: '分享成功',
        icon: 'success',
        duration: 2000
    });
}

function handleOnShareTimeline() {
    return {
        title: productConfig.shareTitle,
        query: '',
        imageUrl: '/static/example.jpeg'
    };
}

function handleOnShareAppMessage() {
    return {
        title: productConfig.shareTitle,
        path: '/pages/index/index',
        imageUrl: '/static/example.jpeg'
    };
}

onMounted(handleOnMounted);

onShow(handleOnShow);

onUnload(handleOnUnload);

onShareTimeline(handleOnShareTimeline);

onShareAppMessage(handleOnShareAppMessage);
</script>

<style lang="scss" scoped>
// 大师级设计变量
$primary-color: #cc3d35;
$primary-light: #FF9A8B;
$primary-dark: #E55A4A;
$success-color: #52C41A;
$warning-color: #FFA940;
$danger-color: #FF4D4F;
$text-primary: #1A1A1A;
$text-secondary: #595959;
$text-tertiary: #8C8C8C;
$border-light: #F0F0F0;
$border-base: #E8E8E8;
$bg-light: #FAFAFA;
$bg-white: #FFFFFF;
$shadow-light: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
$shadow-medium: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
$shadow-heavy: 0 16rpx 48rpx rgba(0, 0, 0, 0.12);

// 主容器
.electronic-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%);
  display: flex;
  flex-direction: column;
}

// 顶部导航栏
.header-bar {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20rpx);
  border-bottom: 2rpx solid $border-light;
  padding: 32rpx 40rpx;
  padding-top: calc(32rpx + env(safe-area-inset-top));
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  
  .header-title {
    display: flex;
    align-items: center;
    gap: 16rpx;
    
    .title-text {
      font-size: 36rpx;
      font-weight: 700;
      color: $text-primary;
      letter-spacing: -0.3rpx;
    }
  }
  
  .header-actions {
    .stats-info {
      .stats-text {
        font-size: 24rpx;
        color: $primary-color;
        font-weight: 600;
        padding: 8rpx 16rpx;
        background: rgba(247, 114, 97, 0.1);
        border-radius: 16rpx;
      }
    }
  }
}

// 内容滚动区域
.content-scroll {
  flex: 1;
  padding: 32rpx 40rpx 200rpx;
  box-sizing: border-box;
}

// 统计信息卡片
.stats-card {
  background: $bg-white;
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
  box-shadow: $shadow-light;
  border: 2rpx solid $border-light;
  
  .stats-grid {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .stats-item {
      flex: 1;
      text-align: center;
      
      .stats-value {
        font-size: 32rpx;
        font-weight: 700;
        color: $primary-color;
        margin-bottom: 8rpx;
      }
      
      .stats-label {
        font-size: 24rpx;
        color: $text-tertiary;
      }
    }
    
    .stats-divider {
      width: 2rpx;
      height: 48rpx;
      background: $border-light;
    }
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
  
  .empty-icon {
    margin-bottom: 32rpx;
  }
  
  .empty-title {
    font-size: 36rpx;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 16rpx;
  }
  
  .empty-desc {
    font-size: 28rpx;
    color: $text-secondary;
    margin-bottom: 48rpx;
    text-align: center;
    line-height: 1.5;
  }
  
  .empty-actions {
    ::v-deep .u-button {
      width: 280rpx;
      height: 88rpx;
      border-radius: 44rpx;
      font-size: 32rpx;
      font-weight: 700;
    }
  }
}

// 照片列表
.photo-list {
  .photo-item {
    background: $bg-white;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 24rpx;
    box-shadow: $shadow-light;
    border: 2rpx solid $border-light;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:active {
      transform: translateY(4rpx);
      box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
    }
    
    .photo-preview {
      position: relative;
      width: 100%;
      height: 400rpx;
      background: $bg-light;
      border-radius: 16rpx;
      overflow: hidden;
      margin-bottom: 24rpx;
      
      .photo-image {
        width: 100%;
        height: 100%;
        border-radius: 16rpx;
      }
      
      .photo-overlay {
        position: absolute;
        top: 16rpx;
        right: 16rpx;
        background: rgba(255, 77, 79, 0.9);
        backdrop-filter: blur(10rpx);
        border-radius: 12rpx;
        padding: 6rpx 12rpx;
        
        .expire-badge {
          font-size: 20rpx;
          color: $bg-white;
          font-weight: 600;
        }
      }
    }
    
    .photo-info {
      .photo-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20rpx;
        
        .photo-name {
          font-size: 32rpx;
          font-weight: 600;
          color: $text-primary;
          flex: 1;
        }
        
        .photo-actions {
          display: flex;
          gap: 16rpx;
          
          .action-btn {
            width: 56rpx;
            height: 56rpx;
            background: $bg-light;
            border-radius: 28rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            
            &:active {
              transform: scale(0.9);
              background: $border-light;
            }
            
            &.delete {
              background: rgba(255, 77, 79, 0.1);
              
              &:active {
                background: rgba(255, 77, 79, 0.2);
              }
            }
          }
        }
      }
      
      .photo-details {
        .detail-item {
          display: flex;
          align-items: center;
          margin-bottom: 12rpx;
          
          .detail-label {
            font-size: 24rpx;
            color: $text-tertiary;
            width: 80rpx;
            flex-shrink: 0;
          }
          
          .detail-value {
            font-size: 24rpx;
            color: $text-secondary;
            margin-left: 16rpx;
            
            &.expire {
              color: $text-tertiary;
              
              &.expiring {
                color: $danger-color;
                font-weight: 600;
              }
            }
          }
          
          .color-preview {
            width: 24rpx;
            height: 24rpx;
            border-radius: 12rpx;
            margin-left: 8rpx;
            border: 2rpx solid $border-light;
          }
        }
      }
    }
  }
}

// 底部占位区域
.bottom-spacer {
  height: 200rpx;
}

// 底部操作栏
.bottom-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20rpx);
  border-top: 2rpx solid $border-light;
  padding: 32rpx 40rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.08);
  z-index: 100;
  
  .action-container {
    display: flex;
    gap: 24rpx;
    
    ::v-deep .u-button {
      flex: 1;
      height: 96rpx;
      border-radius: 48rpx;
      font-size: 32rpx;
      font-weight: 700;
      letter-spacing: 0.5rpx;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      &:active {
        transform: translateY(2rpx);
      }
    }
  }
}

// 原生分享按钮 - 使用open-type="share"直接触发
.native-share-button {
  position: fixed;
  right: 40rpx;
  top: 70%;
  transform: translateY(-50%);
  z-index: 999;
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #cc3d35 0%, #FF9A8B 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(247, 114, 97, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: pulse 2s infinite;
  
  &:active {
    transform: scale(0.9);
    box-shadow: 0 4rpx 12rpx rgba(247, 114, 97, 0.3);
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 8rpx 24rpx rgba(247, 114, 97, 0.4);
  }
  50% {
    box-shadow: 0 8rpx 24rpx rgba(247, 114, 97, 0.6), 0 0 0 10rpx rgba(247, 114, 97, 0.1);
  }
  100% {
    box-shadow: 0 8rpx 24rpx rgba(247, 114, 97, 0.4);
  }
}

// 动画效果
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stats-card,
.photo-item {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.photo-item {
  animation-delay: 0.1s;
}

.stats-card { animation-delay: 0.2s; }

@import '@/assets/design-tokens.scss';
.electronic-page { background: $page; color: $ink; }
.header-bar { background: transparent; border: 0; padding: 32rpx 32rpx 8rpx; position: static; }
.header-bar .header-title .title-text { color: $ink; font-size: 40rpx; }
.header-bar .header-actions .stats-info .stats-text { background: $blue-soft; color: $blue; }
.content-scroll { padding: 24rpx 32rpx 150rpx; }
.stats-card, .photo-list .photo-item { @include card; border: 0; padding: 28rpx; }
.stats-card .stats-grid .stats-item .stats-value { color: $blue; }
.empty-state { @include card; margin-top: 24rpx; padding: 80rpx 32rpx; }
.empty-state .empty-icon { width: 152rpx; height: 152rpx; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; background: $blue-soft; }
.empty-state .empty-title { color: $ink; font-size: 32rpx; }
.empty-state .empty-desc { color: $muted; font-size: 26rpx; }
.empty-state .empty-actions ::v-deep .u-button, .bottom-action-bar .action-container ::v-deep .u-button { border-radius: 20rpx; font-size: 30rpx; font-weight: 600; letter-spacing: 0; }
.bottom-action-bar { border-top: 1rpx solid $border; box-shadow: 0 -4rpx 20rpx rgba(36,39,45,.04); padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); }
.stats-card, .photo-item { animation: none; }
</style>
