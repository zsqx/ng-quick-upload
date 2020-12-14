const Koa = require('koa');
// 注意require('koa-router')返回的是函数:
const router = require('koa-router')();
const koaBody = require('koa-body');//解析上传文件的插件
const upload = require('./upload');
// 引入静态资源中间件，静态web服务
const staticResource = require('koa-static');
const verify = require('./verify');
const write = require('./write');
const merge = require('./merge');

const app = new Koa();

app.use(staticResource(__dirname + '/static'));

app.use(koaBody({
    multipart: true,
    formidable: {
        maxFileSize: 20000 * 1024 * 1024    // 设置上传文件大小最大限制，默认30M
    }
}))

app.use(async (ctx, next) => {
    // 允许来自所有域名请求
    ctx.set("Access-Control-Allow-Origin", "*");

    ctx.set("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,PATCH,OPTIONS");

    ctx.set("Access-Control-Allow-Headers", "x-requested-with, accept, origin, content-type");

    if (ctx.method == 'OPTIONS') {
        ctx.body = 200;
    }
    await next();
});

// log request URL:
app.use(async (ctx, next) => {
    console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
    await next();
});

app.use(router.allowedMethods());

// add url-route:
router.get('/hello/:name', async (ctx, next) => {
    var name = ctx.params.name;
    ctx.response.body = `<h1>Hello, ${name}!</h1>`;
});

router.get('/', async (ctx, next) => {
    ctx.response.body = '<h1>Index</h1>';
});

router.post('/upload', async (ctx, next) => {
    //此地判断是图片还是视频
    if (ctx.request.body.upload_type === 'fileVerify') {
        const res = await verify(ctx.request.body.filehash)
        ctx.response.body = res;
        return;
    } else if (ctx.request.body.upload_type === 'merge') {
        merge(ctx);
        console.log(ctx.request.body.fileHash);
        ctx.response.body = '1';
        return
    } else write(ctx);
   
    //  upload(ctx);
})

// add router middleware:
app.use(router.routes());

app.listen(3001);
console.log('app started at port 3001...');