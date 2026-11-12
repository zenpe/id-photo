<template>
  <view v-if="show" class="loading-overlay" role="alert" aria-live="polite" @touchmove.stop.prevent>
    <view class="loading-card">
      <view class="loading-art" aria-hidden="true">
        <view class="art-orbit"></view>
        <view class="art-tile"><u-icon name="photo" size="31" color="#cc3d35" /></view>
        <view class="art-spark art-spark-one"></view>
        <view class="art-spark art-spark-two"></view>
      </view>
      <view class="loading-title">{{ text }}</view>
      <view class="loading-tip">{{ tip || '请稍候，完成后将自动继续' }}</view>
      <view v-if="showProgress" class="progress-wrapper">
        <view class="progress-bar"><view class="progress-fill" :style="{ width: safeProgress + '%' }"></view></view>
        <text class="progress-text">{{ safeProgress }}%</text>
      </view>
      <view v-else class="loading-indicator" aria-hidden="true"><view class="loading-dot"></view><view class="loading-dot loading-dot-2"></view><view class="loading-dot loading-dot-3"></view></view>
    </view>
  </view>
</template>

<script setup lang="ts">

import { computed, type PropType } from 'vue';

const props = defineProps({
  show: { default: false , type: Boolean as PropType<boolean> },
  text: { default: '正在处理' , type: String as PropType<string> },
  tip: { default: '' , type: String as PropType<string> },
  showProgress: { default: false , type: Boolean as PropType<boolean> },
  progress: { default: 0 , type: Number as PropType<number> }
});

const safeProgress = computed<number>(() => {
    return Number.isFinite(Number(props.progress)) ? Math.max(0, Math.min(100, Math.round(Number(props.progress)))) : 0;
});
</script>

<style lang="scss" scoped>
@import '@/assets/design-tokens.scss';
.loading-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 32rpx; box-sizing: border-box; background: rgba(25, 30, 39, .32); }
.loading-card { width: 520rpx; max-width: 100%; box-sizing: border-box; padding: 46rpx 32rpx 40rpx; border-radius: 32rpx; background: $surface; box-shadow: 0 20rpx 80rpx rgba(27, 32, 42, .16); display: flex; flex-direction: column; align-items: center; text-align: center; }
.loading-art { position: relative; width: 132rpx; height: 132rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 30rpx; }
.art-orbit { position: absolute; top: 0; right: 0; bottom: 0; left: 0; border: 4rpx solid #f6ded9; border-top-color: $brand; border-radius: 50%; animation: orbit 1.25s linear infinite; }
.art-tile { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 28rpx; background: $brand-soft; }
.art-spark { position: absolute; width: 12rpx; height: 12rpx; border-radius: 50%; background: #eab687; }
.art-spark-one { top: 6rpx; right: 8rpx; }.art-spark-two { left: 0; bottom: 18rpx; width: 8rpx; height: 8rpx; background: #8fc5ba; }
.loading-title { color: $ink; font-size: 32rpx; font-weight: 700; line-height: 1.4; }
.loading-tip { color: $muted; font-size: 24rpx; line-height: 1.6; margin-top: 12rpx; }
/* Component WXSS forbids tag-name selectors: use classes for the dots. */
.loading-indicator { display: flex; gap: 10rpx; margin-top: 26rpx; }
.loading-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: $brand; animation: dot 1.2s ease-in-out infinite; }
.loading-dot-2 { animation-delay: .15s; }
.loading-dot-3 { animation-delay: .3s; }
.progress-wrapper { width: 100%; margin-top: 24rpx; }.progress-bar { height: 8rpx; overflow: hidden; border-radius: 8rpx; background: $brand-soft; }.progress-fill { height: 100%; border-radius: 8rpx; background: $brand; transition: width .2s ease; }.progress-text { display: block; margin-top: 12rpx; color: $muted; font-size: 23rpx; }
@keyframes orbit { to { transform: rotate(360deg); } }
@keyframes dot { 0%, 60%, 100% { opacity: .3; transform: scale(.8); } 30% { opacity: 1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .art-orbit, .loading-dot { animation: none; } }
</style>
