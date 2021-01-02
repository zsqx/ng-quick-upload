const fs = require('fs');



/**
 * 文件异步合并
 * @param {String} dirPath 分片文件夹
 * @param {String} filePath 目标文件
 * @param {String} hash 文件hash
 * @param {Number} total 分片文件总数
 * @returns {Promise}
 */
function mergeFile(dirPath, filePath, hash, chunks) {
    return new Promise((resolve, reject) => {
        const fileWriteStream = fs.createWriteStream(filePath)
        function merge(i) {
            return new Promise((res, rej) => {
                // 合并完成
                if (i === chunks.length) {
                    return res()
                }

                let chunkPath = dirPath + hash + '__' + i
                fs.readFile(chunkPath, (err, data) => {
                    console.log("此时读切片");
                    if (err) return rej(err)


                    // 将切片追加到存储文件
                    fs.appendFile(filePath, data, () => {
                        // 删除切片文件
                        fs.unlink(chunkPath, () => {
                            // 递归合并
                            res(merge(i + 1))
                        })
                    })
                })

            })
        }
        merge(0).then(() => {
            // 默认情况下不需要手动关闭，但是在某些文件的合并并不会自动关闭可写流，比如压缩文件，所以这里在合并完成之后，统一关闭下
            fileWriteStream.close()
            resolve({ status: 200 })
        })
    })
}




module.exports = async function (ctx) {
    const chunks = fs.readdirSync('./static/chunks');
    chip = chunks.filter(fileName => fileName.indexOf(ctx.request.body.fileHash) !== -1)
    //根据索引（index）排序 合并的时候要按顺序
    chip.sort((a, b) => {
        return Number(a.substr(a.length - 1, 1)) - Number(b.substr(a.length - 1, 1))
    })
    const { status } = await mergeFile('./static/chunks/', './static/files/' + ctx.request.body.fileHash + ctx.request.body.mimeType, ctx.request.body.fileHash, chip)
    return {
        code: status,
        data: __dirname + './static/files/' +ctx.request.body.fileHash + ctx.request.body.mimeType,
        message: "合并完成"
    }

}