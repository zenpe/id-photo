/** Album persistence only. Saving policy is handled by ad-manager. */
export function saveToAlbum(path: string): Promise<void> {
  return new Promise((resolve,reject)=>uni.saveImageToPhotosAlbum({filePath:path,success:()=>resolve(),fail:(cause:any)=>{
    const text=String(cause && cause.errMsg || '');
    const error:any=new Error(/cancel/i.test(text) ? '已取消保存，照片仍保留，可再次保存' : /auth|deny|denied|permission/i.test(text) ? '请在设置中允许保存到相册，然后重试；照片仍保留' : '保存失败，照片仍保留，请重试');
    error.albumPermission=/auth|deny|denied|permission/i.test(text);
    reject(error);
  }}));
}
export function showSaveFailure(error: any) {
  uni.showModal({title:'保存未完成',content:error.message || '请重试',showCancel:!!error.albumPermission,
    confirmText:error.albumPermission?'去设置':'知道了',success:result=>{if(result.confirm && error.albumPermission)uni.openSetting({});}});
}
