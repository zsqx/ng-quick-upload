import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { BehaviorSubject, Subscription, Subject, Observable } from "rxjs";
import { VerifyResponse } from "../components/videotape/videotape.component";
import { FileChunkService } from "./file-chunk.service";
import { FileHashService } from "./file-hash.service";
import { HttpClient } from "@angular/common/http";
import { RequestService } from "./request.service";
import { CHUNK_SIZE } from "../config";

export interface ImagePayload {
  type: string;
  hash?: number; //唯一性
}

export interface UploadPayload {
  chunk: Blob;
  type: string;
  upload_type?: "upload" | "merge" | "fileVerify";
  hash?: number;
  fileHash?: number;
  sort_index?: number;
  cutNum?: number;
  index?: number
}

export interface QueueNode<T> {
  type: "chunk" | "file";
  size: number; //blob的size
  name: string;
  mimeType: string; //文件后缀  切片的时候不需要
  payload?: T; //服务器上传的额外参数
  blob?: Blob;
  percentage?: number; //进度 通过XHR的onProgress事件得来
  hash?: number | string; //文件唯一hash -> image的是通过字符串的charCode计算,video的是通过文件唯一hash计算+其切片index
  chunks?: QueueNode<any>[]; //只有video有
  index?: number; //当前切片的索引值
  chunksLength?: number; //chunk数量
  already?: number; //已经上传的数量
  path?: string; //服务器路径
}

export interface Chunk {
  file: Blob;
}

@Injectable({
  providedIn: "root",
})
export class UploadQueueService {
  status: boolean = false; // 是否在下载
  isSuspend: boolean = false; //是否暂停状态
  queue: Array<QueueNode<any>> = []; //上传队列 数组队列
  videoQueue: Array<QueueNode<any>> = []; //视频上传队列
  alreadyUploadQueue: Array<QueueNode<any>> = []; //已上传数组队列
  onChangeUploadStatus: BehaviorSubject<boolean> = new BehaviorSubject(
    this.isSuspend
  );
  alreadyUpProgress: boolean = false; //已经点过“上传进度”按钮 状态

  getImgData: BehaviorSubject<{
    data: Blob;
    elem: ImagePayload;
  }> = new BehaviorSubject(null);

  //保存一个全局图片状态
  globalImgCache: Subscription;
  //保存一个全局视频状态
  globalVideoCache: Subscription;

  alreadyUploadPayload$: Subject<QueueNode<ImagePayload>> = new Subject();
  constructor(
    private fileChunk: FileChunkService,
    private fileHash: FileHashService,
    private http: HttpClient,
    private request: RequestService
  ) {} 
  num: number = 0;
  /**
   * 向已上传队列里增加成员
   * @param ele  成员 - node
   */
  push(ele: QueueNode<any>) {
    this.queue.push(ele);
    !this.status && this.run();
    return true;
  }

  /**
   * 队列去重
   */
  duplicateRemoval(): QueueNode<any>[] {
    let hash = {},
      data: QueueNode<any>[] = this.queue;
    data = data.reduce((preVal, curVal) => {
      hash[curVal.hash]
        ? ""
        : (hash[curVal.hash] = true && preVal.push(curVal));
      return preVal;
    }, []);
    return data;
  }

  /**
   * 队列出列 -
   */
  pop(payload?: { path: string; type: string }, notEmitImg?: boolean) {
    let qNode = this.queue.shift();
    if (!qNode) return;
    qNode.path = payload ? payload.path : "";
    this.alreadyUploadQueue.push(qNode);
    //console.log('------ 回传 -----', node.path);
    !notEmitImg && this.alreadyUploadPayload$.next(qNode);
    return qNode;
  }

  //获取队首
  get front(): QueueNode<any> {
    return this.queue[0];
  }

  //获取队尾
  get rear(): QueueNode<any> {
    return this.queue[this.queue.length - 1];
  }

  //清空队列
  clear() {
    this.queue = [];
  }

  //获取队长
  get size(): number {
    return this.queue.length;
  }

  //暂停机制
  suspend() {
    if (!this.requestList || !this.requestList.length) return;
    this.status = false;
    this.requestList[0].abort();
    this.isSuspend = true;
    this.onChangeUploadStatus.next(this.isSuspend);
  }

  //重新开始
  restart() {
    this.queue = [...this.queue];
    this.requestList = [];
    this.status = true;
    this.isSuspend = false;
    this.upload();
    this.onChangeUploadStatus.next(this.isSuspend);
  }

  /**
   * run方法 自动上传
   */
  run() {
    this.status = true;
    this.upload();
  }

  //Add 外部调用
  add(ele: QueueNode<any>) {
    // 如果文件大小 小于常量切片大小
    if (ele.size < CHUNK_SIZE) {
      this.push(ele);
    } else this.packingFile(ele);
  }

  requestList: XMLHttpRequest[] = [];

  /**
   * 上传视频
   */
  async packingFile(ele: QueueNode<any>) {
    ele.payload = {};
    //此地做问价分片 断点续传功能
    //文件切片
    const fileChunkList = await this.fileChunk.handleFile(ele.blob);
    //主动将整个Blob置为null 释放内存
    ele.blob = null;
    //文件hash
    const hash = await this.fileHash.initHashWorker(fileChunkList);
    ele.payload.hash = hash;
    ele.type = "chunk";
    //验证上传
    const {
      data: { uploadedList, shouldUpload },
    } = await this.verifyUpload(hash, ele.payload.path, ele.payload);
    if (!shouldUpload) {
      alert("文件已上传");
      return;
    } else {
      // 此地将切片push到队列
      this.chunkToQueueNode(
        uploadedList ? uploadedList : [],
        fileChunkList,
        ele
      );
    }
  }

  /**
   * 网速判断
   */
  networkLogic(): boolean {
    let val: boolean = true;
    // if (this.network.type == 'none') {
    //     val = false;
    //     this.suspend();
    //     this.es.showToast({
    //         message: '当前网络环境不佳，上传任务搁置',
    //         color: 'danger',
    //     });
    // }
    return val;
  }

  //驱动上传
  async driveUpload(node: QueueNode<any>): Promise<any> {
    if (!node) return true;
    let formData: FormData = new FormData();
    //组装额外参数 区分图片和视频
    // for (let key in node.payload) {
    //   formData.append(key, node.payload[key]);
    // }
    formData.append("type", node.type);
    formData.append("mimeType", node.mimeType);
    if (node.type === "chunk") {
      formData.append("chunk", (node as any).chunk);
      for (let key in node.payload) {
        formData.append(key, node.payload[key]);
      }
    }

    // node.size < CHUNK_SIZE && formData.append("file", node.blob);
    node.type === "file" && formData.append("file", node.blob);
    //将结果返回
    return await this.request.request({
      url: `${environment.apiUrl}/upload`,
      requestList: this.requestList,
      onProgress: this.createProgressHandler(this.front), //此处优化 闭包
      data: formData,
      headers: {},
    });
  }

  /**
   * 通用上传API
   * 递归
   */
  async upload() {
    let chunkNode: Array<QueueNode<any>> | QueueNode<any> = null;
    //此处判断是否有chunks
    if (this.front.chunks && this.front.chunks.length) {
      //如果有则将chunks转为队列
      chunkNode = this.front.chunks;
    } else {
      //否则就是一个整体文件 -> 小与CHUNK_SIZE的文件
      chunkNode = this.front;
    }

    //chunkNode 是一个数组（队列里的队列）
    if (chunkNode && (chunkNode as Array<QueueNode<any>>).length) {
      //先执行一维队列里的二维队列，执行完了在依次向下递归执行
      const { data, code } = await this.driveUpload(chunkNode[0]);
      if (data && code === 200) {
        (chunkNode as Array<QueueNode<any>>).shift();
        if ((chunkNode as Array<QueueNode<any>>).length) {
          //如果还有切片则上传
          this.upload();
          return;
        } else if (data && data.canMerge === true) {
          //否则 若是服务器返回canMerge为true 则合并切片
          this.merge();
          return;
        } else {
          this.cancel();
          return;
        }
      } else {
        this.cancel();
        alert("上传出错，请重新上传");
      }
    }

    console.log("切片上传不应该执行到这里");
    const { code, data } = await this.driveUpload(chunkNode as QueueNode<any>);
    if (code === 200) {
      this.pop();
      if (this.size) this.upload();
      else this.status = false;
    }
  }

  async merge() {
    const { code, data } = await this.mergeRequest(this.front);
    //合并完成之后 判断状态 如果成功则删除缓存 在让主队列的front出列
    if (code === 200 && this.front) {
      // this.pop(msg.data);
      this.pop(data[0], data.status === "already");
      if (this.size) {
        this.upload();
        //此处判断如果一维队列没有queue可传 则将总状态（status）置为false
      } else this.status = false;
      return;
    }
  }

  // 用闭包保存每个 chunk 的进度数据
  createProgressHandler(item: QueueNode<any>) {
    if (!item) return;
    try {
      return (e: { loaded: number; total: number }) => {
        if (item.type === "file") {
          item.percentage = parseInt(String((e.loaded / e.total) * 100));
          console.log(e.loaded, e.total);
        } else {
          //在此增加计算已经上传了的切片
          (item as any).current = parseInt(String((e.loaded / e.total) * 100));
          if ((item as any).current === 100) {
            item.percentage =
              100 -
              (((item.chunks.length - 1) / item.chunksLength) as any).toFixed(
                2
              ) *
                100;
            console.log(
              "--------------------- 切片完成 ---------------------",
              item.percentage
            );
          }
        }
      };
    } catch (e) {
      console.log(e, item);
    }
  }

  async chunkToQueueNode(
    uploadedList: string[] = [],
    fileChunkList: Chunk[],
    ele: QueueNode<UploadPayload>
  ) {
    //组装成QueueNode
    //Push到上传队列
    const data: Array<any> = fileChunkList    //QueueNode<UploadPayload>
      //组装为切片
      .map(({ file }, index) => {
        let obj = {
          chunk: file,
          type: ele.type,
          payload: null,
          size: file.size,
          chunk_total: fileChunkList.length,
          percentage: uploadedList.includes(index + "") ? 100 : 0, //每个切片的进度条
        };
        obj.payload = {
          cutNum: fileChunkList.length,
          fileHash: ele.payload.hash,
          hash: ele.payload.hash + "__" + index as any,
          index: index,
          upload_type: "upload",
        };
        return obj;
      })
      //筛选未上传的切片
      .filter(({ payload: { hash } }) => !uploadedList.includes(hash as any));
    ele.already = uploadedList.length;
    ele.chunks = data;
    /**
     *  此地需要判断一种情况
     *  当切片通过线上已上传的切片过滤后没有可传的切片时
     *  此时直接进行合并操作
     * */
    if (fileChunkList.length === uploadedList.length) {
      let node:any = {  // QueueNode<UploadPayload>
        type: null,
        size: null,
        payload: {
          type: ele.type,
          hash: ele.payload.hash as any,
          chunk: null,
          sort_index: ele.payload.sort_index,
        },
      };
      this.mergeRequest(node);
      return;
    }
    //此地先将chunks的数量存好，上传的时候是每传完一个就会删除
    ele.chunksLength = fileChunkList.length;
    ele.percentage = (ele.already / ele.chunksLength) * 100;

    this.push(ele); //** 此处应该在push里驱动upload
  }

  async mergeRequest(node: QueueNode<UploadPayload>): Promise<any> {
    let data = {
      fileHash: node.payload.hash,
      type: node.payload.type,
      upload_type: "merge",
      sort_index: node.payload.sort_index,
      mimeType: node.mimeType,
    };
    !node.payload.sort_index && delete data.sort_index;
    return this.http.post("http://127.0.0.1:3001/upload", data).toPromise();
  }

  /**
   * 通过base64ToBlob WebWorker 得到Blob
   * @param base64
   */
  doWorkerGetBlob(base64: String): Observable<any> {
    let obs = new Observable((observer) => {
      const worker: Worker = new Worker("../assets/js/dataURItoBlob.js");
      worker.postMessage({ res: base64 });
      worker.onmessage = (e) => {
        observer.next(e);
      };
    });
    return obs;
  }

  /**
   * 验证视频上传接口
   * @param fileHash
   * @param filePath
   */
  async verifyUpload(
    fileHash: string,
    filePath: string,
    params: UploadPayload
  ): Promise<VerifyResponse> {
    const data = await this.request.request({
      url: `${environment.apiUrl}/upload`,
      headers: {
        "content-type": "application/json",
      },
      data: JSON.stringify({
        fileHash: fileHash,
        filePath: filePath,
        type: params.type,
        upload_type: "fileVerify",
      }),
    });
    return data;
  }

  //取消上传 跳过第一个
  cancel() {
    this.suspend(); //暂停
    this.queue.shift(); //出队列
    this.size && this.restart(); //重新开始上传
  }
}

export function HashCode(str: string) {
  var hash: number = 0,
    i: number,
    chr: number;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
