<template>
  <view class="page">
    <InlineState v-if="loading" kind="loading" title="正在加载购买记录" description="请稍候" />
    <InlineState v-else-if="error" kind="error" title="购买记录暂时无法加载" :description="error" action-text="重新加载" @action="load" />
    <InlineState v-else-if="!orders.length" title="暂无购买记录" description="开通会员后，订单会显示在这里" action-text="了解会员权益" icon="file-text" @action="goMember" />
    <block v-if="!loading && !error">
      <view v-for="order in orders" :key="order.order_no" class="order" @click="open(order.order_no)">
        <view class="top"><text>{{ order.plan_name }}</text><text class="status">{{ statusText(order.status) }}</text></view>
        <view class="detail"><text>{{ date(order.created_at) }}</text><text>¥{{ price(order.price_fen) }}</text></view>
      </view>
    </block>
  </view>
</template>
<script setup lang="ts">
import InlineState from '@/components/InlineState.vue';
import { getMembershipOrders, MembershipOrder, formatFen, formatMemberDate } from '@/api/membership';

import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const orders = ref<MembershipOrder[]>([]);

const loading = ref(true);

const error = ref('');

function handleOnShow() {
    load();
}

async function load() {
    loading.value = true;
    error.value = '';
    try {
        const fetchedOrders = await getMembershipOrders();
        if (!Array.isArray(fetchedOrders))
            throw new Error('购买记录数据无法读取，请稍后重试');
        orders.value = fetchedOrders;
    }
    catch (failure: any) {
        error.value = failure.message || '请检查网络后重试';
    }
    finally {
        loading.value = false;
    }
}

function price(value: number) {
    return formatFen(value);
}

function date(value: string) {
    return formatMemberDate(value);
}

function statusText(value: string) {
    return ({ paid: '已完成', pending: '确认中', closed: '已关闭', cancelled: '已取消', failed: '未完成', refunded: '已退款' } as any)[value] || '处理中';
}

function open(orderNo: string) {
    if (!orderNo) {
        uni.showToast({ title: '订单编号缺失，请重新加载', icon: 'none' });
        return;
    }
    uni.navigateTo({ url: `/pages/membership/order?order_no=${encodeURIComponent(orderNo)}` });
}

function goMember() {
    uni.navigateTo({ url: '/pages/membership/index' });
}

onShow(handleOnShow);
</script>
<style lang="scss" scoped>
@import '@/assets/design-tokens.scss';
.page { min-height: 100vh; background: $page; padding: 28rpx; box-sizing: border-box; }
.order { @include card; padding: 32rpx; color: $muted; font-size: 26rpx; margin-bottom: 16rpx; }
.top, .detail { display: flex; justify-content: space-between; }
.top { color: $ink; font-size: 29rpx; font-weight: 600; }
.status { color: $muted; font-size: 24rpx; font-weight: 400; }
.detail { margin-top: 22rpx; }
</style>
