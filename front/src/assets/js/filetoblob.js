self.onmessage = data => {
    let fileReader = new FileReader();
    fileReader.onload = e => {
        let blob = this.dataURItoBlob(e.target.result);
        self.postMessage({
            blob: blob,
        });
        self.close();
    };
    fileReader.readAsDataURL(data.data.file);
};

function dataURItoBlob(base64Data) {
    //console.log(base64Data);//data:image/png;base64,
    var byteString;
    if (base64Data.split(',')[0].indexOf('base64') >= 0) byteString = atob(base64Data.split(',')[1]);
    //base64 解码
    else {
        byteString = unescape(base64Data.split(',')[1]);
    }
    var mimeString = base64Data
        .split(',')[0]
        .split(':')[1]
        .split(';')[0]; //mime类型 -- image/png

    // var arrayBuffer = new ArrayBuffer(byteString.length); //创建缓冲数组
    // var ia = new Uint8Array(arrayBuffer);//创建视图
    var ia = new Uint8Array(byteString.length); //创建视图
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([ia], {
        type: mimeString,
    });
    return blob;
}


