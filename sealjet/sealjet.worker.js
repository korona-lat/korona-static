/*! Seal-branded distribution; upstream authorship and licenses: https://korona.lat/seal-notices.txt */
// Loaded before the proxy libraries capture MessagePort.postMessage. Older
// WebKit cannot transfer streams; ArrayBuffers work with both proxy protocols.
(() => {
  const marker = Symbol.for("korona.stream-transfer-compat");
  if (MessagePort.prototype[marker]) return;
  Object.defineProperty(MessagePort.prototype, marker, { value: true });

  // Firefox versions without Request.body still expose arrayBuffer(). Keep a
  // stable stream per request so the runtimes do not silently drop POST data.
  const requestStreams = "body" in Request.prototype;
  if (!requestStreams && typeof Window === "undefined") {
    const bodies = new WeakMap();
    const clone = Request.prototype.clone;
    const read = Request.prototype.arrayBuffer;
    Object.defineProperty(Request.prototype, "body", {
      configurable: true,
      get() {
        if (this.method === "GET" || this.method === "HEAD") return null;
        if (!bodies.has(this)) {
          const request = clone.call(this);
          bodies.set(this, new ReadableStream({
            async start(controller) {
              try {
                const body = await read.call(request);
                if (body.byteLength) controller.enqueue(new Uint8Array(body));
                controller.close();
              } catch (error) { controller.error(error); }
            },
          }));
        }
        return bodies.get(this);
      },
    });
  }

  const postMessage = MessagePort.prototype.postMessage;
  const channel = new MessageChannel();
  const stream = new ReadableStream({ start(controller) { controller.close(); } });
  let supported = false;
  try {
    postMessage.call(channel.port1, stream, [stream]);
    supported = true;
  } catch { /* Use transferable buffers on engines without stream transfer. */ }
  finally { channel.port1.close(); channel.port2.close(); }
  if (supported && requestStreams) return;

  function replaceStreams(value, buffers, seen = new Map()) {
    if (buffers.has(value)) return buffers.get(value);
    if (!value || typeof value !== "object") return value;
    if (seen.has(value)) return seen.get(value);
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return value;
    const copy = Array.isArray(value) ? [] : {};
    seen.set(value, copy);
    for (const key of Object.keys(value)) {
      Object.defineProperty(copy, key, { value: replaceStreams(value[key], buffers, seen), enumerable: true, writable: true, configurable: true });
    }
    return copy;
  }

  MessagePort.prototype.postMessage = function (message, options) {
    if (supported) {
      const request = message?.message?.type === "fetch" || (message && typeof message === "object" && Object.values(message).some((value) => value?.$type === "request" && value?.$method === "request"));
      if (!request) return postMessage.call(this, message, options);
    }
    const transfer = Array.isArray(options) ? options : options?.transfer || [];
    const streams = transfer.filter((item) => item instanceof ReadableStream);
    if (!streams.length) return postMessage.call(this, message, options);
    const port = this;
    Promise.all(streams.map((body) => new Response(body).arrayBuffer())).then((bodies) => {
      const buffers = new Map(streams.map((body, index) => [body, bodies[index]]));
      postMessage.call(port, replaceStreams(message, buffers), transfer.map((item) => buffers.get(item) || item));
    }).catch((error) => {
      console.error("[korona] Proxy body transfer failed:", error);
      // Preserve the error envelopes used by Seal Mux and the controller RPC.
      if (message && typeof message === "object" && message.type === "fetch") {
        postMessage.call(port, { type: "error", error });
      } else if (message?.port instanceof MessagePort) {
        postMessage.call(message.port, { type: "error", error });
      } else if (message && typeof message === "object") {
        for (const [id, payload] of Object.entries(message)) {
          if (!payload || !["request", "response"].includes(payload.$type)) continue;
          const failure = { [id]: { $type: "response", $token: payload.$token, $error: String(error) } };
          if (payload.$type === "response") postMessage.call(port, failure);
          else port.dispatchEvent(new MessageEvent("message", { data: failure }));
        }
      }
    });
  };
})();

var $sealjetController;(()=>{var e={805(e,t,r){r.d(t,{C:()=>o});class o{methods;id;sendRaw;counter=0;promiseCallbacks=new Map;constructor(e,t,r){this.methods=e,this.id=t,this.sendRaw=r}recieve(e){if(null==e||"object"!=typeof e)return;let t=e[this.id];if(null==t||"object"!=typeof t)return;let r=t.$type;if("response"===r){let e=t.$token,r=t.$data,o=t.$error,s=this.promiseCallbacks.get(e);if(!s)return;this.promiseCallbacks.delete(e),void 0!==o?s.reject(Error(o)):s.resolve(r)}else if("request"===r){let e=t.$method,r=t.$args;this.methods[e](r).then(e=>{this.sendRaw({[this.id]:{$type:"response",$token:t.$token,$data:e?.[0]}},e?.[1])}).catch(e=>{console.error(e),this.sendRaw({[this.id]:{$type:"response",$token:t.$token,$error:e?.toString()||"Unknown error"}},[])})}}call(e,t,r=[]){let o=this.counter++;return new Promise((s,i)=>{this.promiseCallbacks.set(o,{resolve:s,reject:i}),this.sendRaw({[this.id]:{$type:"request",$method:e,$args:t,$token:o}},r)})}}}},t={};function r(o){var s=t[o];if(void 0!==s)return s.exports;var i=t[o]={exports:{}};return e[o](i,i.exports,r),i.exports}r.d=(e,t)=>{for(var o in t)r.o(t,o)&&!r.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:t[o]})},r.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var o={};(()=>{r.r(o),r.d(o,{route:()=>a,shouldRoute:()=>n});var e=r(805);let t={};addEventListener("message",e=>{if(e.data&&"object"==typeof e.data){if(e.data.$sw$setCookieDone&&"object"==typeof e.data.$sw$setCookieDone){let r=e.data.$sw$setCookieDone,o=t[r.id];o&&(o(),delete t[r.id])}if(e.data.$sw$initRemoteTransport&&"object"==typeof e.data.$sw$initRemoteTransport){let{port:t,prefix:r}=e.data.$sw$initRemoteTransport,o=i.find(e=>new URL(r).pathname.startsWith(e.prefix));if(!o)return void console.error("No relevant controller found for transport init");o.rpc.call("initRemoteTransport",t,[t])}}});class s{prefix;id;rpc;constructor(r,o,s){this.prefix=r,this.id=o,this.rpc=new e.C({sendSetCookie:async({cookies:e,options:r})=>{let o=await self.clients.matchAll(),s=[],i=[],n=r?.destination==="document"||r?.destination==="iframe";for(let a of o){let o=Math.random().toString(36).substring(2,10);s.push(o),a.postMessage({$controller$setCookie:{cookies:e,options:r,id:o}}),n||i.push(new Promise(e=>{t[o]=()=>e(o)}))}if(i.length>0){let r,n=!1,a=new Promise(i=>{r=setTimeout(()=>{if(!n){let r=s.filter(e=>void 0!==t[e]);console.error(`timed out waiting for set cookie response (deadlock?): cookies=${e.length} clients=${o.length} pending=${r.length}/${s.length} clientUrls=${o.map(e=>e.url).join(",")}`)}i()},1e3)});try{await Promise.race([a,Promise.any(i).then(()=>{n=!0}).catch(()=>{})])}finally{for(let e of(void 0!==r&&clearTimeout(r),s))delete t[e]}}}},"tabchannel-"+o,(e,t)=>{s.postMessage(e,t)}),s.onmessage=e=>{this.rpc.recieve(e.data)},s.onmessageerror=console.error,this.rpc.call("ready",void 0)}}let i=[];function n(e){let t=new URL(e.request.url);return void 0!==i.find(e=>t.pathname.startsWith(e.prefix))}async function a(e){try{let t=new URL(e.request.url),r=i.find(e=>t.pathname.startsWith(e.prefix)),o=await clients.get(e.clientId),s=[...e.request.headers],n=await r.rpc.call("request",{rawUrl:e.request.url,rawReferrer:e.request.referrer,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,method:e.request.method,body:e.request.body,cache:e.request.cache,forceCrossOriginIsolated:!1,initialHeaders:s,rawClientUrl:o?o.url:void 0,clientId:e.clientId||e.resultingClientId},e.request.body instanceof ReadableStream||e.request.body instanceof ArrayBuffer?[e.request.body]:void 0);return new Response(n.body,{status:n.status,statusText:n.statusText,headers:n.headers})}catch(e){return console.error("Service Worker error:",e),new Response("Internal Service Worker Error: "+e.message,{status:500})}}addEventListener("message",e=>{if(!e.data||"object"!=typeof e.data||!e.data.$controller$init||"object"!=typeof e.data.$controller$init)return;let t=e.data.$controller$init,r=i.findIndex(e=>e.id===t.id);-1!==r&&i.splice(r,1),i.push(new s(t.prefix,t.id,e.ports[0]))}),addEventListener("install",()=>{self.skipWaiting()}),addEventListener("activate",e=>{e.waitUntil(clients.claim())}),setTimeout(async()=>{for(let e of(console.log("service worker activated, notifying clients to revive"),await clients.matchAll()))e.postMessage({$controller$swrevive:{}})},100)})(),$sealjetController=o})();
