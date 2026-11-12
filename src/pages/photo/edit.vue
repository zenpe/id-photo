<template>
  <view class="page">
    <view class="photo-wrapper">
      <view class="photo-container" :style="'background-color:' + IDPhotoForm.color + ';width:' + previewWidth + 'rpx;height:' + previewHeight + 'rpx'">
        <image class="photo" :src="currentPath" mode="aspectFit" />
      </view>
    </view>
    <view class="photo-meta"><view class="meta-name"><u-icon name="file-text" size="19" color="#666b73" /><text>{{ photoSize.name }}</text></view><text class="muted">{{ actualDimensions || '读取图片尺寸中' }}</text></view>

    <view class="section-card">
      <view class="section-title">背景颜色</view>
      <view class="color-grid">
        <view v-for="item in visibleColors" :key="item.color" class="color-option" @click="changeBackgroudColor(item.color)">
          <view class="color-circle" :class="{ selected: IDPhotoForm.color === item.color }" :style="'background-color:' + item.color"><text v-if="IDPhotoForm.color === item.color" class="check-icon" :class="{ dark: item.color === '#FFFFFF' }">✓</text></view>
          <text class="color-label">{{ item.name }}</text>
        </view>
        <view class="color-option" @click="toggleMoreColors"><view class="color-circle more-color">{{ showMoreColors ? '−' : '···' }}</view><text class="color-label">{{ showMoreColors ? '收起' : '更多' }}</text></view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">输出方式</view>
      <view class="output-tabs"><view :class="{ active: outputMode === 'photo' }" @click="setOutputMode('photo')">电子照</view><view :class="{ active: outputMode === 'layout' }" @click="setOutputMode('layout')">打印排版</view></view>
      <view v-if="outputMode === 'layout'" class="setting-row"><text>冲印相纸</text><picker :range="papers" range-key="label" :value="paperIndex" @change="onPaperChange"><text class="muted">{{ papers[paperIndex].label }} ▾</text></picker></view>
      <view v-if="outputMode === 'layout'" class="setting-row"><text>显示裁剪线</text><switch :checked="cropLine" color="#cc3d35" @change="onCropLineChange" /></view>
    </view>
    <view class="section-card settings-card">
      <view class="settings-heading" @click="settingsExpanded = !settingsExpanded"><text>更多设置</text><u-icon :name="settingsExpanded ? 'arrow-up' : 'arrow-down'" size="16" color="#666b73" /></view>
      <view v-if="settingsExpanded" class="setting-row"><view><text class="setting-name">高清模式</text><text class="setting-hint">输出更高分辨率照片</text></view><switch :checked="isHd" color="#cc3d35" @change="onHdChange" /></view>
      <view v-if="settingsExpanded && outputMode === 'photo'" class="setting-row"><view><text class="setting-name">保存到电子照</text><text class="setting-hint">同时保存在本机，方便下次使用</text></view><switch :checked="saveToElectronic" color="#cc3d35" @change="onSaveToElectronicChange" /></view>
    </view>

    <view class="bottom-actions"><view class="save-hint">{{ accessHint }}</view><view class="primary-button" :class="{ disabled: busy }" @click="save">{{ busy ? '正在处理...' : saveButtonText }}</view></view>
    <LoadingOverlay :show="processing" :text="outputMode === 'layout' ? '正在生成排版照' : '正在处理照片'" tip="照片处理中，请稍候" />
    <button v-show="false" open-type="share" />
  </view>
</template>

<script setup lang="ts">
import { saveToAlbum, showSaveFailure } from '@/utils/album';
import { AddBackgroudColor, GenerateLayoutPhoto } from '@/api/photo';
import { PhotoSize } from '@/model/PhotoSize';

import { ElectronicPhotoManager } from '@/utils/electronic-photo';
import StorageManager from '@/utils/storage';
import { adManager } from '@/utils/ad-manager';
import { rememberDraft, loadDraft } from '@/utils/task-draft';
import { getMembershipStatus } from '@/api/membership';
import { writeTemporaryImage, removeTemporaryImage, readImageBase64 } from '@/utils/image-file';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
const colors = [
  { name: '白色', color: '#FFFFFF' }, { name: '蓝色', color: '#438edb' }, { name: '红色', color: '#D9001B' },
  { name: '浅蓝', color: '#7ec8e8' }, { name: '灰色', color: '#b8b8b8' }, { name: '深红', color: '#a8000f' },
  { name: '深蓝', color: '#1a3a5c' }, { name: '粉色', color: '#ffb6c1' }
];
import { productConfig } from '@/config';
import { usePhotoStore } from '@/store/modules/photo';
import { ref, computed } from 'vue';
import { onHide, onLoad, onShow, onUnload, onShareTimeline, onShareAppMessage } from '@dcloudio/uni-app';

const photoStore = usePhotoStore();

const photoSize = computed(() => photoStore.photoConfig);

const photoPath = computed(() => photoStore.photoPath);

const setPhotoPath = photoStore.setPhotoPath;

const IDPhotoForm = ref<any>({ color: '#FFFFFF', kb: undefined, render: 0 });

const isHd = ref(true);

const saveToElectronic = ref(false);

const busy = ref(false);

const processing = ref(false);

const cropLine = ref(false);

const outputMode = ref('photo');

const showMoreColors = ref(false);

const settingsExpanded = ref(false);

const paperIndex = ref(0);

const actualDimensions = ref('');

const memberState = ref<'member' | 'ordinary' | 'unknown'>('unknown');

const cachedPath = ref('');

const cachedKey = ref('');

const cachedOutput = ref('');

async function keepDraft() {
    if (!photoPath.value)
        return;
    await rememberDraft('photo', { standard: photoPath.value.base64Path, hd: photoPath.value.base64HDPath, result: cachedPath.value }, { stage: 'editing', photoSize: photoSize.value, IDPhotoForm: { ...IDPhotoForm.value }, isHd: isHd.value, outputMode: outputMode.value, paperIndex: paperIndex.value, cropLine: cropLine.value, saveToElectronic: saveToElectronic.value, cachedKey: cachedKey.value });
}

function handleOnHide() {
    if (!busy.value)
        keepDraft();
}

function handleOnLoad(options:any) {
    if (!options || options.restore !== '1') {
        keepDraft();
        return;
    }
    const draft = loadDraft('photo');
    if (!draft)
        return;
    const state = draft.state;
    IDPhotoForm.value = state.IDPhotoForm;
    isHd.value = state.isHd;
    outputMode.value = state.outputMode;
    paperIndex.value = state.paperIndex;
    cropLine.value = state.cropLine;
    saveToElectronic.value = state.saveToElectronic;
    cachedPath.value = draft.files.result || '';
    cachedKey.value = state.cachedKey || '';
}

const papers = ref([{ label: '六寸 (4R)', value: '4r' }, { label: '五寸 (3R)', value: '3r' }, { label: 'A4', value: 'a4' }]);

const visibleColors = computed(() => {
    return showMoreColors.value ? colors : colors.slice(0, 3);
});

const currentPath = computed(() => {
    if (!photoPath.value)
        return '';
    return isHd.value && photoPath.value.base64HDPath ? photoPath.value.base64HDPath : photoPath.value.base64Path;
});

const previewWidth = computed<number>(() => {
    const ratio = photoSize.value.pxWidth / photoSize.value.pxHeight;
    return Math.round(Math.min(560, 650 * ratio));
});

const previewHeight = computed<number>(() => {
    const ratio = photoSize.value.pxWidth / photoSize.value.pxHeight;
    return Math.round(Math.min(650, 560 / ratio));
});

const accessHint = computed(() => {
    return adManager.hint(memberState.value === 'member');
});

const saveButtonText = computed(() => {
    return adManager.label(memberState.value === 'member');
});

const saveKey = computed(() => {
    return JSON.stringify([isHd.value, IDPhotoForm.value, outputMode.value, paperIndex.value, cropLine.value]);
});

function handleOnShow() {
    refreshDimensions();
    if (adManager.requiresAd)
        refreshMembership();
}

async function handleOnUnload() {
    await keepDraft();
    if (photoPath.value) {
        removeTemporaryImage(photoPath.value.base64Path);
        removeTemporaryImage(photoPath.value.base64HDPath);
    }
    removeTemporaryImage(cachedPath.value);
    setPhotoPath({ base64: '', base64HD: '', base64Path: '', base64HDPath: '' });
}

async function refreshMembership() {
    try {
        memberState.value = (await getMembershipStatus()).active ? 'member' : 'ordinary';
    }
    catch (_) {
        memberState.value = 'unknown';
    }
}

function refreshDimensions() {
    const path = currentPath.value;
    actualDimensions.value = '';
    if (!path)
        return;
    uni.getImageInfo({ src: path, success: (info: any) => { if (path === currentPath.value)
            actualDimensions.value = `${info.width}×${info.height} px`; } });
}

function changeBackgroudColor(color: string) {
    if (!busy.value)
        IDPhotoForm.value.color = color;
}

function toggleMoreColors() {
    if (!busy.value)
        showMoreColors.value = !showMoreColors.value;
}

function setOutputMode(mode: string) {
    if (!busy.value)
        outputMode.value = mode;
}

function onPaperChange(event: any) {
    if (!busy.value)
        paperIndex.value = Number(event.detail.value);
}

function onCropLineChange(event: any) {
    if (!busy.value)
        cropLine.value = event.detail.value;
}

function onHdChange(event: any) {
    if (!busy.value) {
        isHd.value = event.detail.value;
        refreshDimensions();
    }
}

function onSaveToElectronicChange(event: any) {
    if (!busy.value)
        saveToElectronic.value = event.detail.value;
}

async function save() {
    if (busy.value)
        return;
    busy.value = true;
    const layout = outputMode.value === 'layout';
    const key = saveKey.value;
    let colorPath = '';
    let resultPath = '';
    try {
        const imagePath = currentPath.value;
        if (!imagePath)
            throw new Error('图片路径无效，请重新制作');
        {
            const access = await adManager.authorize(photoPath.value.base64Path);
            if (!access)
                return;
            memberState.value = access === 'member' ? 'member' : 'ordinary';
        }
        processing.value = true;
        let output = cachedOutput.value;
        if (cachedPath.value && cachedKey.value === key) {
            resultPath = cachedPath.value;
        }
        else {
            const dpi = photoSize.value.dpi || 300;
            const colorForm: any = { color: IDPhotoForm.value.color.replace('#', ''), dpi };
            if (IDPhotoForm.value.kb !== undefined)
                colorForm.kb = IDPhotoForm.value.kb;
            if (IDPhotoForm.value.render)
                colorForm.render = IDPhotoForm.value.render;
            const color = await AddBackgroudColor(colorForm, 'input_image', imagePath);
            if (!color.image_base64)
                throw new Error('服务器未返回照片');
            colorPath = await writeTemporaryImage(color.image_base64, 'color');
            output = color.image_base64;
            if (layout) {
                const result = await GenerateLayoutPhoto({ height: photoSize.value.pxHeight, width: photoSize.value.pxWidth, dpi, paper_size: papers.value[paperIndex.value].value, crop_line: cropLine.value }, 'input_image', colorPath);
                if (!result.image_base64)
                    throw new Error('服务器未返回排版照');
                output = result.image_base64;
                resultPath = await writeTemporaryImage(output, 'layout');
            }
            else
                resultPath = colorPath;
            const old = cachedPath.value;
            cachedPath.value = resultPath;
            cachedKey.value = key;
            cachedOutput.value = output;
            removeTemporaryImage(old);
        }
        await keepDraft();
        processing.value = false;
        await saveToAlbum(resultPath);
        try {
            StorageManager.recordPhotoCreated();
        }
        catch (_) { /* statistics are optional */ }
        if (!layout && saveToElectronic.value) {
            if (!output)
                output = await readImageBase64(resultPath);
            saveToElectronicPhoto(output);
        }
        else
            uni.showToast({ title: '保存成功', icon: 'success' });
    }
    catch (err: any) {
        showSaveFailure(err);
    }
    finally {
        processing.value = false;
        if (colorPath !== cachedPath.value)
            removeTemporaryImage(colorPath);
        if (resultPath !== colorPath && resultPath !== cachedPath.value)
            removeTemporaryImage(resultPath);
        busy.value = false;
    }
}

function saveToElectronicPhoto(base64Data: string) {
    if (!ElectronicPhotoManager.canSaveMore()) {
        uni.showModal({ title: '已保存到相册', content: '电子照已达上限（2张），请先删除后再保存到电子照', showCancel: false });
        return;
    }
    const photoData = { name: `${photoSize.value.name}证件照`, size: actualDimensions.value || `${photoSize.value.pxWidth}×${photoSize.value.pxHeight}`, color: IDPhotoForm.value.color, hdBase64: base64Data, sdBase64: base64Data };
    if (ElectronicPhotoManager.save(photoData)) {
        uni.showToast({ title: '已保存到电子照', icon: 'success' });
    }
    else
        uni.showModal({ title: '已保存到相册', content: '保存到电子照失败，请检查设备存储空间', showCancel: false });
}

function handleOnShareTimeline() {
    return { title: productConfig.shareTitle, imageUrl: '/static/example.jpeg' };
}

function handleOnShareAppMessage() {
    return { title: productConfig.shareTitle, path: '/pages/index/index', imageUrl: '/static/example.jpeg' };
}

onHide(handleOnHide);

onLoad(handleOnLoad);

onShow(handleOnShow);

onUnload(handleOnUnload);

onShareTimeline(handleOnShareTimeline);

onShareAppMessage(handleOnShareAppMessage);
</script>

<style lang="scss" scoped>
@import '@/assets/design-tokens.scss';
.page { min-height: 100vh; padding: 24rpx 28rpx calc(210rpx + env(safe-area-inset-bottom)); box-sizing: border-box; background: $page; color: $ink; }
.photo-wrapper { display: flex; justify-content: center; margin-bottom: 12rpx; }.photo-container { position: relative; overflow: hidden; border-radius: 14rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,.05); }.photo { width: 100%; height: 100%; }
.photo-meta { @include card; display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; font-size: 27rpx; margin-bottom: 20rpx; }.meta-name { display: flex; align-items: center; gap: 14rpx; font-weight: 600; }.muted { color: $muted; font-size: 25rpx; }
.section-card { @include card; padding: 26rpx 28rpx; margin-bottom: 20rpx; }.section-title { font-weight: 600; font-size: 30rpx; margin-bottom: 22rpx; }.color-grid { display: flex; flex-wrap: wrap; }.color-option { display: flex; flex-direction: column; align-items: center; width: 25%; padding-bottom: 8rpx; }.color-circle { width: 72rpx; height: 72rpx; border-radius: 50%; border: 2rpx solid $border; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }.color-circle.selected { box-shadow: 0 0 0 4rpx #fff, 0 0 0 7rpx $brand; }.check-icon { color: #fff; font-size: 29rpx; font-weight: 700; }.check-icon.dark { color: $brand; }.color-label { margin-top: 12rpx; color: $muted; font-size: 24rpx; }.more-color { background: #edeef0; color: $muted; font-weight: 700; }
.output-tabs { display: flex; background: #f6f6f6; border: 1rpx solid #d5d7db; border-radius: 14rpx; overflow: hidden; }.output-tabs view { flex: 1; text-align: center; padding: 19rpx 0; font-size: 28rpx; }.output-tabs .active { color: $brand; background: #fff5f3; box-shadow: inset 0 0 0 2rpx $brand; border-radius: 14rpx; font-weight: 600; }
.settings-card { padding: 0 28rpx; }.settings-heading, .setting-row { display: flex; align-items: center; justify-content: space-between; min-height: 92rpx; font-size: 27rpx; }.settings-heading { font-weight: 600; }.setting-row { border-top: 1rpx solid $border; }.setting-name, .setting-hint { display: block; }.setting-hint { font-size: 23rpx; color: $muted; margin-top: 6rpx; }
.bottom-actions { position: fixed; left: 0; right: 0; bottom: 0; padding: 12rpx 28rpx calc(20rpx + env(safe-area-inset-bottom)); background: $page; }.save-hint { text-align: center; color: $muted; font-size: 24rpx; margin-bottom: 14rpx; }.primary-button { @include primary-button; }.disabled { opacity: .6; }
</style>
