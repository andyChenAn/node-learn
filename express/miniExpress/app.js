const miniExpress = require('./express.js');
const app = miniExpress();
app.get('/' , function (req , res , next) {
    res.end('hello andy');
});
app.get('/' , function (req , res) {
    console.log(324);
})
app.listen(3000 , function () {
    console.log('listening port 3000');
})