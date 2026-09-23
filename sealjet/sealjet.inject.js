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

var $sealjetController;(()=>{var e={286(e,t,o){o.d(t,{I:()=>r});let r=Symbol.for("controller frame handle")},805(e,t,o){o.d(t,{C:()=>r});class r{methods;id;sendRaw;counter=0;promiseCallbacks=new Map;constructor(e,t,o){this.methods=e,this.id=t,this.sendRaw=o}recieve(e){if(null==e||"object"!=typeof e)return;let t=e[this.id];if(null==t||"object"!=typeof t)return;let o=t.$type;if("response"===o){let e=t.$token,o=t.$data,r=t.$error,i=this.promiseCallbacks.get(e);if(!i)return;this.promiseCallbacks.delete(e),void 0!==r?i.reject(Error(r)):i.resolve(o)}else if("request"===o){let e=t.$method,o=t.$args;this.methods[e](o).then(e=>{this.sendRaw({[this.id]:{$type:"response",$token:t.$token,$data:e?.[0]}},e?.[1])}).catch(e=>{console.error(e),this.sendRaw({[this.id]:{$type:"response",$token:t.$token,$error:e?.toString()||"Unknown error"}},[])})}}call(e,t,o=[]){let r=this.counter++;return new Promise((i,s)=>{this.promiseCallbacks.set(r,{resolve:i,reject:s}),this.sendRaw({[this.id]:{$type:"request",$method:e,$args:t,$token:r}},o)})}}},423(e,t,o){o.d(t,{Cx:()=>f,bw:()=>l,cP:()=>i,ht:()=>N,pX:()=>a});let{BareResponse:r,CookieJar:i,IncrementalHtmlRewriter:s,Plugin:n,SEALJETCLIENT:a,SEALJETCLIENTNAME:c,SealjetClient:l,SealjetFetchHandler:h,SealjetFetchTrackedClient:d,SealjetHeaders:p,Tap:f,createLocationProxy:k,defaultConfig:g,defaultConfigDev:y,flagEnabled:m,getOwnPropertyDescriptorHandler:u,getRewriter:w,getScriptBlockTypeString:b,htmlRules:$,isArchiveMimeType:v,isAudioOrVideoMimeType:C,isFontMimeType:S,isHtmlMimeType:j,isImageMimeType:M,isInlineDisplayableMimeType:x,isJavascriptMimeType:P,isJavascriptMimeTypeEssenceMatch:A,isModuleScriptType:R,isScriptType:W,isScriptableMimeType:E,isXmlMimeType:J,isZipBasedMimeType:I,isdedicated:T,isshared:D,issw:O,iswindow:q,isworker:H,parseMimeType:X,rewriteBlob:U,rewriteCss:B,rewriteHtml:L,rewriteJs:_,rewriteJsInner:F,rewriteSrcset:G,rewriteUrl:z,rewriteWorkers:K,setWasm:N,unrewriteBlob:Q,unrewriteCss:V,unrewriteHtml:Y,unrewriteUrl:Z,versionInfo:ee}=globalThis.$sealjet_}},t={};function o(r){var i=t[r];if(void 0!==i)return i.exports;var s=t[r]={exports:{}};return e[r](s,s.exports,o),s.exports}o.d=(e,t)=>{for(var r in t)o.o(t,r)&&!o.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},o.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),o.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var r={};(()=>{o.r(r),o.d(r,{load:()=>l});var e=o(805),t=o(286),i=o(423);let s=MessagePort.prototype.postMessage,n=(e,t,o)=>{s.call(e,t,o)};class a{port;readyResolve;readyPromise=new Promise(e=>{this.readyResolve=e});ready=!1;async init(){await this.readyPromise,this.ready=!0}rpc;constructor(t){this.port=t,this.rpc=new e.C({ready:async()=>{this.readyResolve()}},"transport",(e,o)=>{n(t,e,o)}),t.onmessageerror=e=>{console.error("onmessageerror (this should never happen!)",e)},t.onmessage=e=>{this.rpc.recieve(e.data)},t.start()}connect(e,t,o,r,i,s,a){let c=new MessageChannel,l=c.port1;return console.warn("connecting"),this.rpc.call("connect",{url:e.href,protocols:t,requestHeaders:o,port:c.port2},[c.port2]).then(e=>{console.log(e),"success"===e.result?r(e.protocol,e.extensions):a(e.error)}),l.onmessage=e=>{let t=e.data;"data"===t.type?i(t.data):"close"===t.type&&s(t.code,t.reason)},l.onmessageerror=e=>{console.error("onmessageerror (this should never happen!)",e),a("Message error in transport port")},[e=>{n(l,{type:"data",data:e},e instanceof ArrayBuffer?[e]:[])},e=>{n(l,{type:"close",code:e})}]}async request(e,t,o,r,i){return await this.rpc.call("request",{remote:e.href,method:t,body:o,headers:r})}async sendSetCookie(e,t={}){await this.rpc.call("sendSetCookie",{cookies:e.map(({url:e,cookie:t})=>({url:e.href,cookie:t})),options:t})}}let c=navigator.serviceWorker.controller;function l(e){if(i.pX in globalThis)return void globalThis[i.pX].syncDocumentInit({initHeaders:e.initHeaders,history:e.history,cookies:e.cookies});if(!("WASM"in self))throw Error("WASM not found in global scope!");let t=Uint8Array.from(atob(self.WASM),e=>e.charCodeAt(0));delete self.WASM,(0,i.ht)(t),new h(globalThis,e)}class h{global;init;client;cookieJar;transport;handleServiceWorkerCookieMessage;constructor(e,t){this.global=e,this.init=t;const o=new MessageChannel;this.transport=new a(o.port1),c?.postMessage({$sw$initRemoteTransport:{port:o.port2,prefix:this.init.prefix.href}},[o.port2]),this.cookieJar=new i.cP,this.cookieJar.load(this.init.cookies),this.handleServiceWorkerCookieMessage=e=>{if(!e.data?.$controller$setCookie||"object"!=typeof e.data.$controller$setCookie)return;let t=e.data.$controller$setCookie;if(t.options?.clear&&this.cookieJar.clear(),Array.isArray(t.cookies)){for(let e of t.cookies)if("string"==typeof e?.url&&"string"==typeof e.cookie)try{this.cookieJar.setCookies(e.cookie,new URL(e.url))}catch{console.error("Failed to set cookie",e)}}if("string"==typeof t.id){let e=navigator.serviceWorker?.controller??c;e?.postMessage({$sw$setCookieDone:{id:t.id}})}},navigator.serviceWorker?.addEventListener("message",this.handleServiceWorkerCookieMessage),this.injectSealjet()}injectSealjet(){let e=this.global.frameElement;e&&!e.name&&(window.name=e.name=`${Array(8).fill(0).map(()=>Math.floor(36*Math.random()).toString(36)).join("")}`);let o=e?.[t.I],r=!0;if(!o){r=!1;let e=this.global.window;for(;e.parent!==e;){let r=e[i.pX];if(!r){e=e.parent.window;continue}let s=r.descriptors.get("window.frameElement",e);if(s&&s[t.I]){o=s[t.I];break}e=e.parent.window}}let s={config:this.init.sjconfig,prefix:this.init.prefix,cookieJar:this.cookieJar,interface:{getInjectScripts:this.init.yieldGetInjectScripts(this.init.config,this.init.sjconfig,this.init.prefix,this.cookieJar,this.init.codecEncode,this.init.codecDecode),codecEncode:this.init.codecEncode,codecDecode:this.init.codecDecode}};this.client=new i.bw(this.global,{context:s,transport:this.transport,sendSetCookie:async(e,t)=>{await this.transport.sendSetCookie(e,t)},shouldBlockMessageEvent:()=>!1,hookSubcontext:e=>new h(e,{...this.init,cookies:this.cookieJar.dump()}).client,initHeaders:this.init.initHeaders,history:this.init.history});let n={window:this.global.window,client:this.client,isTopLevel:r};o&&i.Cx.dispatch(o.hooks.init.pre,n,{}),this.client.hook(),o&&i.Cx.dispatch(o.hooks.init.post,n,{})}}})(),$sealjetController=r})();
