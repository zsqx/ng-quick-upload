function routerResponse(option={}){
    return async function(ctx,next){
        console.log(ctx)
        ctx.success = function (data) {
            ctx.type = option.type || 'json'
            ctx.body = {
                code : option.successCode || 200,
                msg : option.successMsg || 'success',
                data : data
            }
        }
 
        ctx.fail = function (msg,code) {
            ctx.type = option.type || 'json'
            ctx.body = {
                code : code || option.failCode || 99,
                msg : msg || option.successMsg || 'fail',
            }
        }
 
        await next()
    }
 
}
 
 
module.exports= routerResponse