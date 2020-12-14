const fs = require('fs');
const chunks = fs.readdirSync('./static/chunks');

let chip = [];

function merge(i) {
    return new Promise(async resolve => {
        const file = await fs.readFileSync('./static/chunks/' + chip[1]);
        fs.appendFileSync('./static/files/test.mp4', file);
        chip.splice(i, 1);
        resolve(true)
    })


}


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
        console.log();
        
        //files匹配chunks；
        // if(files.length !== total || !files.length) {
        //   return reject('上传失败，切片数量不符')
        // }
        const fileWriteStream = fs.createWriteStream(filePath)
        function merge(i) {
            return new Promise((res, rej) => {
                // 合并完成
                if (i === chunks.length) {
                    // fs.rmdir(dirPath, (err) => {
                    //     console.log(err, 'rmdir')
                    // })
                    return res()
                }

                let chunkPath = dirPath + hash + '__' + i
                fs.readFile(chunkPath, (err, data) => {
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
            resolve(fileWriteStream.close())
        })
    })
}




module.exports = async function (ctx) {
    //将切片合并
    chip = chunks.filter(fileName => fileName.indexOf(ctx.request.body.fileHash) !== -1)
    chip.sort((a, b) => {
        return Number(a.substr(a.length - 1, 1)) - Number(b.substr(a.length - 1, 1))
    })
    mergeFile('./static/chunks/', './static/files/'+ctx.request.body.fileHash+'.mp4', ctx.request.body.fileHash, chip)
    // fs.writeFileSync
}