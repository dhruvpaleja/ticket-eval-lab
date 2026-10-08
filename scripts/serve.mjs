import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const base=resolve(process.env.SERVE_DIR||'.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(base,`.${pathname==='/'?'/index.html':pathname}`);
    if(!file.startsWith(base+sep)) {res.writeHead(403);res.end('Forbidden');return;}
    if (!types[extname(file)]) {res.writeHead(404);res.end('Not found');return;}
    const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)],'Cache-Control':'no-store'});res.end(body);
  }catch {res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`TicketLens local preview: http://127.0.0.1:${process.env.PORT||4173}`));
