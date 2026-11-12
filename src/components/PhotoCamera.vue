<template>
  <view class="camera-component">
    <view v-if="showCamera" class="camera-overlay" @click.stop>
      <camera v-if="!cameraError" class="camera-view" :device-position="cameraPosition" flash="off"
        @stop="onCameraStop" @error="onCameraError" @initdone="onCameraReady">
        <cover-view class="camera-top-bar">
          <cover-view class="camera-top-side"><cover-view class="camera-close" aria-role="button" aria-label="关闭相机" @click="closeCamera">×</cover-view></cover-view>
          <cover-view class="camera-title">{{ title }}</cover-view>
          <cover-view class="camera-guide-toggle" aria-role="button" :aria-label="guideEnabled ? '关闭辅助线' : '开启辅助线'" @click="toggleGuide">辅助线 {{ guideEnabled ? '开' : '关' }}</cover-view>
        </cover-view>

        <cover-view v-if="guideEnabled" class="camera-guide" aria-hidden="true">
          <cover-view class="guide-instruction">{{ cameraReady ? '将面部放入轮廓内' : '正在打开相机' }}</cover-view>
          <cover-view class="guide-frame">
            <cover-view class="guide-head-shadow"></cover-view>
            <cover-view class="guide-head"></cover-view>
            <cover-view class="guide-eye-shadow"></cover-view>
            <cover-view class="guide-eye-line"></cover-view>
            <cover-view class="guide-center-mark"></cover-view>
            <cover-view class="guide-shoulder guide-shoulder-left"></cover-view>
            <cover-view class="guide-shoulder guide-shoulder-right"></cover-view>
          </cover-view>
          <cover-view class="guide-caption">双眼对准横线 · 肩膀保持水平</cover-view>
        </cover-view>

        <cover-view class="camera-bottom-controls">
          <cover-view class="camera-side-button" aria-role="button" aria-label="从相册选择" @click="chooseFromAlbum">
            <cover-image class="camera-side-icon" src="/static/camera/album.png" /><cover-view class="camera-side-label">相册</cover-view>
          </cover-view>
          <cover-view class="camera-shutter" :class="{ 'camera-shutter-busy': !cameraReady || capturing }"
            aria-role="button" aria-label="拍摄照片" @click="capturePhoto"><cover-view class="camera-shutter-inner"></cover-view></cover-view>
          <cover-view class="camera-side-button" aria-role="button" aria-label="切换摄像头" @click="switchCamera">
            <cover-image class="camera-side-icon" src="/static/camera/switch.png" /><cover-view class="camera-side-label">翻转</cover-view>
          </cover-view>
        </cover-view>
      </camera>
      <view v-else class="camera-error">
        <view class="camera-error-close" aria-role="button" aria-label="关闭相机" @click="closeCamera"><u-icon name="close" size="23" color="#ffffff" /></view>
        <view class="camera-error-content">
          <view class="camera-error-icon"><u-icon name="camera" size="30" color="#ffffff" /></view>
          <view class="camera-error-title">相机暂时不可用</view>
          <view class="camera-error-message">{{ cameraError }}</view>
          <view class="camera-error-primary" @click="openCameraSettings">打开设置</view>
          <view class="camera-error-secondary" @click="retryCamera">重新打开相机</view>
          <view class="camera-error-album" @click="chooseFromAlbum">从相册选择</view>
        </view>
      </view>
    </view>

    <view v-if="showCapturePreview" class="full-screen-preview" @click.stop>
      <view class="preview-heading">
        <view class="preview-close" aria-role="button" aria-label="关闭照片预览" @click="closeCamera">×</view>
        <view class="preview-title">确认照片</view><view class="preview-subtitle">{{ previewTip }}</view>
      </view>
      <view class="preview-image-container"><image :src="capturedImagePath" mode="aspectFit" class="full-screen-image" /></view>
      <view class="preview-bottom-info">
        <view class="preview-tip"><u-icon name="info-circle" size="16" color="#c8cbd0" /><text>辅助线不会出现在照片中</text></view>
        <view class="preview-actions"><view class="preview-retake" @click="retakePhoto">重新拍摄</view><view class="preview-confirm" @click="confirmCapture">使用照片</view></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">

import { ref, type PropType, onBeforeUnmount } from 'vue';

const props = defineProps({
  title: { default: '拍摄照片' , type: String as PropType<string> },
  previewTip: { default: '检查照片清晰且内容完整' , type: String as PropType<string> },
  guideInitiallyEnabled: { default: true , type: Boolean as PropType<boolean> },
  initialPosition: { default: 'front' , type: String as PropType<'front' | 'back'> }
});

const emit = defineEmits(["close","select"]);

const showCamera = ref(true);

const cameraPosition = ref<'front' | 'back'>('front');

const cameraReady = ref(false);

const cameraError = ref('');

const capturing = ref(false);

const cameraSession = ref(0);

const capturedImagePath = ref('');

const showCapturePreview = ref(false);

const guideEnabled = ref(true);

const disposed = ref(false);

function created() {
    guideEnabled.value = props.guideInitiallyEnabled;
    cameraPosition.value = props.initialPosition === 'back' ? 'back' : 'front';
}

function handleOnBeforeUnmount() {
    disposed.value = true;
    cameraSession.value++;
}

function toggleGuide() {
    guideEnabled.value = !guideEnabled.value;
}

function openCamera() {
    cameraSession.value++;
    cameraReady.value = false;
    cameraError.value = '';
    capturing.value = false;
    showCamera.value = true;
}

function closeCamera() {
    cameraSession.value++;
    showCamera.value = false;
    showCapturePreview.value = false;
    cameraReady.value = false;
    capturing.value = false;
    emit('close');
}

function switchCamera() {
    if (capturing.value)
        return;
    cameraPosition.value = cameraPosition.value === 'front' ? 'back' : 'front';
}

function capturePhoto() {
    if (capturing.value || !showCamera.value || cameraError.value)
        return;
    if (!cameraReady.value) {
        uni.showToast({ title: '相机正在启动，请稍候', icon: 'none' });
        return;
    }
    capturing.value = true;
    const session = cameraSession.value;
    const fail = () => {
        if (disposed.value || session !== cameraSession.value || !showCamera.value)
            return;
        capturing.value = false;
        uni.showToast({ title: '拍照失败，请重试', icon: 'none' });
    };
    try {
        uni.createCameraContext().takePhoto({
            quality: 'high',
            success: (res) => {
                if (disposed.value || session !== cameraSession.value || !showCamera.value)
                    return;
                if (!res.tempImagePath) {
                    fail();
                    return;
                }
                capturing.value = false;
                capturedImagePath.value = res.tempImagePath;
                showCamera.value = false;
                cameraReady.value = false;
                showCapturePreview.value = true;
            },
            fail
        });
    }
    catch (_) {
        fail();
    }
}

function retakePhoto() {
    showCapturePreview.value = false;
    capturedImagePath.value = '';
    openCamera();
}

function confirmCapture() {
    if (!showCapturePreview.value)
        return;
    if (!capturedImagePath.value) {
        uni.showToast({ title: '请重新拍摄照片', icon: 'none' });
        return;
    }
    const path = capturedImagePath.value;
    cameraSession.value++;
    showCapturePreview.value = false;
    emit('select', path);
}

function onCameraReady() {
    if (showCamera.value && !cameraError.value)
        cameraReady.value = true;
}

function onCameraStop() {
    if (!showCamera.value || cameraError.value)
        return;
    cameraSession.value++;
    cameraReady.value = false;
    capturing.value = false;
    cameraError.value = '相机已中断，请重新打开或从相册选择照片。';
}

function onCameraError() {
    if (!showCamera.value)
        return;
    cameraSession.value++;
    cameraReady.value = false;
    capturing.value = false;
    cameraError.value = '请检查微信和手机的相机权限，或从相册选择照片。';
}

function retryCamera() {
    openCamera();
}

function openCameraSettings() {
    const session = cameraSession.value;
    uni.openSetting({
        success: (res: any) => {
            if (!disposed.value && session === cameraSession.value && res.authSetting && res.authSetting['scope.camera'])
                retryCamera();
        },
        fail: () => {
            if (!disposed.value && session === cameraSession.value)
                uni.showToast({ title: '无法打开设置，请在微信中检查相机权限', icon: 'none' });
        }
    });
}

function chooseFromAlbum() {
    if (capturing.value || !showCamera.value)
        return;
    cameraSession.value++;
    const session = cameraSession.value;
    showCamera.value = false;
    cameraReady.value = false;
    const select = (path: string) => {
        if (disposed.value || session !== cameraSession.value)
            return;
        if (!path) {
            openCamera();
            return;
        }
        cameraSession.value++;
        emit('select', path);
    };
    const cancel = () => { if (!disposed.value && session === cameraSession.value)
        openCamera(); };
    // #ifdef H5
    uni.chooseImage({ count: 1, sourceType: ['album'], success: res => select(res.tempFilePaths[0]), fail: cancel });
    // #endif
    // #ifdef MP-WEIXIN
    uni.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album'], success: res => select(res.tempFiles[0].tempFilePath), fail: cancel });
    // #endif
}

created();

onBeforeUnmount(handleOnBeforeUnmount);
</script>

<style lang="scss" scoped>
@import '@/assets/design-tokens.scss';
.camera-overlay, .full-screen-preview {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9999;
  background: #171b1e;
}
.camera-overlay { display: flex; }
.camera-view { position: relative; width: 100%; height: 100%; flex: 1; }
.camera-top-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 112rpx;
  padding: 16rpx 30rpx; box-sizing: border-box; display: flex;
  align-items: center; justify-content: space-between; background-color: rgba(16, 20, 23, .48);
}
.camera-top-side, .camera-guide-toggle { width: 150rpx; flex-shrink: 0; }
.camera-close { width: 80rpx; height: 80rpx; }
.camera-close { border-radius: 40rpx; background-color: rgba(255, 255, 255, .16); color: #fff; font-size: 55rpx; line-height: 75rpx; text-align: center; }
.camera-guide-toggle { height: 76rpx; border-radius: 38rpx; background-color: rgba(255, 255, 255, .16); color: #fff; font-size: 25rpx; line-height: 76rpx; text-align: center; }
.camera-title { flex: 1; color: #fff; font-size: 31rpx; font-weight: 600; text-align: center; }
.camera-guide { position: absolute; top: 16%; right: 0; bottom: 30%; left: 0; }
.guide-instruction, .guide-caption {
  position: absolute; left: 12%; right: 12%; height: 58rpx; line-height: 58rpx;
  border-radius: 29rpx; background-color: rgba(16, 20, 23, .56);
  color: #fff; text-align: center; font-size: 25rpx;
}
.guide-instruction { top: 0; font-weight: 600; }
.guide-caption { bottom: 0; font-size: 23rpx; }
.guide-frame { position: absolute; top: 16%; right: 9%; bottom: 15%; left: 9%; }
.guide-head-shadow, .guide-head {
  position: absolute; top: 0; left: 26%; width: 48%; height: 70%;
  box-sizing: border-box; border-radius: 50%;
}
.guide-head-shadow { border: 8rpx solid rgba(12, 18, 22, .52); }
.guide-head { border: 3rpx solid rgba(255, 255, 255, .96); }
.guide-eye-shadow, .guide-eye-line { position: absolute; top: 33%; left: 19%; width: 62%; }
.guide-eye-shadow { height: 8rpx; margin-top: -2rpx; background-color: rgba(12, 18, 22, .46); }
.guide-eye-line { height: 3rpx; background-color: #ffd7cd; }
.guide-center-mark { position: absolute; top: 2%; left: 49.5%; width: 1%; height: 7%; background-color: #ffd7cd; }
.guide-shoulder { position: absolute; top: 81%; width: 39%; height: 4rpx; background-color: rgba(255, 255, 255, .95); }
.guide-shoulder-left { left: 8%; transform: rotate(-12deg); }
.guide-shoulder-right { right: 8%; transform: rotate(12deg); }
.camera-bottom-controls {
  position: absolute; right: 0; bottom: 0; left: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 34rpx 64rpx calc(32rpx + env(safe-area-inset-bottom));
  background-color: rgba(16, 20, 23, .78);
}
.camera-side-button { width: 106rpx; min-height: 112rpx; color: #fff; text-align: center; }
.camera-side-icon { width: 54rpx; height: 54rpx; margin: 5rpx auto; }
.camera-side-label { font-size: 23rpx; line-height: 36rpx; }
.camera-shutter {
  width: 138rpx; height: 138rpx; box-sizing: border-box; border: 5rpx solid #fff;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
}
.camera-shutter-inner { width: 108rpx; height: 108rpx; border-radius: 50%; background-color: $brand; }
.camera-shutter-busy { opacity: .52; }
.camera-error { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #fff; }
.camera-error-close { position: absolute; top: 22rpx; left: 30rpx; width: 80rpx; height: 80rpx; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, .14); }
.camera-error-content { width: 80%; text-align: center; }
.camera-error-icon { width: 104rpx; height: 104rpx; margin: 0 auto 28rpx; border-radius: 32rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, .12); }
.camera-error-title { font-size: 34rpx; font-weight: 600; }
.camera-error-message { margin: 18rpx 0 36rpx; color: #c8cbd0; font-size: 26rpx; line-height: 1.7; }
.camera-error-primary, .camera-error-secondary { min-height: 88rpx; margin-top: 16rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; }
.camera-error-primary { background: $brand; color: #fff; }
.camera-error-secondary { background: rgba(255, 255, 255, .12); color: #fff; }
.camera-error-album { padding: 28rpx 0; color: #e6e7e8; font-size: 26rpx; }
.full-screen-preview { z-index: 10000; display: flex; flex-direction: column; box-sizing: border-box; }
.preview-heading { position: relative; padding: 34rpx 32rpx 18rpx; color: #fff; text-align: center; }
.preview-close { position: absolute; top: 20rpx; left: 30rpx; width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255, 255, 255, .14); color: #fff; font-size: 48rpx; line-height: 68rpx; text-align: center; }
.preview-title { font-size: 34rpx; font-weight: 600; }
.preview-subtitle { margin-top: 10rpx; color: #c8cbd0; font-size: 24rpx; }
.preview-image-container { flex: 1; min-height: 0; padding: 16rpx 32rpx; display: flex; align-items: center; justify-content: center; }
.full-screen-image { width: 100%; height: 100%; border-radius: 18rpx; }
.preview-bottom-info { padding: 16rpx 32rpx calc(28rpx + env(safe-area-inset-bottom)); }
.preview-tip { display: flex; justify-content: center; align-items: center; gap: 10rpx; margin-bottom: 24rpx; color: #c8cbd0; font-size: 23rpx; }
.preview-actions { display: flex; gap: 16rpx; }
.preview-retake, .preview-confirm { flex: 1; min-height: 96rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 29rpx; font-weight: 600; }
.preview-retake { background: rgba(255, 255, 255, .14); }
.preview-confirm { background: $brand; }

</style>
