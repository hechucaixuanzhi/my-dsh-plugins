/** Official embedded Conversation, with an isolated per-side transport. */
window.__ModuleLoader__.load({
  id: "@dsh-local/session-panel",
  factory: (require) => {
    var React = require("react"), h = React.createElement;
    var RemoteStreamCarrierError = require("@deepseek-ai/dsh-api-gateway/client").RemoteStreamCarrierError;
    var ID = "@dsh-local/session-panel", CONTENT = "session-panel.conversation";
    var CSS = `
.sp-panel{position:relative;display:flex;flex-direction:column;min-width:0;min-height:0;width:100%;height:100%;overflow:hidden;color:var(--dsw-alias-label-primary)}
.sp-panel>[data-conversation-content]{flex:1;min-height:0}
.sp-panel [data-composer-seat]{margin-top:auto}
.sp-panel [data-conversation-scroll]{overscroll-behavior:contain}
.sp-status{margin:auto;padding:16px;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
.sp-error{color:var(--dsw-alias-state-error-primary)}
.sp-connection{display:flex;flex:none;align-items:center;gap:8px;padding:8px 12px;background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.sp-connection>span{flex:1;min-width:0;overflow-wrap:anywhere}
.sp-connection button{flex:none;color:inherit;font:inherit}
.sp-authorize{display:flex;align-items:center;gap:6px;padding:6px 12px;color:var(--dsw-alias-label-secondary);font-size:12px}
`;
    async function post(action, body, signal) {
      var response = await fetch("/api/session-panel/" + action, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: signal });
      if (!response.ok) throw new Error("侧边会话连接失败（" + response.status + "）");
      var result = await response.json();
      if (!result.ok) { var failure = new Error(result.error.message); failure.remoteError = result.error; throw failure; }
      return result.value;
    }
    // Adapt only this Session's transport. The root Remote, main Session and
    // official module files remain untouched; rc.2's full state machines stay.
    function sideRemote(original, mainId, sideId, onStatus) {
      var recovering = false, reopenDelay = 250;
      function report(phase, message) { onStatus?.({ phase: phase, message: message }); }
      function wait(ms, signal) {
        signal.throwIfAborted();
        return new Promise(function (resolve, reject) {
          var timer = setTimeout(function () { signal.removeEventListener("abort", cancel); resolve(); }, ms);
          function cancel() { clearTimeout(timer); signal.removeEventListener("abort", cancel); reject(signal.reason); }
          signal.addEventListener("abort", cancel, { once: true });
        });
      }
      function check(request) { if ((request.address?.sessionId || request.sessionId) !== sideId) throw new Error("侧聊请求越界"); }
      function unary(operation) {
        return async function (request, signal) {
          try {
            check(request);
            return { ok: true, value: await post("native", { mainSessionId: mainId, operation: operation, request: request }, signal) };
          } catch (error) { return { ok: false, error: error.remoteError || { code: "session-panel/failed", message: String(error.message || error) } }; }
        };
      }
      async function* follow(request, signal) {
        check(request);
        var reader, began = Date.now();
        try {
          signal.throwIfAborted();
          if (recovering) await wait(reopenDelay, signal);
          // Only this read-only subscription is retried. Never retry prompt,
          // command, attachment or queue writes, or reconnect the global Remote.
          var response;
          for (var attempt = 0; attempt < 3; attempt++) {
            try {
              response = await fetch("/api/session-panel/native", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mainSessionId: mainId, operation: "follow", request: request }), signal: signal });
            } catch (error) {
              if (signal.aborted) throw error;
              if (attempt === 2) throw new Error("侧聊网络连接失败，请稍后重新连接", { cause: error });
              report("reconnecting"); await wait(250 * (attempt + 1), signal); continue;
            }
            if (response.ok) break;
            var retryable = response.status === 408 || response.status === 429 || response.status >= 500;
            await response.body?.cancel().catch(function () {});
            if (!retryable || attempt === 2) throw new Error("侧聊历史连接失败（" + response.status + "）");
            report("reconnecting"); await wait(250 * (attempt + 1), signal);
          }
          if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
            var failed = await response.json(); throw new Error(failed.error?.message || "侧聊历史不可用");
          }
          if (!response.body) throw new Error("侧聊历史响应没有事件流");
          reader = response.body.getReader();
          var decoder = new TextDecoder(), pending = "";
          while (true) {
            var chunk;
            try { chunk = await reader.read(); }
            catch (error) { throw new RemoteStreamCarrierError("侧聊事件连接中断", { cause: error }); }
            pending += decoder.decode(chunk.value, { stream: !chunk.done });
            var newline;
            while ((newline = pending.indexOf("\n")) !== -1) {
              var line = pending.slice(0, newline); pending = pending.slice(newline + 1);
              if (!line) continue;
              var frame = JSON.parse(line); if (frame.type === "side-error") throw new Error(frame.message);
              yield frame;
              // The official consumer validates and accepts the opening window
              // before asking for another frame. Let it own catch-up and dedupe.
              if (frame.type === "snapshot") { recovering = false; report("connected"); }
            }
            if (chunk.done) throw new RemoteStreamCarrierError(pending.trim() ? "侧聊事件流被截断" : "侧聊事件连接提前结束");
          }
        } catch (error) {
          if (!signal.aborted) {
            if (error instanceof RemoteStreamCarrierError) {
              recovering = true;
              reopenDelay = Date.now() - began >= 10000 ? 250 : Math.min(reopenDelay * 2, 4000);
              report("reconnecting");
            } else report("error", String(error.message || error));
          }
          throw error;
        } finally { if (reader) { await reader.cancel().catch(function () {}); reader.releaseLock(); } }
      }
      var adapted = {
        follow: follow, page: unary("page"), prompt: unary("prompt"), cancel: unary("cancel"), attachment: unary("attachment"), updateQueue: unary("updateQueue"), selectModel: unary("selectModel")
      };
      var sessionRemote = new Proxy(adapted, { get: function (target, key) { return Object.hasOwn(target, key) ? target[key] : original.session[key]; } });
      var commandRemote = {
        execute: async function (id, line, attachments) {
          return unary("commandExecute")({ sessionId: id, line: line, attachments: attachments });
        },
        list: async function (id) { return unary("commandList")({ sessionId: id }); }
      };
      return new Proxy({ session: sessionRemote, commands: commandRemote }, { get: function (target, key) { return Object.hasOwn(target, key) ? target[key] : original[key]; } });
    }
    function FixedChatView(props) { return props.renderSlot("conversation.session", { view: "chat" }); }
    function OfficialConversation(props) {
      var snapshot = props.useSession(function (value) { return value; });
      return props.renderFactorySlot("conversation.content", { variant: "embedded", hero: false, phase: snapshot.openState === "loading" ? "settling" : "active" }, { slots: { views: FixedChatView } });
    }
    // rc.2's command UI uses one shared catalog and executor, unlike the
    // per-Session chat transport. Route only our registered side IDs; all
    // ordinary sessions keep the original functions and unload restores them.
    function sideCommands(ctx) {
      var service = ctx.commandUi, directory = service.directory, bindings = new Map(), uploader = ctx.fileUpload;
      if (!directory?.fetchCommands || !service.execute || !uploader?.upload) throw new Error("官方指令或附件接口不匹配");
      var fetchCommands = directory.fetchCommands, execute = service.execute;
      var upload = uploader.upload;
      var uploadSide = function (id, data, name, signal, onProgress) {
        var main = bindings.get(id);
        if (!main) return upload.call(uploader, id, data, name, signal, onProgress);
        var facade = { post: function (request) {
          var query = new URL(request.path, document.baseURI).searchParams;
          if (query.get("sessionId") !== id) throw new Error("侧聊附件请求越界");
          query.set("mainSessionId", main);
          return uploader.post(Object.assign({}, request, { path: "api/session-panel/uploadFile?" + query.toString() }));
        } };
        return upload.call(facade, id, data instanceof Uint8Array ? new Blob([data]) : data, name, signal, onProgress);
      };
      var fetchSide = async function (id) {
        var main = bindings.get(id);
        return main ? post("native", { mainSessionId: main, operation: "commandList", request: { sessionId: id } }) : fetchCommands.call(directory, id);
      };
      var executeSide = function (session, line, attachments) {
        var main = bindings.get(session.sessionId);
        if (!main) return execute.call(service, session, line, attachments);
        // Reuse the official transaction (notifications, admission and draft
        // handling) with just its command RPC exchanged for this owned side.
        var facade = {
          ctx: { remote: { commands: { execute: async function (id, text, files) {
            try { return { ok: true, value: await post("native", { mainSessionId: main, operation: "commandExecute", request: { sessionId: id, line: text, attachments: files } }) }; }
            catch (error) { return { ok: false, error: error.remoteError || { code: "session-panel/command", message: String(error.message || error) } }; }
          } } } },
          notifyExecuted: service.notifyExecuted.bind(service)
        };
        return execute.call(facade, session, line, attachments);
      };
      directory.fetchCommands = fetchSide; service.execute = executeSide; uploader.upload = uploadSide;
      return {
        bind: function (side, main) { bindings.set(side, main); directory.resetSession(side); return function () { if (bindings.get(side) === main) bindings.delete(side); }; },
        dispose: function () {
          bindings.clear();
          if (directory.fetchCommands === fetchSide) directory.fetchCommands = fetchCommands;
          if (service.execute === executeSide) service.execute = execute;
          if (uploader.upload === uploadSide) uploader.upload = upload;
        }
      };
    }
    function makeSidePanel(ctx, commands) {
      return function SidePanel(props) {
        var tab = props.useTabInfo().tab, mainId = props.sessionId;
        var ready = React.useState(null), reference = ready[0], setReference = ready[1];
        var failure = React.useState(null), error = failure[0], setError = failure[1];
        var status = React.useState(null), state = status[0], setState = status[1];
        var attempt = React.useState(0), retry = attempt[0], setRetry = attempt[1];
        var activation = React.useState(tab.visible), activated = activation[0], setActivated = activation[1];
        var connectionState = React.useState(null), connection = connectionState[0], setConnection = connectionState[1];
        React.useEffect(function () { if (tab.visible) setActivated(true); }, [tab.visible]);
        React.useEffect(function () {
          if (!mainId || !activated) return;
          var abort = new AbortController(), retained, originalRemote, adaptedRemote, session, directory, originalModels, unbind, stopObserving, resyncing = false, live = true;
          function reportConnection(value) { if (live && !abort.signal.aborted) setConnection(Object.assign({}, value, { reconnect: reconnect })); }
          async function reconnect() {
            if (!live || abort.signal.aborted || resyncing || !session || session.remote !== adaptedRemote) return;
            resyncing = true; reportConnection({ phase: "reconnecting" });
            try { await session.resync(); }
            catch (error) { reportConnection({ phase: "error", message: String(error.message || error) }); }
            finally { resyncing = false; }
          }
          setError(null); setConnection(null);
          (async function () {
            var initial = await post("state", { mainSessionId: mainId }, abort.signal);
            if (!live) return; setState(initial);
            await ctx.sessions.refresh(); if (!live) return;
            // Explicitly version-pinned Controller members; fail closed on drift.
            if (!ctx.sessions.manager?.get) throw new Error("官方 Session Controller 接口不匹配");
            session = ctx.sessions.manager.get(initial.sideSessionId);
            if (session.sessionId !== initial.sideSessionId || session.address !== undefined) throw new Error("侧聊 Session 身份不匹配");
            originalRemote = session.remote;
            adaptedRemote = sideRemote(originalRemote, mainId, initial.sideSessionId, reportConnection);
            session.remote = adaptedRemote;
            // Protocol/official-consumer failures do not pass through the fetch
            // adapter. Observe this Session as well so none fail silently.
            stopObserving = session.subscribe?.(function () {
              if (!live || session.remote !== adaptedRemote) return;
              var snapshot = session.getSnapshot();
              if (snapshot.openState === "error") reportConnection({ phase: "error", message: snapshot.openError?.message || "侧聊历史连接不可用" });
            });
            unbind = commands.bind(initial.sideSessionId, mainId);
            retained = ctx.sessions.retain(initial.sideSessionId, { source: "sidebarChat", signal: abort.signal });
            directory = ctx.modelDirectories.directoryFor(initial.sideSessionId);
            originalModels = directory.sessions; directory.sessions = session.remote.session;
            await retained.ready;
            if (live) setReference(retained);
          })().catch(function (e) { if (live && !abort.signal.aborted) setError(String(e.message || e)); });
          return function () {
            live = false; stopObserving?.(); abort.abort(); setReference(null); setState(null); setConnection(null);
            retained?.release();
            unbind?.();
            // Unmount may precede either await above. Two missing values compare
            // equal, so optional chaining alone is not a safe ownership check.
            if (directory && adaptedRemote && directory.sessions === adaptedRemote.session) directory.sessions = originalModels;
            if (session && adaptedRemote && session.remote === adaptedRemote) session.remote = originalRemote;
          };
        }, [mainId, activated, retry]);
        React.useEffect(function () {
          if (!reference || !tab.visible) return;
          var abort = new AbortController();
          var timer = setInterval(function () { post("state", { mainSessionId: mainId }, abort.signal).then(setState).catch(function () {}); }, 5000);
          return function () { clearInterval(timer); abort.abort(); };
        }, [mainId, reference, tab.visible]);
        return h("div", { className: "sp-panel", "data-main-session": mainId, "data-side-session": reference?.sessionId },
          !mainId ? h("div", { className: "sp-status" }, "请先打开一个主对话") : null,
          error ? h("div", { className: "sp-status sp-error", role: "alert" }, error, " ", h("button", { type: "button", onClick: function () { setRetry(retry + 1); } }, "重试")) : null,
          mainId && !reference && !error ? h("div", { className: "sp-status" }, "正在连接侧边会话…") : null,
          reference && connection && connection.phase !== "connected" ? h("div", { className: "sp-connection", role: connection.phase === "error" ? "alert" : "status", "aria-live": "polite" },
            h("span", {}, connection.phase === "error" ? "侧聊连接已中断，回复可能暂未显示。" + (connection.message || "") : "正在重新连接侧聊并补读漏掉的回复…"),
            connection.phase === "error" ? h("button", { type: "button", onClick: connection.reconnect }, "重新连接") : null) : null,
          reference ? h(props.SessionProvider, { session: reference }, props.renderSlot(CONTENT, {})) : null,
          reference && state?.main?.activity?.running ? h("label", { className: "sp-authorize" },
            h("input", { type: "checkbox", checked: state.conflictAuthorized, onChange: function (event) {
              var authorized = event.target.checked;
              post("authorization", { mainSessionId: mainId, authorize: authorized }).then(function () { setState(Object.assign({}, state, { conflictAuthorized: authorized })); }).catch(function (e) { setError(String(e.message || e)); });
            } }), "授权当前侧边任务执行可能与主对话冲突的操作") : null
        );
      };
    }
    function apply(ctx) {
      var commands = sideCommands(ctx);
      ctx.effect(function () { return function () { commands.dispose(); }; }, "session-panel: scoped official command transport");
      ctx.effect(function () { return ctx.sidebarRightTabs.register({ id: ID, kind: "session-panel", keepMounted: true, title: function () { return "侧边会话"; }, guide: [{ id: "open", order: 45, title: function () { return "侧边会话"; }, description: function () { return "打开当前主对话专属的侧边 Agent"; } }] }); }, "session-panel: official sidebar entry");
      ctx.effect(function () { return ctx.slots.inject("sidebar.right.pane.tab", function () { return ctx.slots.register({ name: "sidebar.right.pane.tab", key: ID, children: { [CONTENT]: { kind: "single", scope: "session" } } }, makeSidePanel(ctx, commands)); }); }, "session-panel: sidebar body");
      ctx.effect(function () { return ctx.slots.inject(CONTENT, function () { return ctx.slots.register({ name: CONTENT }, OfficialConversation); }); }, "session-panel: official embedded conversation");
      ctx.effect(function () { var style = document.createElement("style"); style.setAttribute("data-dsh-session-panel", ""); style.textContent = CSS; document.head.appendChild(style); return function () { style.remove(); }; }, "session-panel: layout only");
    }
    return { apply: apply, inject: ["slots", "sidebarRightTabs", "sessions", "uiSession", "uiConversation", "modelDirectories", "commandUi", "fileUpload", "remote", "remote.session"] };
  }
});
