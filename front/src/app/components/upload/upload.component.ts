import { Component, OnInit } from "@angular/core";
import { UploadQueueService } from "src/app/services/upload-queue.service";
import { CHUNK_SIZE } from 'src/app/config';

@Component({
  selector: "app-upload",
  templateUrl: "./upload.component.html",
  styleUrls: ["./upload.component.scss"],
})
export class UploadComponent implements OnInit {
  constructor(private queueCtrl: UploadQueueService) {}

  ngOnInit() {}

  choice(e: Event) {
    const { files } = e.target as any;
    [...files].forEach((file: File) => {
      this.queueCtrl.add({
        type: file.size >= CHUNK_SIZE ? "chunk" : "file",
        size: file.size,
        blob: file,
        name: file.name,
        mimeType: file.name.substring(file.name.lastIndexOf('.'),file.name.length)
      });
    });
  }
}
