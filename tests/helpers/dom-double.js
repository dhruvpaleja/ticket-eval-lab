// Minimal DOM surface for async state regression tests. This is not browser QA.
import {readFileSync} from 'node:fs';
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.events={};this.value='';this._text='';}
 append(...xs){this.children.push(...xs);} replaceChildren(...xs){this.children=xs;this._text='';}
 set textContent(v){this._text=String(v);this.children=[];} get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
 get childElementCount(){return this.children.length;} setAttribute(k,v){this[k]=v;} addEventListener(k,f){(this.events[k]??=[]).push(f);}
 querySelector(sel){return this.children.find(e=>e.className===sel.slice(1))||this.children.map(e=>e.querySelector(sel)).find(Boolean);}
 click(){for(const f of this.events.click||[])f({target:this});} remove(){}
}
export async function mountApp(key){
 const ids=Object.fromEntries([...readFileSync(new URL('../../index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 globalThis.document={getElementById:id=>ids[id],createElement:tag=>new Element(tag),body:new Element()};
 await import(`../../src/app.js?test=${key}`);
 return {ids,sendFile:(kind,text)=>ids[`${kind}-file`].events.change[0]({target:{files:[{size:0,text}],value:'sample'}})};
}
