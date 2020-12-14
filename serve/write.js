const fs = require("fs");

module.exports = async function (ctx) {
  console.log(ctx.request.files["chunk"]);
  // 创建可读流
  const reader = fs.createReadStream(ctx.request.files["chunk"]["path"]);
  let filePath = `./static/chunks/` + `${ctx.request.body.hash}`;
  // 创建可写流
  const upStream = fs.createWriteStream(filePath);
  // 可读流通过管道写入可写流
  reader.pipe(upStream);
  // TODO 此地需要给前端给一个可以合并的状态
  // JSON.parse(next.data).data &&
  // JSON.parse(next.data).data.canMerge === true
  return (ctx.body = {
    status: 1,
    message: "文件上传成功",
    data: {
      status: 1,
    },
  });
};
