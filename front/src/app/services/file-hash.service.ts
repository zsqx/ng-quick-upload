import { Injectable } from '@angular/core';
import { Chunk } from './file-chunk.service';
 
@Injectable({
    providedIn: 'root'
})
export class FileHashService {
    constructor() {}

    initHashWorker(fileChunkList: Chunk[]): Promise<string> {
        return new Promise(reject => {
            let worker = new Worker('../assets/js/hash.js');
            alert('正在获取文件hash……')
            worker.postMessage({ fileChunkList });
            worker.onmessage = e => {
                const { percentage, hash } = e.data;
                if (hash) {
                    reject(hash as string);
                }
            };
        });
    } 

    fileToBlob(file: File): Promise<any> {
        return new Promise(reject => {
            let worker = new Worker('../assets/js/filetoblob.js');
            worker.postMessage({ file });
            worker.onmessage = e => {
                const { blob } = e.data;
                reject(blob);
            };
        });
    }

    
}
