import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import {
  UploadQueueService,
  ImagePayload,
  HashCode,
} from "src/app/services/upload-queue.service";
import { environment } from "src/environments/environment";
import { filter } from "rxjs/operators";
import { Observable } from "rxjs";

@Component({
  selector: "app-photograph",
  templateUrl: "./photograph.component.html",
  styleUrls: ["./photograph.component.scss"],
})
export class PhotographComponent implements OnInit {
  type: string = "custom"; //图片类型 （验货字段）

  @Input() set photos(input: string[]) {
    if (!input) {
      input = [];
    }
    input = input.map((res) => this.imgOrigin + res);
    if (!!input) {
      this._photos = input;
    }
    //本地去缓存展示
    //this.getCache();
  }

  random: number = Math.random();

  constructor(public uQueue: UploadQueueService) {}
  imgOrigin: string = environment.apiUrl; //图片显示域名

  @Output() onPhotograph: EventEmitter<string[]> = new EventEmitter<string[]>(); //拍完照回调
  _photos: string[] = []; //显示图片数组
  metaPhotos: string[] = []; //显示图片源数据
  _caches: Array<ImagePayload> = []; //hybrid用来存native file url的数组
  rmClicked: number[] = [];

  ngOnInit() {
    let that = this;
    this.uQueue.alreadyUploadPayload$
      .asObservable()
      .pipe(filter((node) => node.type === "img"))
      .subscribe((res: any) => {
        // console.log('----------- 图片路径回流 ----------', res.path,res.type);
        this._photos.push(that.imgOrigin + res.path);
      });
  }

  removal(arr: Array<any>) {
    return arr.reduce(
      (prev, cur) => (prev.includes(cur) ? prev : [...prev, cur]),
      []
    );
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

  doWorkerGetBase64(blob: Blob): Observable<any> {
    let obs = new Observable((observer) => {
      const worker: Worker = new Worker("../assets/js/blobtobase64.js");
      worker.postMessage({ data: blob });
      worker.onmessage = (e) => {
        observer.next(e);
      };
    });
    return obs;
  }

  doCheckImg(e: any) {
    let params: ImagePayload = {
      type: this.type,
      hash: null,
    };

    Array.prototype.map.call(e.target.files, (file: File) => {
      params.hash = HashCode(params.type);

      this.uQueue.add({
        type: "img",
        size: file.size,
        blob: file,
        payload: params,
        hash: HashCode(params.type),
      });
    });
  }

  /**
   * 压缩图片
   * @param file file对象
   */
}
