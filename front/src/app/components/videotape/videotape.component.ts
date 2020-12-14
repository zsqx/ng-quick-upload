import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";

import { filter } from "rxjs/operators";
import { environment } from "src/environments/environment";
import { Chunk, FileChunkService } from 'src/app/services/file-chunk.service';
import { FileHashService } from 'src/app/services/file-hash.service';
import { HttpClient } from '@angular/common/http';
import { UploadQueueService } from 'src/app/services/upload-queue.service';
import { RequestService } from 'src/app/services/request.service';

@Component({
  selector: "app-videotape",
  templateUrl: "./videotape.component.html",
  styleUrls: ["./videotape.component.scss"],
})
export class VideotapeComponent implements OnInit {
  progress: string; //上传进度
  hash: string; //唯一哈希
  data: any[]; //
  container: any;
  requestList: XMLHttpRequest[] = []; //请求列表（并发）
  fileChunkList: Chunk[]; //文件切片列表
  @Input() set videos(input: string[]) {
    if (!input) {
      return;
    }
    if (!!input) {
      this._up_data = input;
    }
  }

  constructor(
    private fileHash: FileHashService,
    private fileChunk: FileChunkService,
    private http: HttpClient,
    private uQueue: UploadQueueService,
    private request: RequestService
  ) {}

  /**
   * 上传总进度
   */
  get uploadPercentage(): number {
    if (!this.container || !this.container || !this.data || !this.data.length)
      return 0;
    const loaded = this.data
      .map((item) => item.size * item.percentage)
      .reduce((acc, cur) => acc + cur);
    return parseInt((loaded / this.container.size).toFixed(2));
  }

  _videos: any[][] = [];
  _up_data: string[] = [];
  ngOnInit() {
    this.uQueue.alreadyUploadPayload$.asObservable().subscribe((res) => {
      console.log("----------- 视频路径回流 ----------");
      this._up_data.push((res as any).path);
    });
  }
  complete: boolean = true;

  videotape() {
    if (!this.complete) {
      alert("请等待上传完毕！");
      return;
    }
  }

  testHandle(e: any) {
    const file = e.target.files[0];
    this.uQueue.add({
      type: "video",
      size: file.size,
      blob: file,

    });
  }

  async handleFile(res?: any, filePath?: string) {
    this.container = res;
    //文件切片
    this.fileChunkList = await this.fileChunk.handleFile(res);
    //文件hash
    this.hash = await this.fileHash.initHashWorker(this.fileChunkList);
    //toPromise rxjs
    const {
      data: { uploadedList, shouldUpload },
    } = await this.verifyUpload(this.hash, filePath);
    if (!shouldUpload) {
      alert("文件已上传");
      return;
    } else {
      this.uploadChunks(uploadedList ? uploadedList : []);
    }
    //上传切片
  }

  async uploadChunks(uploadedList: string[] = []) {
    this.data = this.fileChunkList.map(({ file }, index) => ({
      fileHash: this.hash,
      index,
      hash: this.hash + "-" + index,
      cut_num: index,
      chunk: file,
      size: file.size,
      percentage: uploadedList.includes(index + "") ? 100 : 0,
    }));
    let requestList = this.data
      .filter(({ hash }) => !uploadedList.includes(hash))
      .map(({ chunk, fileHash, hash, cut_num }) => {
        let formData = new FormData();
        formData.append("chunk", chunk);
        //custom params
        //formData.append('type', this.type);
        return formData;
      })
      .map(async (formData, index) => {
        return await this.request.request({
          url: `${environment.apiUrl}/upload`,
          requestList: this.requestList,
          onProgress: this.createProgressHandler(this.data[index]),
          data: formData,
          headers: {
            // Authorization: `Bearer ******`,
          },
        });
      });
    await Promise.all(requestList);
    this.mergeRequest();
  }

  async mergeRequest(): Promise<any> {
    let data = {
      file_hash: this.hash,
      upload_type: "merge",
    };
    this.http
      .post( "/upload", data )
      .subscribe((res:any) => {
        this._up_data.push(res.data);
      });
  }

  // 用闭包保存每个 chunk 的进度数据
  createProgressHandler(item: any) {
    return (e) => {
      item.percentage = parseInt(String((e.loaded / e.total) * 100));
    };
  }

  //暂停上传
  resetData() {
    this.requestList.forEach((xhr) => xhr.abort());
    this.requestList = [];
  }

  async verifyUpload(
    fileHash: string,
    filePath?: string
  ): Promise<VerifyResponse> {
    const { data } = await this.request.request({
      url: `${environment.apiUrl}/upload`,
      headers: {
        "content-type": "application/json",
      },
      data: JSON.stringify({
        file_hash: fileHash,
        file_path: filePath,
        upload_type: "fileVerify",
      }),
    });
    return JSON.parse(data);
  }
}

export interface VerifyResponse {
  status: number;
  message: string;
  data: {
    shouldUpload: boolean;
    uploadedList?: string[];
    filePath: string;
  };
}

export interface FileBaseInfo {
  fileHash: string;
  hash: string;
  filePath: string;
}
