import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(new URL('../', import.meta.url).pathname);
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.css':'text/css','.json':'application/json','.ico':'image/x-icon'};
const port = Number(process.env.PORT || 8765);
createServer(async (request,response)=>{
  let path;
  try {path=decodeURIComponent(new URL(request.url, 'http://localhost').pathname);}catch{response.writeHead(400).end();return;}
  if (path === '/') path = '/index.html';
  const full = resolve(root, '.' + path);
  if (!full.startsWith(root + sep)) {response.writeHead(403).end();return;}
  try {
    if (!(await stat(full)).isFile()) throw Error('Not a file');
    const bytes=await readFile(full);
    response.writeHead(200,{'Content-Type':(mime[extname(full)]||'application/octet-stream')+'; charset=utf-8',
      'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    response.end(bytes);
  } catch {response.writeHead(404).end('Nao encontrado');}
}).listen(port,'127.0.0.1',()=>console.log(`Acesse http://127.0.0.1:${port}/`));
