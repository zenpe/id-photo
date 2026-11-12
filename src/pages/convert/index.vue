<template>
  <view class="page">
    <DraftResume kind="convert" @restore="restoreDraft" />
    <view class="preview" :class="{ 'has-image': displayPath }" @click="choosePhoto">
      <image v-if="displayPath" :src="displayPath" mode="aspectFit" />
      <view v-else class="placeholder">
        <view class="preview-icon"><u-icon name="photo" size="30" color="#356caa" /></view>
        <text class="placeholder-title">选择需要转换的照片</text>
        <text class="placeholder-hint">支持从相册选择或拍摄</text>
        <view class="choose-button"><u-icon name="plus" size="15" color="#cc3d35" /><text>选择照片</text></view>
      </view>
    </view>
    <view v-if="resultPath && !resultCurrent" class="hint">参数已改变，预览保留上一份成功结果。转换成功后才替换；还原参数可保存旧结果。</view>
    <view v-if="displayPath" class="change-photo" @click="choosePhoto">重新选择照片</view>
    <view class="card"><view class="title">图片格式</view><view class="tabs"><view :class="{ active: outputFormat === 'jpg' }" @click="setFormat('jpg')">JPG</view><view :class="{ active: outputFormat === 'png' }" @click="setFormat('png')">PNG</view></view><view class="hint">{{ outputFormat === 'png' ? 'PNG 保留透明背景，文件大小取决于图片内容。' : 'JPG 会将透明背景转换为白色。' }}</view></view>
    <view class="card"><view class="title">目标大小</view><picker :range="targetLabels" :value="targetIndex" @change="onTargetChange"><view class="picker"><text>{{ targetLabels[targetIndex] }}</text><u-icon name="arrow-down" size="16" color="#666b73" /></view></picker><view v-if="targetIndex" class="hint">转换时尽量控制在目标大小内，实际结果可能受图片内容影响。</view></view>
    <view v-if="resultPath" class="card"><view class="title">转换结果</view><view class="result-row"><text>图片大小</text><text>{{ sizeText }}</text></view><view class="result-row"><text>图片尺寸</text><text>{{ width }}×{{ height }} px</text></view><view v-if="!targetMet" class="warning">当前图片无法达到目标大小，可尝试调整目标或更换格式。</view></view>
    <view class="bottom"><view v-if="resultPath" class="save-hint">{{ accessHint }}</view><view class="primary-button" :class="{ disabled: busy || !sourcePath }" @click="onAction">{{ busy ? '正在处理...' : resultCurrent ? saveLabel : '开始转换' }}</view></view>
    <PhotoCamera v-if="showCamera" title="拍摄照片" :guide-initially-enabled="false" initial-position="back"
      @close="showCamera = false" @select="onCameraSelect" />
    <LoadingOverlay :show="processing" :text="saving ? '正在保存图片' : '正在转换图片'" :tip="saving ? '请稍候，正在保存到相册' : '正在处理图片格式与大小，请稍候'" />
  </view>
</template>
<script setup lang="ts">
import DraftResume from '@/components/DraftResume.vue';
import { rememberDraft, TaskDraft } from '@/utils/task-draft';
import { saveToAlbum, showSaveFailure } from '@/utils/album';
import { uploadFile } from '@/utils/request';
import { writeTemporaryImage, removeTemporaryImage } from '@/utils/image-file';
import { adManager } from '@/utils/ad-manager';
import { getMembershipStatus } from '@/api/membership';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import PhotoCamera from '@/components/PhotoCamera.vue';

import { ref, computed } from 'vue';
import { onShow, onHide } from '@dcloudio/uni-app';

const showCamera = ref(false);

const sourcePath = ref('');

const resultPath = ref('');

const outputFormat = ref('jpg');

const targetIndex = ref(0);

const busy = ref(false);

const processing = ref(false);

const saving = ref(false);

const resultKey = ref('');

const targetValues = ref([0, 50, 100, 200, 500, 1000, 2000]);

const targetLabels = ref(['不限制', '50 KB', '100 KB', '200 KB', '500 KB', '1 MB', '2 MB']);

const width = ref(0);

const height = ref(0);

const sizeBytes = ref(0);

const targetMet = ref(true);

const memberState = ref<'member'|'ordinary'|'unknown'>('unknown');

const settingsKey = computed(() => {
    return JSON.stringify([outputFormat.value, targetIndex.value]);
});

const resultCurrent = computed(() => {
    return !!resultPath.value && resultKey.value === settingsKey.value;
});

const displayPath = computed(() => {
    return resultPath.value || sourcePath.value;
});

const sizeText = computed(() => {
    return sizeBytes.value >= 1024 * 1024 ? (sizeBytes.value / 1024 / 1024).toFixed(2) + ' MB' : (sizeBytes.value / 1024).toFixed(1) + ' KB';
});

const accessHint = computed(() => {
    return adManager.hint(memberState.value === 'member');
});

const saveLabel = computed(() => {
    return adManager.label(memberState.value === 'member');
});

function handleOnShow() {
    if (adManager.requiresAd)
        refreshMembership();
}

async function keepDraft() {
    await rememberDraft('convert', { source: sourcePath.value, result: resultPath.value }, { outputFormat: outputFormat.value, targetIndex: targetIndex.value, resultKey: resultKey.value, width: width.value, height: height.value, sizeBytes: sizeBytes.value, targetMet: targetMet.value });
}

function handleOnHide() {
    if (sourcePath.value && !busy.value)
        keepDraft();
}

function restoreDraft(draft:TaskDraft) {
    sourcePath.value = draft.files.source;
    resultPath.value = draft.files.result || '';
    const state = draft.state;
    outputFormat.value = state.outputFormat;
    targetIndex.value = state.targetIndex;
    resultKey.value = state.resultKey || '';
    width.value = state.width;
    height.value = state.height;
    sizeBytes.value = state.sizeBytes;
    targetMet.value = state.targetMet;
}

async function refreshMembership() {
    try {
        memberState.value = (await getMembershipStatus()).active ? 'member' : 'ordinary';
    }
    catch (_) {
        memberState.value = 'unknown';
    }
}

function clearResult() {
    removeTemporaryImage(resultPath.value);
    resultPath.value = '';
    resultKey.value = '';
}

function choosePhoto() {
    if (busy.value)
        return;
    uni.showActionSheet({ itemList: ['拍摄照片', '从相册选择'], success: result => {
            if (result.tapIndex === 0) {
                showCamera.value = true;
                return;
            }
            if (result.tapIndex === 1)
                uni.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album'], success: selection => onCameraSelect(selection.tempFilePaths[0]) });
        } });
}

function onCameraSelect(path:string) {
    if (!path)
        return;
    showCamera.value = false;
    clearResult();
    sourcePath.value = path;
}

function setFormat(value:string) {
    if (busy.value || value === outputFormat.value)
        return;
    outputFormat.value = value;
}

function onTargetChange(event:any) {
    if (busy.value)
        return;
    targetIndex.value = Number(event.detail.value);
}

async function onAction() {
    if (busy.value || !sourcePath.value)
        return;
    if (resultCurrent.value)
        await save();
    else
        await convert();
}

async function convert() {
    busy.value = true;
    processing.value = true;
    try {
        await keepDraft();
        const result: any = await uploadFile('/convert_image', 'input_image', sourcePath.value, { data: { output_format: outputFormat.value, target_kb: targetValues.value[targetIndex.value] } });
        if (!result.image_base64)
            throw new Error('服务器未返回图片');
        const next = await writeTemporaryImage(result.image_base64, 'convert');
        const old = resultPath.value;
        resultPath.value = next;
        resultKey.value = settingsKey.value;
        removeTemporaryImage(old);
        width.value = result.width;
        height.value = result.height;
        sizeBytes.value = result.size_bytes;
        targetMet.value = result.target_met;
        await keepDraft();
    }
    catch (error: any) {
        uni.showModal({ title: '转换失败', content: error.message || '请稍后重试', showCancel: false });
    }
    finally {
        processing.value = false;
        busy.value = false;
    }
}

async function save() {
    if (busy.value || !resultCurrent.value)
        return;
    busy.value = true;
    try {
        {
            const access = await adManager.authorize(sourcePath.value);
            if (!access)
                return;
            memberState.value = access === 'member' ? 'member' : 'ordinary';
        }
        saving.value = true;
        processing.value = true;
        await saveToAlbum(resultPath.value);
        uni.showToast({ title: '保存成功', icon: 'success' });
    }
    catch (error: any) {
        showSaveFailure(error);
    }
    finally {
        processing.value = false;
        saving.value = false;
        busy.value = false;
    }
}

onShow(handleOnShow);

onHide(handleOnHide);
</script>
<style lang="scss" scoped>
@import '@/assets/design-tokens.scss'; .page{min-height:100vh;background:$page;color:$ink;box-sizing:border-box;padding:24rpx 28rpx calc(190rpx + env(safe-area-inset-bottom))}.preview{@include card;height:400rpx;display:flex;align-items:center;justify-content:center;box-sizing:border-box;margin-bottom:20rpx}.preview.has-image{height:410rpx;background:transparent;box-shadow:none;margin-bottom:0}.preview image{width:100%;height:100%;border-radius:12rpx}.placeholder{display:flex;flex-direction:column;align-items:center}.preview-icon{width:92rpx;height:92rpx;display:flex;align-items:center;justify-content:center;border-radius:28rpx;background:#eaf2fc}.placeholder-title{font-size:29rpx;font-weight:600;margin-top:20rpx}.placeholder-hint{color:$muted;font-size:23rpx;margin-top:8rpx}.choose-button{height:64rpx;display:flex;align-items:center;justify-content:center;gap:8rpx;padding:0 24rpx;margin-top:22rpx;border-radius:32rpx;background:#fff1ef;color:$brand;font-size:24rpx;font-weight:600}.change-photo{text-align:center;color:$brand;font-size:25rpx;padding:18rpx}.card{@include card;padding:28rpx;margin-bottom:20rpx}.title{font-size:30rpx;font-weight:650;margin-bottom:20rpx}.tabs{display:flex;gap:16rpx}.tabs view{flex:1;text-align:center;padding:20rpx 0;border:1rpx solid #d5d7db;border-radius:14rpx;font-size:28rpx}.tabs .active{border-color:$brand;background:#fff6f5;color:$brand;font-weight:600}.hint{color:$muted;font-size:23rpx;margin-top:16rpx;line-height:1.5}.picker{display:flex;align-items:center;justify-content:space-between;padding:20rpx;border:1rpx solid $border;border-radius:12rpx;font-size:28rpx}.result-row{display:flex;justify-content:space-between;padding:18rpx 0;border-top:1rpx solid $border;font-size:26rpx}.result-row text:first-child{color:$muted}.warning{color:#a44736;font-size:24rpx;line-height:1.5;margin-top:10rpx}.bottom{position:fixed;left:0;right:0;bottom:0;background:$page;padding:12rpx 28rpx calc(20rpx + env(safe-area-inset-bottom))}.save-hint{text-align:center;color:$muted;font-size:24rpx;margin-bottom:14rpx}.primary-button{@include primary-button}.disabled{opacity:.55}
</style>
