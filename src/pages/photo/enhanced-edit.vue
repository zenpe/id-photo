<template>
  <view class="photo-edit">
    <!-- 顶部导航 -->
    <view class="navbar">
      <u-icon name="arrow-left" size="24" @click="goBack" />
      <text class="navbar-title">编辑证件照</text>
      <view class="navbar-actions">
        <u-icon name="more-dot-fill" size="20" @click="showMoreActions" />
      </view>
    </view>

    <!-- 预览区域 -->
    <view class="preview-section">
      <view class="preview-container">
        <view 
          class="photo-preview" 
          :style="{ 
            'height': imageHeight, 
            'width': imageWidth, 
            'backgroundColor': currentBackgroundColor 
          }"
        >
          <u-image 
            class="preview-image" 
            :src="currentImage" 
            mode="aspectFit" 
            :width="imageWidth"
            :height="imageHeight" 
          />
        </view>
        
        <!-- 对比模式 -->
        <view v-if="showCompare" class="compare-container">
          <view class="compare-item">
            <text class="compare-label">原图</text>
            <u-image :src="originalImage" width="100%" height="200rpx" mode="aspectFit" />
          </view>
          <view class="compare-item">
            <text class="compare-label">效果图</text>
            <u-image :src="currentImage" width="100%" height="200rpx" mode="aspectFit" />
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑工具栏 -->
    <view class="tools-section">
      <!-- 背景色选择 -->
      <view class="tool-group">
        <view class="tool-header">
          <text class="tool-title">背景颜色</text>
          <u-icon 
            :name="showColorPicker ? 'arrow-up' : 'arrow-down'" 
            size="16" 
            @click="showColorPicker = !showColorPicker"
          />
        </view>
        <view v-show="showColorPicker" class="color-picker">
          <view 
            class="color-item" 
            v-for="color in colors" 
            :key="color"
            :class="{ 'color-active': currentBackgroundColor === color }"
            :style="{ backgroundColor: color }"
            @click="changeBackgroundColor(color)"
          ></view>
          <view class="color-item custom-color" @click="showCustomColorDialog">
            <u-icon name="plus" size="16" color="#999" />
          </view>
        </view>
      </view>

      <!-- 图片质量 -->
      <view class="tool-group">
        <view class="tool-header">
          <text class="tool-title">图片质量</text>
        </view>
        <view class="quality-selector">
          <view 
            class="quality-item"
            :class="{ 'quality-active': !isHd }"
            @click="toggleQuality(false)"
          >
            <text class="quality-text">标准</text>
            <text class="quality-desc">快速生成</text>
          </view>
          <view 
            class="quality-item"
            :class="{ 'quality-active': isHd }"
            @click="toggleQuality(true)"
          >
            <text class="quality-text">高清</text>
            <text class="quality-desc">品质更佳</text>
          </view>
        </view>
      </view>

      <!-- 图像增强 -->
      <view class="tool-group">
        <view class="tool-header">
          <text class="tool-title">图像增强</text>
          <u-icon 
            :name="showEnhancement ? 'arrow-up' : 'arrow-down'" 
            size="16" 
            @click="showEnhancement = !showEnhancement"
          />
        </view>
        <view v-show="showEnhancement" class="enhancement-controls">
          <view class="slider-control">
            <text class="slider-label">亮度</text>
            <u-slider 
              v-model="enhancementParams.brightness_strength"
              :min="-50"
              :max="50"
              :step="1"
              @change="onEnhancementChange"
            />
            <text class="slider-value">{{ enhancementParams.brightness_strength }}</text>
          </view>
          <view class="slider-control">
            <text class="slider-label">对比度</text>
            <u-slider 
              v-model="enhancementParams.contrast_strength"
              :min="-50"
              :max="50"
              :step="1"
              @change="onEnhancementChange"
            />
            <text class="slider-value">{{ enhancementParams.contrast_strength }}</text>
          </view>
          <view class="slider-control">
            <text class="slider-label">锐度</text>
            <u-slider 
              v-model="enhancementParams.sharpen_strength"
              :min="0"
              :max="100"
              :step="1"
              @change="onEnhancementChange"
            />
            <text class="slider-value">{{ enhancementParams.sharpen_strength }}</text>
          </view>
          <view class="slider-control">
            <text class="slider-label">饱和度</text>
            <u-slider 
              v-model="enhancementParams.saturation_strength"
              :min="-50"
              :max="50"
              :step="1"
              @change="onEnhancementChange"
            />
            <text class="slider-value">{{ enhancementParams.saturation_strength }}</text>
          </view>
          <view class="enhancement-actions">
            <u-button size="mini" type="info" plain @click="resetEnhancement">重置</u-button>
            <u-button size="mini" color="#cc3d35" @click="applyEnhancement">应用</u-button>
          </view>
        </view>
      </view>

      <!-- 水印设置 -->
      <view class="tool-group">
        <view class="tool-header">
          <text class="tool-title">水印设置</text>
          <u-switch v-model="watermarkEnabled" @change="onWatermarkToggle" />
        </view>
        <view v-show="watermarkEnabled" class="watermark-controls">
          <u-form-item label="水印文字">
            <u-input v-model="watermarkParams.text" placeholder="请输入水印文字" />
          </u-form-item>
          <view class="slider-control">
            <text class="slider-label">大小</text>
            <u-slider 
              v-model="watermarkParams.size"
              :min="10"
              :max="50"
              :step="1"
            />
            <text class="slider-value">{{ watermarkParams.size }}</text>
          </view>
          <view class="slider-control">
            <text class="slider-label">透明度</text>
            <u-slider 
              v-model="watermarkParams.opacity"
              :min="0"
              :max="100"
              :step="1"
            />
            <text class="slider-value">{{ watermarkParams.opacity }}%</text>
          </view>
        </view>
      </view>

      <!-- 更多操作 -->
      <view class="tool-group">
        <view class="tool-header">
          <text class="tool-title">更多操作</text>
        </view>
        <view class="action-buttons">
          <u-button size="mini" type="info" plain @click="toggleCompare">
            {{ showCompare ? '隐藏对比' : '显示对比' }}
          </u-button>
          <u-button size="mini" type="info" plain @click="cropPhoto">自动裁剪</u-button>
          <u-button size="mini" type="info" plain @click="adjustSize">调整大小</u-button>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view class="action-left">
        <u-button 
          type="info" 
          plain 
          :custom-style="{ width: '200rpx', borderRadius: '20rpx' }"
          @click="generateLayoutPhoto"
        >
          保存排版照
        </u-button>
      </view>
      <view class="action-right">
        <u-button 
          color="#cc3d35"
          :custom-style="{ width: '200rpx', borderRadius: '20rpx' }"
          @click="saveCurrentPhoto"
          :loading="saving"
        >
          保存证件照
        </u-button>
      </view>
    </view>

    <!-- 更多操作菜单 -->
    <u-action-sheet 
      :show="showActions" 
      :actions="actionList" 
      @close="showActions = false"
      @select="onActionSelect"
    />

    <!-- 自定义颜色弹窗 -->
    <u-popup :show="showCustomColor" mode="center" round="20" @close="showCustomColor = false">
      <view class="color-dialog">
        <view class="dialog-header">
          <text class="dialog-title">选择颜色</text>
          <u-icon name="close" size="20" @click="showCustomColor = false" />
        </view>
        <view class="color-input">
          <u-input v-model="customColorValue" placeholder="输入颜色代码，如：#FF0000" />
        </view>
        <view class="dialog-actions">
          <u-button type="info" plain @click="showCustomColor = false">取消</u-button>
          <u-button color="#cc3d35" @click="applyCustomColor">确定</u-button>
        </view>
      </view>
    </u-popup>

    <!-- 调整大小弹窗 -->
    <u-popup :show="showSizeAdjust" mode="center" round="20" @close="showSizeAdjust = false">
      <view class="size-dialog">
        <view class="dialog-header">
          <text class="dialog-title">调整文件大小</text>
          <u-icon name="close" size="20" @click="showSizeAdjust = false" />
        </view>
        <view class="size-input">
          <u-input 
            v-model="targetKb" 
            type="number" 
            placeholder="输入目标文件大小(KB)"
          />
        </view>
        <view class="dialog-actions">
          <u-button type="info" plain @click="showSizeAdjust = false">取消</u-button>
          <u-button color="#cc3d35" @click="applySizeAdjust">确定</u-button>
        </view>
      </view>
    </u-popup>
    
    <LoadingOverlay :show="loadingMessages.length > 0" :text="loadingMessages[loadingMessages.length - 1] || '正在处理'" />

    <!-- 原生分享按钮 - 使用open-type="share"直接触发分享 -->
    <button v-show="false" open-type="share" class="native-share-button" @getuserinfo="onShareSuccess">
      <u-icon name="share" size="20" color="white" />
    </button>
  </view>
</template>

<script setup lang="ts">
import { AddBackgroudColor, GenerateLayoutPhoto } from '@/api/photo'
import { AddWatermark, SetKb, IdphotoCrop, ImageEnhancementParams, WatermarkParams } from '@/api/photo-enhanced'
import { Colors } from '@/model/Colors'
import { PhotoSize } from '@/model/PhotoSize';

import StorageManager from '@/utils/storage';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import { productConfig } from '@/config';
import { usePhotoStore } from '@/store/modules/photo';
import { ref, computed, watch } from 'vue';
import { onLoad, onShareTimeline, onShareAppMessage } from '@dcloudio/uni-app';

const photoStore = usePhotoStore();

const photoSize = computed(() => photoStore.photoConfig);

const photoPath = computed(() => photoStore.photoPath);

const setPhotoPath = photoStore.setPhotoPath;

const colors = ref({ ...Colors });

const currentBackgroundColor = ref<string>(Colors[0]);

const isHd = ref<boolean>(true);

const currentImage = ref<string>('');

const originalImage = ref<string>('');

const showColorPicker = ref<boolean>(true);

const showEnhancement = ref<boolean>(false);

const showCompare = ref<boolean>(false);

const watermarkEnabled = ref<boolean>(false);

const showActions = ref<boolean>(false);

const showCustomColor = ref<boolean>(false);

const showSizeAdjust = ref<boolean>(false);

const saving = ref<boolean>(false);

const loadingMessages = ref<string[]>([]);

function startProcessing(text: string) {
    loadingMessages.value.push(text);
}

function finishProcessing() {
    loadingMessages.value.pop();
}

const enhancementParams = ref<ImageEnhancementParams>({
    brightness_strength: 0,
    contrast_strength: 0,
    sharpen_strength: 0,
    saturation_strength: 0
});

const watermarkParams = ref<WatermarkParams>({
    text: '证件照',
    size: 20,
    opacity: 50,
    angle: 30,
    color: '#000000',
    space: 25
});

const customColorValue = ref<string>('');

const targetKb = ref<string>('');

const actionList = ref([
    {
        name: '保存到历史记录',
        id: 'save_history'
    },
    {
        name: '分享图片',
        id: 'share'
    },
    {
        name: '重新制作',
        id: 'remake'
    }
]);

const standard_width = ref(700);

function handleOnLoad(options: any) {
    initFromOptions(options);
}

function onPhotoPathChange() {
    if (photoPath.value) {
        currentImage.value = isHd.value ? photoPath.value.base64HD : photoPath.value.base64;
        originalImage.value = photoPath.value.base64;
    }
}

function initFromOptions(options: any) {
    if (options.history) {
        // 从历史记录恢复
        const history = JSON.parse(decodeURIComponent(options.history));
        currentBackgroundColor.value = history.parameters.backgroundColor;
        isHd.value = history.parameters.isHd;
        if (history.parameters.enhancement) {
            enhancementParams.value = { ...history.parameters.enhancement };
        }
        if (history.parameters.watermark) {
            watermarkParams.value = { ...history.parameters.watermark };
            watermarkEnabled.value = true;
        }
    }
}

const imageHeight = computed(() => {
    const { pxHeight, pxWidth } = photoSize.value;
    if (Number(pxHeight) > Number(pxWidth)) {
        return standard_width.value + 'rpx';
    }
    else {
        return (standard_width.value / pxWidth * pxHeight) + 'rpx';
    }
});

const imageWidth = computed(() => {
    const { pxHeight, pxWidth } = photoSize.value;
    if (Number(pxWidth) > Number(pxHeight)) {
        return standard_width.value + 'rpx';
    }
    else {
        return (standard_width.value / pxHeight * pxWidth) + 'rpx';
    }
});

function goBack() {
    uni.navigateBack();
}

function showMoreActions() {
    showActions.value = true;
}

function onActionSelect(action: any) {
    switch (action.id) {
        case 'save_history':
            saveToHistory();
            break;
        case 'share':
            shareImage();
            break;
        case 'remake':
            remakePhoto();
            break;
    }
    showActions.value = false;
}

function changeBackgroundColor(color: string) {
    currentBackgroundColor.value = color;
    applyBackgroundColor();
}

async function applyBackgroundColor() {
    try {
        startProcessing('正在处理照片');
        const targetImage = isHd.value ? photoPath.value.base64HDPath : photoPath.value.base64Path;
        const form = {
            color: currentBackgroundColor.value.replace('#', ''),
            dpi: 300
        };
        const res = await AddBackgroudColor(form, 'input_image', targetImage);
        const colorBase64 = res['image_base64'];
        if (colorBase64) {
            currentImage.value = 'data:image/png;base64,' + colorBase64;
        }
    }
    catch (error) {
        uni.showToast({ title: '处理失败', icon: 'none' });
    }
    finally {
        finishProcessing();
    }
}

function toggleQuality(hd: boolean) {
    isHd.value = hd;
    currentImage.value = hd ? photoPath.value.base64HD : photoPath.value.base64;
}

function onEnhancementChange() {
    // 实时预览增强效果（可选）
}

async function applyEnhancement() {
    try {
        startProcessing('正在调整照片');
        // 调用完整的图像处理流程，包含增强参数
        await regenerateWithEnhancement();
        uni.showToast({ title: '增强成功', icon: 'success' });
    }
    catch (error) {
        uni.showToast({ title: '增强失败', icon: 'none' });
    }
    finally {
        finishProcessing();
    }
}

async function regenerateWithEnhancement() {
    // 构建包含增强参数的处理参数
    const form = {
        height: photoSize.value.pxHeight,
        width: photoSize.value.pxWidth,
        hd: isHd.value,
        dpi: 300,
        // 添加增强参数
        brightness_strength: enhancementParams.value.brightness_strength,
        contrast_strength: enhancementParams.value.contrast_strength,
        sharpen_strength: enhancementParams.value.sharpen_strength,
        saturation_strength: enhancementParams.value.saturation_strength
    };
    // 先应用背景色
    await applyBackgroundColor();
    // 如果有水印，再应用水印
    if (watermarkEnabled.value) {
        await applyWatermark();
    }
}

function resetEnhancement() {
    enhancementParams.value = {
        brightness_strength: 0,
        contrast_strength: 0,
        sharpen_strength: 0,
        saturation_strength: 0
    };
}

function onWatermarkToggle(enabled: boolean) {
    if (enabled) {
        applyWatermark();
    }
    else {
        currentImage.value = isHd.value ? photoPath.value.base64HD : photoPath.value.base64;
    }
}

async function applyWatermark() {
    try {
        startProcessing('正在添加水印');
        const form = { ...watermarkParams.value };
        const targetImage = currentImage.value;
        const res = await AddWatermark(form, 'input_image', targetImage);
        const watermarkBase64 = res['image_base64'];
        if (watermarkBase64) {
            currentImage.value = 'data:image/png;base64,' + watermarkBase64;
        }
    }
    catch (error) {
        uni.showToast({ title: '水印添加失败', icon: 'none' });
    }
    finally {
        finishProcessing();
    }
}

function toggleCompare() {
    showCompare.value = !showCompare.value;
}

async function cropPhoto() {
    try {
        startProcessing('正在裁剪照片');
        const form = {
            height: photoSize.value.pxHeight,
            width: photoSize.value.pxWidth,
            hd: isHd.value,
            dpi: 300
        };
        const targetImage = isHd.value ? photoPath.value.base64HDPath : photoPath.value.base64Path;
        const res = await IdphotoCrop(form, 'input_image', targetImage);
        const cropBase64 = res['image_base64'];
        if (cropBase64) {
            currentImage.value = 'data:image/png;base64,' + cropBase64;
            uni.showToast({ title: '裁剪成功', icon: 'success' });
        }
    }
    catch (error) {
        uni.showToast({ title: '裁剪失败', icon: 'none' });
    }
    finally {
        finishProcessing();
    }
}

function adjustSize() {
    showSizeAdjust.value = true;
}

async function applySizeAdjust() {
    if (!targetKb.value) {
        uni.showToast({ title: '请输入文件大小', icon: 'none' });
        return;
    }
    try {
        startProcessing('正在调整大小');
        const form = {
            kb: parseInt(targetKb.value),
            dpi: 300
        };
        const targetImage = currentImage.value;
        const res = await SetKb(form, 'input_image', targetImage);
        const kbBase64 = res['image_base64'];
        if (kbBase64) {
            currentImage.value = 'data:image/png;base64,' + kbBase64;
            uni.showToast({ title: '调整成功', icon: 'success' });
            showSizeAdjust.value = false;
        }
    }
    catch (error) {
        uni.showToast({ title: '调整失败', icon: 'none' });
    }
    finally {
        finishProcessing();
    }
}

function showCustomColorDialog() {
    showCustomColor.value = true;
}

function applyCustomColor() {
    if (customColorValue.value) {
        changeBackgroundColor(customColorValue.value);
        showCustomColor.value = false;
    }
}

async function saveCurrentPhoto() {
    saving.value = true;
    try {
        const tempPath = await saveImageToLocal(currentImage.value);
        await saveToAlbum(tempPath);
        // 保存到历史记录
        await saveToHistory();
        uni.showToast({ title: '保存成功', icon: 'success' });
    }
    catch (error) {
        uni.showToast({ title: '保存失败', icon: 'none' });
    }
    finally {
        saving.value = false;
    }
}

async function generateLayoutPhoto() {
    try {
        startProcessing('正在生成排版照');
        const form = {
            height: photoSize.value.pxHeight,
            width: photoSize.value.pxWidth
        };
        // 先生成带背景色的图片
        await applyBackgroundColor();
        const res = await GenerateLayoutPhoto(form, 'input_image', currentImage.value);
        const layoutBase64 = res['image_base64'];
        if (layoutBase64) {
            const tempPath = await saveImageToLocal('data:image/png;base64,' + layoutBase64);
            await saveToAlbum(tempPath);
            uni.showToast({ title: '排版照保存成功', icon: 'success' });
        }
    }
    catch (error) {
        uni.showToast({ title: '生成失败', icon: 'none' });
    }
    finally {
        finishProcessing();
    }
}

async function saveImageToLocal(base64: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const tempPath = `${wx.env.USER_DATA_PATH}/photo_${Date.now()}.png`;
        const fs = uni.getFileSystemManager();
        fs.writeFile({
            filePath: tempPath,
            data: base64.replace('data:image/png;base64,', ''),
            encoding: 'base64',
            success: () => resolve(tempPath),
            fail: reject
        });
    });
}

async function saveToAlbum(tempPath: string) {
    return new Promise((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
            filePath: tempPath,
            success: resolve,
            fail: reject
        });
    });
}

async function saveToHistory() {
    const record = {
        originalImage: originalImage.value,
        resultImages: {
            idPhoto: currentImage.value
        },
        parameters: {
            size: photoSize.value,
            backgroundColor: currentBackgroundColor.value,
            isHd: isHd.value,
            enhancement: enhancementParams.value,
            watermark: watermarkEnabled.value ? watermarkParams.value : undefined
        }
    };
    StorageManager.savePhotoRecord(record);
}

function shareImage() {
    uni.share({
        provider: 'weixin',
        scene: 'WXSceneSession',
        type: 0,
        imageUrl: currentImage.value,
        success: () => {
            uni.showToast({ title: '分享成功', icon: 'success' });
        },
        fail: () => {
            uni.showToast({ title: '分享失败', icon: 'none' });
        }
    });
}

function remakePhoto() {
    uni.navigateBack();
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

watch(photoPath, onPhotoPathChange, { immediate: true });

onLoad(handleOnLoad);

onShareTimeline(handleOnShareTimeline);

onShareAppMessage(handleOnShareAppMessage);
</script>

<style lang="scss" scoped>
.photo-edit {
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
}

.preview-section {
  padding: 40rpx;
  background: white;
  margin-bottom: 20rpx;
  
  .preview-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .photo-preview {
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 12rpx;
      overflow: hidden;
      margin-bottom: 30rpx;
      box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
    }
    
    .compare-container {
      width: 100%;
      display: flex;
      gap: 20rpx;
      
      .compare-item {
        flex: 1;
        
        .compare-label {
          display: block;
          text-align: center;
          font-size: 24rpx;
          color: #666;
          margin-bottom: 10rpx;
        }
      }
    }
  }
}

.tools-section {
  padding: 0 40rpx;
}

.tool-group {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .tool-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
    
    .tool-title {
      font-size: 28rpx;
      font-weight: bold;
      color: #333;
    }
  }
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  
  .color-item {
    width: 60rpx;
    height: 60rpx;
    border-radius: 12rpx;
    border: 2rpx solid #e9ecef;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &.color-active {
      border-color: #cc3d35;
      transform: scale(1.1);
    }
    
    &.custom-color {
      border-style: dashed;
      background: #f8f9fa;
    }
  }
}

.quality-selector {
  display: flex;
  gap: 20rpx;
  
  .quality-item {
    flex: 1;
    padding: 30rpx 20rpx;
    border-radius: 12rpx;
    border: 2rpx solid #e9ecef;
    text-align: center;
    transition: all 0.3s ease;
    
    &.quality-active {
      border-color: #cc3d35;
      background: rgba(247, 114, 97, 0.1);
    }
    
    .quality-text {
      display: block;
      font-size: 28rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 8rpx;
    }
    
    .quality-desc {
      font-size: 22rpx;
      color: #666;
    }
  }
}

.enhancement-controls {
  .slider-control {
    display: flex;
    align-items: center;
    margin-bottom: 30rpx;
    
    .slider-label {
      width: 120rpx;
      font-size: 26rpx;
      color: #333;
    }
    
    .slider-value {
      width: 80rpx;
      text-align: center;
      font-size: 24rpx;
      color: #666;
    }
  }
  
  .enhancement-actions {
    display: flex;
    gap: 20rpx;
    justify-content: center;
  }
}

.watermark-controls {
  .u-form-item {
    margin-bottom: 20rpx;
  }
  
  .slider-control {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    
    .slider-label {
      width: 120rpx;
      font-size: 26rpx;
      color: #333;
    }
    
    .slider-value {
      width: 80rpx;
      text-align: center;
      font-size: 24rpx;
      color: #666;
    }
  }
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 30rpx 40rpx;
  background: white;
  border-top: 1rpx solid #e9ecef;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.1);
}

// 弹窗样式
.color-dialog, .size-dialog {
  width: 500rpx;
  padding: 40rpx;
  background: white;
  border-radius: 20rpx;
  
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 30rpx;
    
    .dialog-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
  
  .color-input, .size-input {
    margin-bottom: 30rpx;
  }
  
  .dialog-actions {
    display: flex;
    gap: 20rpx;
    justify-content: center;
  }
}

@import '@/assets/design-tokens.scss';
.photo-edit { background: $page; padding-bottom: calc(150rpx + env(safe-area-inset-bottom)); }
.navbar { display: none; }
.preview-section { margin: 24rpx 32rpx 20rpx; border-radius: 24rpx; }
.tools-section { padding: 0 32rpx; }
.tool-group { @include card; padding: 28rpx; }
.quality-selector .quality-item.quality-active { border-color: $brand; background: $brand-soft; }
.bottom-actions { padding: 18rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); border-color: $border; box-shadow: 0 -4rpx 20rpx rgba(36,39,45,.04); }
</style>
