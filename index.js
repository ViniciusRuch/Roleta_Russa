const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3030;
const publicDir = path.join(__dirname, 'public');
console.log(publicDir);

const server = http.createServer((req, res) => {
    let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);
    const contType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css'
    }[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if(err){
            res.writeHead(404,{'content-type':'text/pain'});
            return res.end('Pagina nao encontrada.');
        }
        res.writeHead(200,{'content-type':contType});
        res.end(content);
    });
});

server.listen(PORT,()=>{
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});