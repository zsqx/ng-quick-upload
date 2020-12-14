import { Injectable } from '@angular/core';

export interface Chunk {
    file: Blob;
}

@Injectable({
    providedIn: 'root',
})
export class FileChunkService {
    SIZE: number = 30 * 1024 * 1024; //切片10M     * 1024;
    file: Blob;
    constructor() {}

    /**
     * 创建切片
     * @param file  整个file对象
     * @param size  切片大小
     */ 
    createFileChunk(file: any, size = this.SIZE): Chunk[] {
        const fileChunkList: Chunk[] = [];
        let cur = 0;
        while (cur < file.size) {
            fileChunkList.push({ file: file.slice(cur, cur + size) });
            cur += size;
        }
        return fileChunkList;
    }

    /**
     * file事件  html : input[type=file] onchange事件
     *          ionic Cordova : 相机tape事件 || 文件选择器picker事件
     * @param file
     */
    handleFile(file: Blob): Promise<Chunk[]> {
        return new Promise(reject => {
            this.file = file;
            let fileChunkList: Chunk[] = this.createFileChunk(this.file);
            reject(fileChunkList);
        });
    }
}
