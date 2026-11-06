declare const wx: any;
export type DraftKind = 'photo' | 'matting' | 'watermark' | 'convert';
export interface TaskDraft { version: 1; expiresAt: number; files: {[key:string]:string}; state: any; }
const kinds: DraftKind[] = ['photo','matting','watermark','convert'];
const key = (kind: DraftKind) => 'idphoto-draft-v1-' + kind;
const owned = (path: string) => typeof wx !== 'undefined' && typeof path === 'string' &&
  path.startsWith(wx.env.USER_DATA_PATH + '/idphoto-draft-') && /^idphoto-draft-[a-z0-9-]+\.(png|jpg|webp)$/i.test(path.split('/').pop() || '');
function remove(path: string) {
  if (owned(path)) uni.getFileSystemManager().unlink({filePath:path,fail:()=>{}});
}
export function discardDraft(kind: DraftKind) {
  const value = uni.getStorageSync(key(kind));
  uni.removeStorageSync(key(kind));
  if (value && value.files) Object.keys(value.files).forEach(name=>remove(value.files[name]));
}
export function loadDraft(kind: DraftKind): TaskDraft | null {
  // #ifdef MP-WEIXIN
  try {
    const value: TaskDraft = uni.getStorageSync(key(kind));
    if (!value) return null;
    if (value.version !== 1 || !value.expiresAt || value.expiresAt <= Date.now() || !value.files || !value.state) throw Error();
    Object.keys(value.files).forEach(name=>{
      if (!owned(value.files[name])) throw Error();
      uni.getFileSystemManager().accessSync(value.files[name]);
    });
    return value;
  } catch (_) { discardDraft(kind); }
  // #endif
  return null;
}
let sequence = Promise.resolve();
/** Atomic metadata replacement: the previous draft survives copy/storage failure. */
export function saveDraft(kind: DraftKind, files: {[key:string]:string}, state: any): Promise<void> {
  const task = async () => {
    // #ifdef MP-WEIXIN
    if (typeof wx === 'undefined') return;
    const previous = loadDraft(kind);
    const copies: {[key:string]:string} = {};
    try {
      for (const name of Object.keys(files)) {
        const src = files[name];
        if (!src) continue;
        if (previous && previous.files[name] === src) { copies[name]=src; continue; }
        const ext = /\.(jpg|jpeg|webp)(?:$|\?)/i.exec(src);
        const dest = `${wx.env.USER_DATA_PATH}/idphoto-draft-${kind}-${Date.now()}-${Math.random().toString(36).slice(2,10)}.${ext ? ext[1].replace('jpeg','jpg') : 'png'}`;
        await new Promise<void>((resolve,reject)=>uni.getFileSystemManager().copyFile({srcPath:src,destPath:dest,success:()=>resolve(),fail:reject}));
        copies[name]=dest;
      }
      if (!Object.keys(copies).length) return;
      uni.setStorageSync(key(kind), {version:1,expiresAt:Date.now()+24*3600*1000,files:copies,state});
      if (previous) Object.keys(previous.files).forEach(name=>{ if (!Object.values(copies).includes(previous.files[name])) remove(previous.files[name]); });
    } catch (_) {
      Object.keys(copies).forEach(name=>{ if (!previous || !Object.values(previous.files).includes(copies[name])) remove(copies[name]); });
      throw new Error('本地草稿保存失败，请检查存储空间');
    }
    // #endif
  };
  const pending = sequence.then(task);
  sequence = pending.catch(()=>{});
  return pending;
}
export async function rememberDraft(kind: DraftKind, files: {[key:string]:string}, state: any) {
  try { await saveDraft(kind,files,state); }
  catch (_) { uni.showToast({title:'草稿未保存，本次仍可继续',icon:'none'}); }
}
export async function clearDrafts() { await sequence; kinds.forEach(discardDraft); }
export function pruneDrafts() {
  kinds.forEach(loadDraft);
  // Also collect abandoned copies after a crash between copying and metadata commit.
  // #ifdef MP-WEIXIN
  if(typeof wx==='undefined')return;
  uni.getFileSystemManager().readdir({dirPath:wx.env.USER_DATA_PATH,success:({files}:any)=>{
    const referenced=new Set<string>();
    kinds.forEach(kind=>{const draft=loadDraft(kind);if(draft)Object.values(draft.files).forEach(path=>referenced.add(path));});
    files.forEach((name:string)=>{
      const timestamp=/^idphoto-draft-(?:photo|matting|watermark|convert)-(\d+)-/.exec(name);
      const path=wx.env.USER_DATA_PATH+'/'+name;
      if(timestamp && Number(timestamp[1])+24*3600*1000<Date.now() && !referenced.has(path))remove(path);
    });
  },fail:()=>{}});
  // #endif
}
