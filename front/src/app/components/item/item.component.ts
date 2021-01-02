import { Component, OnInit, Input } from "@angular/core";
import {
  QueueNode,
  UploadQueueService,
} from "src/app/services/upload-queue.service";

@Component({
  selector: "app-item",
  templateUrl: "./item.component.html",
  styleUrls: ["./item.component.scss"],
})
export class ItemComponent implements OnInit {
  _node: QueueNode<any>;
  @Input() set node(input: QueueNode<any>) {
    this._node = input;
  }
  @Input() index: number = null;
  @Input() type: "already" | "uploading" = "uploading";

  constructor(private uQueue: UploadQueueService) {}

  ngOnInit() {
    console.log(22);
  }

  get _color() {
    let color = "";
    if (this.type === "already") {
      color = "#52c41a";
    } else if (this.uQueue.status) {
      color = "#1890ff";
    } else color = "rgb(255, 96, 59)";
    return color;
  }
}
