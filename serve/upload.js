const fs = require('fs');

module.exports = async function uploadImg(ctx) {
    let file = ctx.request.file; // 获取上传文件
    // 创建可读流
    const reader = fs.createReadStream(ctx.request.files['file']['path']);
    let filePath = `./static/img/` + `${ctx.request.files['file']['name']}`;
    let remoteFilePath = `/img` + `/${ctx.request.files['file']['name']}`;
    // 创建可写流
    const upStream = fs.createWriteStream(filePath);
    // 可读流通过管道写入可写流
    reader.pipe(upStream);
    return ctx.body = {
        status:1,
        message: "文件上传成功",
        data: {
            type: 'img',
            path: remoteFilePath
        }
    }
}
