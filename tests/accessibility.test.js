import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
function luminance(hex){const [r,g,b]=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;}
function ratio(a,b){const pair=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (pair[0]+.05)/(pair[1]+.05);}
const cases=[
 ['PASS label',/\.check-label\{[^}]*color:(#[\da-f]{6})/,'#ffffff',4.5],
 ['check detail',/\.check-text p\{[^}]*color:(#[\da-f]{6})/,'#ffffff',4.5],
 ['FAIL label',/\.check-item\.fail \.check-label\{[^}]*color:(#[\da-f]{6})/,'#ffffff',4.5],
 ['footer disclaimer',/\.footer-disclaimer\{[^}]*color:(#[\da-f]{6})/,'#f6f5f1',4.5],
 ['keyboard focus ring',/outline:3px solid (#[\da-f]{6})/,'#f6f5f1',3]
];
for(const [label,pattern,background,min] of cases)test(`${label} stylesheet color has sufficient contrast`,()=>{const color=css.match(pattern)?.[1];assert.ok(color,`Missing color for ${label}`);assert.ok(ratio(color,background)>=min,`${label}: ${ratio(color,background).toFixed(2)} < ${min}`);});
