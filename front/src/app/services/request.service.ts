import { Injectable } from "@angular/core";

export interface FileParam {
  chunk: Blob;
  hash: string;
  filename: string;
  fileHash: string;
}

@Injectable({
  providedIn: "root",
})
export class RequestService {
  constructor() {}

  // request({ url, method = 'post', data, headers, onProgress = e => e, requestList = [] }): Promise<any> {
  //         let param = "";
  //         param = JSON.stringify({'test':'222'});

  //         return new Promise(resolve => {
  //         // headers.Authorization = `Bearer `;
  //         const xhr: XMLHttpRequest = new XMLHttpRequest();
  //         xhr.upload.onprogress = onProgress;
  //         xhr.open(method, url);
  //         Object.keys(headers).forEach(key => xhr.setRequestHeader(key, headers[key]));
  //         xhr.setRequestHeader('Content-Type','application/json')
  //         xhr.send(param);
  //         xhr.onload = e => {
  //             if (requestList) {
  //                 const xhrIndex = requestList.findIndex(item => item === xhr);
  //                 requestList.splice(xhrIndex, 1);

  //             }
  //             resolve({
  //                 param: xhr.status == 200 ? (e.target as any).response : { message: '上传失败', error: xhr.status },
  //             });
  //         };
  //         // 暴露当前 xhr 给外部  通过引用类型暴漏
  //         requestList && requestList.push(xhr);
  // })}

  request({
    url,
    method = "post",
    data,
    headers,
    onProgress = (e) => e,
    requestList = [],
  }): Promise<any> {
    //console.log('-------    请求    -------')
    return new Promise((resolve) => {
      // headers.Authorization = `Bearer `;
      const xhr: XMLHttpRequest = new XMLHttpRequest();
      xhr.upload.onprogress = onProgress;
      xhr.open(method, url);
      Object.keys(headers).forEach((key) =>
        xhr.setRequestHeader(key, headers[key])
      );
      xhr.send(data);
      xhr.onload = (e) => {
        // 将请求成功的 xhr 从列表中删除
        if (requestList) {
          const xhrIndex = requestList.findIndex((item) => item === xhr);
          requestList.splice(xhrIndex, 1);
        }
        //此地增加status不为200的逻辑
        //要是不为200，则通知queue不pop。暂停上传
        const payload =
          (xhr.status == 200
            ? (e.target as any).response
            : { message: "上传失败", code: xhr.status });
        resolve(JSON.parse(payload));
      };
      // 暴露当前 xhr 给外部  通过引用类型暴漏
      requestList && requestList.push(xhr);
    });
  }
}
