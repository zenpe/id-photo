<template>
  <view class="history-page">
    <!-- 历史记录列表 -->
    <view class="history-content">
      <InlineState v-if="historyList.length === 0" title="暂无历史记录" description="开始制作您的第一张证件照吧" action-text="开始制作" icon="clock" @action="goToCreate" />

      <view v-else class="history-list">
        <view 
          class="history-item" 
          v-for="(item, index) in historyList" 
          :key="item.id"
          @click="viewHistory(item)"
        >
          <view class="item-image">
            <u-image 
              :src="item.resultImages.idPhoto" 
              width="120rpx" 
              height="160rpx" 
              radius="8rpx"
              mode="aspectFill"
            />
          </view>
          <view class="item-info">
            <view class="item-header">
              <text class="item-title">{{ item.parameters.size.name || '自定义尺寸' }}</text>
              <text class="item-time">{{ formatTime(item.timestamp) }}</text>
            </view>
            <view class="item-details">
              <text class="item-size">{{ item.parameters.size.pxWidth }}×{{ item.parameters.size.pxHeight }}px</text>
              <view class="item-tags">
                <u-tag 
                  v-if="item.parameters.isHd" 
                  text="高清" 
                  type="primary" 
                  size="mini"
                />
                <u-tag 
                  :text="item.parameters.backgroundColor" 
                  type="warning" 
                  size="mini"
                />
              </view>
            </view>
          </view>
          <view class="item-actions">
            <u-icon name="more-dot-fill" size="20" @click.stop="showActionSheet(item)" />
          </view>
        </view>
      </view>
    </view>

    <!-- 操作菜单 -->
    <u-action-sheet 
      :show="showActions" 
      :actions="actionList" 
      @close="showActions = false"
      @select="onActionSelect"
    />

    <!-- 清空确认弹窗 -->
    <u-modal 
      :show="showClearModal" 
      title="确认清空"
      content="确定要清空所有历史记录吗？此操作不可恢复。"
      @cancel="showClearModal = false"
      @confirm="clearAllHistory"
    />
  </view>
</template>

<script setup lang="ts">
import StorageManager, { PhotoRecord } from '@/utils/storage';
import { writeTemporaryImage, removeTemporaryImage } from '@/utils/image-file';
import InlineState from '@/components/InlineState.vue';
// 声明微信小程序类型
declare const wx: any;
import { productConfig } from '@/config';
import { usePhotoStore } from '@/store/modules/photo';
import { ref } from 'vue';
import { onLoad, onShow, onUnload, onShareTimeline, onShareAppMessage } from '@dcloudio/uni-app';

const photoStore = usePhotoStore();

const historyList = ref<PhotoRecord[]>([]);

const showActions = ref<boolean>(false);

const showClearModal = ref<boolean>(false);

const selectedItem = ref<PhotoRecord | null>(null);

const previewFiles = ref<string[]>([]);

const actionList = ref([
    {
        name: '查看详情',
        id: 'view'
    },
    {
        name: '按此规格重新制作',
        id: 'edit'
    },
    {
        name: '删除',
        id: 'delete',
        color: '#f56c6c'
    }
]);

function handleOnLoad() {
    loadHistory();
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
    loadHistory();
}

function loadHistory() {
    historyList.value = StorageManager.getPhotoHistory();
}

function goBack() {
    uni.navigateBack();
}

function goToCreate() {
    uni.switchTab({
        url: '/pages/index/index'
    });
}

async function viewHistory(item: PhotoRecord) {
    try {
        let path = item.resultImages && item.resultImages.idPhoto;
        if (!path)
            throw new Error('照片已失效，请重新制作');
        if (path.startsWith('data:image/')) {
            path = await writeTemporaryImage(path, 'history');
            previewFiles.value.push(path);
        }
        uni.previewImage({ current: path, urls: [path], fail: () => uni.showToast({ title: '照片已失效，请重新制作', icon: 'none' }) });
    }
    catch (error: any) {
        uni.showToast({ title: error.message || '照片无法预览', icon: 'none' });
    }
}

function handleOnUnload() {
    previewFiles.value.forEach(removeTemporaryImage);
    previewFiles.value = [];
}

function clearAllHistory() {
    StorageManager.clearPhotoHistory();
    historyList.value = [];
    showClearModal.value = false;
    uni.showToast({
        title: '已清空历史记录',
        icon: 'success'
    });
}

function showActionSheet(item: PhotoRecord) {
    selectedItem.value = item;
    showActions.value = true;
}

function onActionSelect(action: any) {
    if (!selectedItem.value)
        return;
    switch (action.id) {
        case 'view':
            viewHistory(selectedItem.value);
            break;
        case 'edit':
            editHistory(selectedItem.value);
            break;
        case 'delete':
            deleteHistory(selectedItem.value);
            break;
    }
    showActions.value = false;
    selectedItem.value = null;
}

function editHistory(item: PhotoRecord) {
    const size = item.parameters && item.parameters.size;
    if (!size || !Number.isFinite(Number(size.pxWidth)) || !Number.isFinite(Number(size.pxHeight)) || Number(size.pxWidth) <= 0 || Number(size.pxHeight) <= 0) {
        uni.showToast({ title: '历史规格已失效，请重新选择', icon: 'none' });
        return;
    }
    photoStore.setPhotoSize(size);
    uni.navigateTo({ url: '/pages/photo/index' });
}

function deleteHistory(item: PhotoRecord) {
    uni.showModal({
        title: '确认删除',
        content: '确定要删除这条记录吗？',
        success: (res) => {
            if (res.confirm) {
                StorageManager.deletePhotoRecord(item.id);
                loadHistory();
                uni.showToast({
                    title: '删除成功',
                    icon: 'success'
                });
            }
        }
    });
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) { // 1分钟内
        return '刚刚';
    }
    else if (diff < 3600000) { // 1小时内
        return Math.floor(diff / 60000) + '分钟前';
    }
    else if (diff < 86400000) { // 1天内
        return Math.floor(diff / 3600000) + '小时前';
    }
    else if (diff < 604800000) { // 1周内
        return Math.floor(diff / 86400000) + '天前';
    }
    else {
        return date.toLocaleDateString();
    }
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

onLoad(handleOnLoad);

onShow(handleOnShow);

onUnload(handleOnUnload);

onShareTimeline(handleOnShareTimeline);

onShareAppMessage(handleOnShareAppMessage);
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 40rpx;
  background: white;
  border-bottom: 1rpx solid #e9ecef;
  
  .navbar-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }
  
  .clear-btn {
    font-size: 28rpx;
    color: #f56c6c;
  }
}

.history-content {
  padding: 20rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
  
  .empty-text {
    font-size: 32rpx;
    color: #333;
    margin: 40rpx 0 20rpx;
    font-weight: bold;
  }
  
  .empty-desc {
    font-size: 26rpx;
    color: #999;
    margin-bottom: 60rpx;
  }
}

.history-list {
  .history-item {
    display: flex;
    align-items: center;
    padding: 30rpx;
    margin-bottom: 20rpx;
    background: white;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    
    &:active {
      transform: scale(0.98);
      background: #f8f9fa;
    }
    
    .item-image {
      margin-right: 30rpx;
      border-radius: 8rpx;
      overflow: hidden;
    }
    
    .item-info {
      flex: 1;
      
      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12rpx;
        
        .item-title {
          font-size: 28rpx;
          font-weight: bold;
          color: #333;
        }
        
        .item-time {
          font-size: 22rpx;
          color: #999;
        }
      }
      
      .item-details {
        display: flex;
        align-items: center;
        gap: 20rpx;
        
        .item-size {
          font-size: 24rpx;
          color: #666;
        }
        
        .item-tags {
          display: flex;
          gap: 10rpx;
        }
      }
    }
    
    .item-actions {
      padding: 10rpx;
      color: #999;
    }
  }
}

@import '@/assets/design-tokens.scss';
.history-page { background: $page; color: $ink; }
.history-content { padding: 28rpx 32rpx calc(40rpx + env(safe-area-inset-bottom)); }
.empty-state { @include card; padding: 80rpx 32rpx; }
.empty-state .empty-text { color: $ink; font-size: 32rpx; }
.empty-state .empty-desc { color: $muted; }
.history-list .history-item { @include card; margin-bottom: 20rpx; }
.history-list .history-item .item-info { min-width: 0; }
.history-list .history-item .item-info .item-header { flex-wrap: wrap; gap: 8rpx; }
.history-list .history-item .item-info .item-details { flex-wrap: wrap; }
</style>
