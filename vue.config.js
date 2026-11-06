
// vue.config.js，如没有此文件则手动创建
if (process.env.NODE_ENV === 'production') require('./scripts/validate-config.cjs')();
module.exports = {
    transpileDependencies: ['uview-ui', '@dcloudio/uni-ui']
}
