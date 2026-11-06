<template>
  <view v-if="available" class="draft">
    <text>本机保留了上次制作（一天内有效）</text>
    <view><text @click="resume">继续制作</text><text @click="discard">丢弃草稿</text></view>
  </view>
</template>
<script lang="ts">
import Vue from 'vue';
import {Component, Prop} from 'vue-property-decorator';
import {DraftKind, loadDraft, discardDraft} from '@/utils/task-draft';
@Component({})
export default class DraftResume extends Vue {
  @Prop({required:true}) kind!: DraftKind;
  available=false;
  mounted(){ this.available=!!loadDraft(this.kind); }
  resume(){ const draft=loadDraft(this.kind); if(draft)this.$emit('restore',draft); else uni.showToast({title:'草稿已过期，请重新选图',icon:'none'}); this.available=false; }
  discard(){ discardDraft(this.kind); this.available=false; }
}
</script>
<style scoped>
.draft{margin:20rpx;padding:24rpx;background:#fff4e6;border-radius:16rpx;font-size:24rpx;color:#755a34}.draft view{display:flex;gap:40rpx;margin-top:14rpx;color:#a73730}
</style>
