const fs = require("fs");
const CONFIG = require("./config");

module.exports = async function (ctx) {
  const file = ctx.request.files["file"] ? ctx.request.files["file"] : ctx.request.files["chunk"];
  //接收前端的type字段  -> "file" | "chunk"
  const { type, hash, cutNum, index } = ctx.request.body;

  const name = type === "file" ? file.name : hash;
  const filePath = `./static/${type}s/` + `${name}`;

  console.log(cutNum, index + 1);

  try {
    // 创建可读流
    const reader = fs.createReadStream(file.path);
    // 创建可写流
    const upStream = fs.createWriteStream(filePath);
    // 可读流通过管道写入可写流
    reader.pipe(upStream);
  } catch (error) {
    console.log(error);

  }


  //如果切片总数等于当前index 则给前端返回canMerge
  const canMerge = cutNum && Number(cutNum) === Number(index) + 1;
  return {
    code: 200,
    message: `${type === "file" ? '文件' : '切片'}上传成功`,
    data: canMerge ? { canMerge } : filePath,
  };


};
