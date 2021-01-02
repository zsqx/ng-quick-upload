import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  QueueNode,
  UploadQueueService,
} from "src/app/services/upload-queue.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-queue",
  templateUrl: "./queue.component.html",
  styleUrls: ["./queue.component.scss"],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class QueueComponent implements OnInit {
  uploadStatus: "uploading" | "uploaded" = "uploading";
  queue: Array<QueueNode<any>> = [];
  destroy: boolean = false;
  isSuspend: boolean = false;
  statusSub: Subscription = null;
  alreadyUploadQueue: Array<QueueNode<any>> = []; //已上传的项目
  constructor(
    public uQueue: UploadQueueService,
    private ref: ChangeDetectorRef
  ) {
    this.queue = uQueue.queue;
    this.alreadyUploadQueue = uQueue.alreadyUploadQueue;
    this.statusSub = uQueue.onChangeUploadStatus.subscribe((res) => {
      this.queue = uQueue.queue;
      this.alreadyUploadQueue = uQueue.alreadyUploadQueue;
      this.isSuspend = res;
    });
    //网络变化的时候触发
  }

  close() {
    this.uQueue.alreadyUpProgress = false;
  }

  ngOnInit() {}

  async upload() {}

  segmentChanged(e: Event): void {}

  cancel() {}

  ngDestroy() {
    this.destroy = true;
    this.statusSub.unsubscribe();
  }
}
