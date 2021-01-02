const fs = require('fs');

/**
 * 循环chunks目录，将传入的hash匹配 返回匹配到的数组
 * @params hash: hash256 string for file
 * @returns Array for string or []
 */
let response = {
    status: 0,
    message: '',
    data: {
        shouldUpload: null,
        uploadedList: [],
        filePath: ''
    }
}

module.exports = async function (hash) {
    const readFiles = fs.readdirSync('./static/files');
    const readChunks = fs.readdirSync('./static/chunks');
    //先去遍历合并完成的文件夹
    let hasFile = readFiles.find(fileName => fileName.indexOf(hash) !== -1);
    if (hasFile) {
        response = {
            status: 0,
            message: '已存在文件',
            data: {
                shouldUpload: false,
                uploadedList: [],
                filePath: `${__dirname}/static/files/${hasFile}`
            }
        }
        return response
    } else {
        let arr = [];
        readChunks.forEach(fileName => {
            if (fileName.indexOf(hash) !== -1) {
                arr.push(fileName);
            }
        })
        
        return response = { 
            status: 1,
            message: '需要上传',
            data: {
                shouldUpload: true,
                uploadedList: arr,
                filePath: ``
            }
        };
    }


}