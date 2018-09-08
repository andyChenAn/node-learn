const http = require('http');
let router = [{
    path : '*',
    method : '*',
    handle : function (req , res) {
        res.writeHead(404 , 'Not Found' , {
            'Content-Type' : 'text/plain'
        });
        res.end('the page is not found');
    }
}];

let app = exports = module.exports = {};

app.listen = function () {
    let server = http.createServer(function (req , res) {
        for (let i = 0 , len = router.length ; i < len ; i++) {
            if (req.url == router[i].path && req.method.toLocaleLowerCase() == router[i].method) {
                return router[i].handle && router[i].handle(req , res);
            }
        };
        return router[0].handle && router[0].handle(req , res);
    });
    server.listen.apply(server , arguments);
};
app.get = function (path , handle) {
    router.push({
        path : path,
        handle : handle,
        method : 'get'
    });
};
