<template>
  <view v-if="available" class="draft">
    <text>草稿仅保存在本机，一天内有效</text>
    <view class="draft-actions"><text @click="resume">继续上次制作</text><text @click="discard">丢弃草稿</text></view>
  </view>
</template>
<script setup lang="ts">
import {DraftKind, loadDraft, discardDraft} from '@/utils/task-draft';

import { ref, type PropType, onMounted } from 'vue';

const props = defineProps({
  kind: {required:true, type: null as unknown as PropType<DraftKind> }
});

const emit = defineEmits(["restore"]);

const available = ref(false);

function handleOnMounted() {
    available.value = !!loadDraft(props.kind);
}

function resume() {
    const draft = loadDraft(props.kind);
    if (draft)
        emit('restore', draft);
    else
        uni.showToast({ title: '草稿已过期，请重新选图', icon: 'none' });
    available.value = false;
}

function discard() {
    discardDraft(props.kind);
    available.value = false;
}

onMounted(handleOnMounted);
</script>
<style scoped>
/* Component WXSS forbids tag-name selectors such as ".draft view". */
.draft{margin:20rpx;padding:24rpx;background:#fff4e6;border-radius:16rpx;font-size:24rpx;color:#755a34}.draft-actions{display:flex;gap:40rpx;margin-top:14rpx;color:#a73730}
</style>
