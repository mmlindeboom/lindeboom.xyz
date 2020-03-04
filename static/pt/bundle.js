
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function claim_element(nodes, name, attributes, svg) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeName === name) {
                let j = 0;
                while (j < node.attributes.length) {
                    const attribute = node.attributes[j];
                    if (attributes[attribute.name]) {
                        j++;
                    }
                    else {
                        node.removeAttribute(attribute.name);
                    }
                }
                return nodes.splice(i, 1)[0];
            }
        }
        return svg ? svg_element(name) : element(name);
    }
    function claim_text(nodes, data) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 3) {
                node.data = '' + data;
                return nodes.splice(i, 1)[0];
            }
        }
        return text(data);
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Tailwindcss.svelte generated by Svelte v3.19.1 */

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Tailwindcss extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tailwindcss",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/responsive/ShowWhen.svelte generated by Svelte v3.19.1 */

    const file = "src/responsive/ShowWhen.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			if (default_slot) default_slot.l(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", div_class_value = "block " + /*variantClass*/ ctx[1](/*screen*/ ctx[0]));
    			add_location(div, file, 21, 0, 423);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
    			}

    			if (!current || dirty & /*screen*/ 1 && div_class_value !== (div_class_value = "block " + /*variantClass*/ ctx[1](/*screen*/ ctx[0]))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { screen } = $$props;

    	const variantClass = size => {
    		let className = "";

    		switch (size) {
    			case "mobile":
    				className = "mobile:block tablet:hidden laptop:hidden";
    				break;
    			case "tablet":
    				className = "mobile:hidden tablet:block laptop:hidden";
    				break;
    			default:
    				className = "mobile:hidden tablet:hidden laptop:block";
    		}

    		return className;
    	};

    	const writable_props = ["screen"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ShowWhen> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("screen" in $$props) $$invalidate(0, screen = $$props.screen);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ screen, variantClass });

    	$$self.$inject_state = $$props => {
    		if ("screen" in $$props) $$invalidate(0, screen = $$props.screen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [screen, variantClass, $$scope, $$slots];
    }

    class ShowWhen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$1, safe_not_equal, { screen: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ShowWhen",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*screen*/ ctx[0] === undefined && !("screen" in props)) {
    			console.warn("<ShowWhen> was created without expected prop 'screen'");
    		}
    	}

    	get screen() {
    		throw new Error("<ShowWhen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set screen(value) {
    		throw new Error("<ShowWhen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Filters.svelte generated by Svelte v3.19.1 */
    const file$1 = "src/Filters.svelte";

    function create_fragment$2(ctx) {
    	let div4;
    	let ul;
    	let li0;
    	let div0;
    	let label0;
    	let t0;
    	let input0;
    	let t1;
    	let li1;
    	let div1;
    	let label1;
    	let t2;
    	let input1;
    	let t3;
    	let li2;
    	let div2;
    	let label2;
    	let t4;
    	let input2;
    	let t5;
    	let li3;
    	let div3;
    	let label3;
    	let t6;
    	let input3;
    	let t7;
    	let li4;
    	let button;
    	let t8;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			div0 = element("div");
    			label0 = element("label");
    			t0 = text("Alkali Metals\n        ");
    			input0 = element("input");
    			t1 = space();
    			li1 = element("li");
    			div1 = element("div");
    			label1 = element("label");
    			t2 = text("Alkaline Earth Metals\n          ");
    			input1 = element("input");
    			t3 = space();
    			li2 = element("li");
    			div2 = element("div");
    			label2 = element("label");
    			t4 = text("Transition Metals\n        ");
    			input2 = element("input");
    			t5 = space();
    			li3 = element("li");
    			div3 = element("div");
    			label3 = element("label");
    			t6 = text("Noble Gases\n        ");
    			input3 = element("input");
    			t7 = space();
    			li4 = element("li");
    			button = element("button");
    			t8 = text("Clear Filters");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div4 = claim_element(nodes, "DIV", { class: true });
    			var div4_nodes = children(div4);
    			ul = claim_element(div4_nodes, "UL", { class: true });
    			var ul_nodes = children(ul);
    			li0 = claim_element(ul_nodes, "LI", { class: true });
    			var li0_nodes = children(li0);
    			div0 = claim_element(li0_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			label0 = claim_element(div0_nodes, "LABEL", { class: true });
    			var label0_nodes = children(label0);
    			t0 = claim_text(label0_nodes, "Alkali Metals\n        ");
    			input0 = claim_element(label0_nodes, "INPUT", { class: true, type: true });
    			label0_nodes.forEach(detach_dev);
    			div0_nodes.forEach(detach_dev);
    			li0_nodes.forEach(detach_dev);
    			t1 = claim_space(ul_nodes);
    			li1 = claim_element(ul_nodes, "LI", { class: true });
    			var li1_nodes = children(li1);
    			div1 = claim_element(li1_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			label1 = claim_element(div1_nodes, "LABEL", { class: true });
    			var label1_nodes = children(label1);
    			t2 = claim_text(label1_nodes, "Alkaline Earth Metals\n          ");
    			input1 = claim_element(label1_nodes, "INPUT", { type: true, class: true });
    			label1_nodes.forEach(detach_dev);
    			div1_nodes.forEach(detach_dev);
    			li1_nodes.forEach(detach_dev);
    			t3 = claim_space(ul_nodes);
    			li2 = claim_element(ul_nodes, "LI", { class: true });
    			var li2_nodes = children(li2);
    			div2 = claim_element(li2_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			label2 = claim_element(div2_nodes, "LABEL", { class: true });
    			var label2_nodes = children(label2);
    			t4 = claim_text(label2_nodes, "Transition Metals\n        ");
    			input2 = claim_element(label2_nodes, "INPUT", { type: true, class: true });
    			label2_nodes.forEach(detach_dev);
    			div2_nodes.forEach(detach_dev);
    			li2_nodes.forEach(detach_dev);
    			t5 = claim_space(ul_nodes);
    			li3 = claim_element(ul_nodes, "LI", { class: true });
    			var li3_nodes = children(li3);
    			div3 = claim_element(li3_nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			label3 = claim_element(div3_nodes, "LABEL", { class: true });
    			var label3_nodes = children(label3);
    			t6 = claim_text(label3_nodes, "Noble Gases\n        ");
    			input3 = claim_element(label3_nodes, "INPUT", { type: true, class: true });
    			label3_nodes.forEach(detach_dev);
    			div3_nodes.forEach(detach_dev);
    			li3_nodes.forEach(detach_dev);
    			t7 = claim_space(ul_nodes);
    			li4 = claim_element(ul_nodes, "LI", {});
    			var li4_nodes = children(li4);
    			button = claim_element(li4_nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			t8 = claim_text(button_nodes, "Clear Filters");
    			button_nodes.forEach(detach_dev);
    			li4_nodes.forEach(detach_dev);
    			ul_nodes.forEach(detach_dev);
    			div4_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(input0, "class", "hidden");
    			attr_dev(input0, "type", "checkbox");
    			add_location(input0, file$1, 133, 8, 3282);
    			attr_dev(label0, "class", "p-1 leading-8 svelte-1v4artm");
    			add_location(label0, file$1, 131, 8, 3220);
    			attr_dev(div0, "class", "border border-blue-500 rounded svelte-1v4artm");
    			toggle_class(div0, "active", /*amIsFiltered*/ ctx[1]);
    			add_location(div0, file$1, 130, 6, 3139);
    			attr_dev(li0, "class", "mr-2 flex-initial");
    			add_location(li0, file$1, 129, 4, 3102);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "hidden");
    			add_location(input1, file$1, 141, 10, 3651);
    			attr_dev(label1, "class", "p-1 leading-8 svelte-1v4artm");
    			add_location(label1, file$1, 139, 8, 3579);
    			attr_dev(div1, "class", "border border-blue-500 rounded svelte-1v4artm");
    			toggle_class(div1, "active", /*aemIsFiltered*/ ctx[3]);
    			add_location(div1, file$1, 138, 6, 3497);
    			attr_dev(li1, "class", "mr-2 flex-initial");
    			add_location(li1, file$1, 137, 4, 3460);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "hidden");
    			add_location(input2, file$1, 149, 8, 4014);
    			attr_dev(label2, "class", "p-1 leading-8 svelte-1v4artm");
    			add_location(label2, file$1, 147, 8, 3950);
    			attr_dev(div2, "class", "border border-blue-500 rounded svelte-1v4artm");
    			toggle_class(div2, "active", /*tmIsFiltered*/ ctx[5]);
    			add_location(div2, file$1, 146, 6, 3869);
    			attr_dev(li2, "class", "mr-2 flex-initial");
    			add_location(li2, file$1, 145, 4, 3832);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "hidden");
    			add_location(input3, file$1, 157, 8, 4378);
    			attr_dev(label3, "class", "p-1 leading-8 svelte-1v4artm");
    			add_location(label3, file$1, 155, 10, 4320);
    			attr_dev(div3, "class", "border border-blue-500 rounded svelte-1v4artm");
    			toggle_class(div3, "active", /*nbIsFiltered*/ ctx[7]);
    			add_location(div3, file$1, 154, 9, 4237);
    			attr_dev(li3, "class", "mr-2 flex-initial");
    			add_location(li3, file$1, 153, 4, 4197);
    			attr_dev(button, "class", "pl-2 svelte-1v4artm");
    			add_location(button, file$1, 162, 6, 4566);
    			add_location(li4, file$1, 161, 4, 4555);
    			attr_dev(ul, "class", "flex leading-8");
    			add_location(ul, file$1, 128, 2, 3070);
    			attr_dev(div4, "class", "filters text-sm my-4 svelte-1v4artm");
    			add_location(div4, file$1, 127, 0, 3033);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, ul);
    			append_dev(ul, li0);
    			append_dev(li0, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t0);
    			append_dev(label0, input0);
    			input0.checked = /*amIsFiltered*/ ctx[1];
    			/*input0_binding*/ ctx[23](input0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, div1);
    			append_dev(div1, label1);
    			append_dev(label1, t2);
    			append_dev(label1, input1);
    			input1.checked = /*aemIsFiltered*/ ctx[3];
    			/*input1_binding*/ ctx[26](input1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, div2);
    			append_dev(div2, label2);
    			append_dev(label2, t4);
    			append_dev(label2, input2);
    			/*input2_binding*/ ctx[28](input2);
    			input2.checked = /*tmIsFiltered*/ ctx[5];
    			append_dev(ul, t5);
    			append_dev(ul, li3);
    			append_dev(li3, div3);
    			append_dev(div3, label3);
    			append_dev(label3, t6);
    			append_dev(label3, input3);
    			/*input3_binding*/ ctx[31](input3);
    			input3.checked = /*nbIsFiltered*/ ctx[7];
    			append_dev(ul, t7);
    			append_dev(ul, li4);
    			append_dev(li4, button);
    			append_dev(button, t8);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_handler*/ ctx[22]),
    				listen_dev(input0, "change", /*change_handler*/ ctx[24], false, false, false),
    				listen_dev(input1, "change", /*input1_change_handler*/ ctx[25]),
    				listen_dev(input1, "change", /*change_handler_1*/ ctx[27], false, false, false),
    				listen_dev(input2, "change", /*input2_change_handler*/ ctx[29]),
    				listen_dev(input2, "change", /*change_handler_2*/ ctx[30], false, false, false),
    				listen_dev(input3, "change", /*input3_change_handler*/ ctx[32]),
    				listen_dev(input3, "change", /*change_handler_3*/ ctx[33], false, false, false),
    				listen_dev(button, "click", /*click_handler*/ ctx[34], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*amIsFiltered*/ 2) {
    				input0.checked = /*amIsFiltered*/ ctx[1];
    			}

    			if (dirty[0] & /*amIsFiltered*/ 2) {
    				toggle_class(div0, "active", /*amIsFiltered*/ ctx[1]);
    			}

    			if (dirty[0] & /*aemIsFiltered*/ 8) {
    				input1.checked = /*aemIsFiltered*/ ctx[3];
    			}

    			if (dirty[0] & /*aemIsFiltered*/ 8) {
    				toggle_class(div1, "active", /*aemIsFiltered*/ ctx[3]);
    			}

    			if (dirty[0] & /*tmIsFiltered*/ 32) {
    				input2.checked = /*tmIsFiltered*/ ctx[5];
    			}

    			if (dirty[0] & /*tmIsFiltered*/ 32) {
    				toggle_class(div2, "active", /*tmIsFiltered*/ ctx[5]);
    			}

    			if (dirty[0] & /*nbIsFiltered*/ 128) {
    				input3.checked = /*nbIsFiltered*/ ctx[7];
    			}

    			if (dirty[0] & /*nbIsFiltered*/ 128) {
    				toggle_class(div3, "active", /*nbIsFiltered*/ ctx[7]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			/*input0_binding*/ ctx[23](null);
    			/*input1_binding*/ ctx[26](null);
    			/*input2_binding*/ ctx[28](null);
    			/*input3_binding*/ ctx[31](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const NOBLE_GASES = [2, 10, 18, 36, 54, 86];
    	const ALKALI_METALS = [3, 11, 19, 37, 55, 87];
    	const EARTH_METALS = [4, 12, 20, 38, 56, 88];

    	const TRANSITION_METALS = [
    		21,
    		22,
    		23,
    		24,
    		25,
    		26,
    		27,
    		28,
    		29,
    		30,
    		39,
    		40,
    		41,
    		42,
    		43,
    		44,
    		45,
    		46,
    		47,
    		48,
    		72,
    		73,
    		74,
    		75,
    		76,
    		77,
    		78,
    		79,
    		80,
    		104,
    		105,
    		106,
    		107,
    		108,
    		109,
    		110,
    		111,
    		112
    	];

    	const availableFilters = {
    		ALKALI_METALS,
    		EARTH_METALS,
    		NOBLE_GASES,
    		TRANSITION_METALS
    	};

    	let activeFiltersIds = [];

    	const toggleActiveFilter = filter => {
    		if (!filter) {
    			resetFilters();
    			handleFilter();
    			return;
    		}

    		if (activeFiltersIds.includes(filter)) {
    			activeFiltersIds.splice(activeFiltersIds.indexOf(filter), 1);
    		} else {
    			activeFiltersIds.push(filter);
    		}

    		handleFilter();
    	};

    	const dispatchFilter = filter => {
    		switch (filter) {
    			case "ALKALI_METALS":
    				toggleActiveFilter("ALKALI_METALS");
    				break;
    			case "EARTH_METALS":
    				toggleActiveFilter("EARTH_METALS");
    				break;
    			case "NOBLE_GASES":
    				toggleActiveFilter("NOBLE_GASES");
    				break;
    			case "TRANSITION_METALS":
    				toggleActiveFilter("TRANSITION_METALS");
    				break;
    			default:
    				toggleActiveFilter();
    		}
    	};

    	const handleFilter = () => {
    		const filteredList = activeFiltersIds.reduce(
    			(list, filter) => {
    				return list.concat(availableFilters[filter]);
    			},
    			[]
    		);

    		if (filteredList.length < 1) return filterRows(allRows);
    		const deepClone = JSON.parse(JSON.stringify(allRows));

    		const newRows = deepClone.map(row => {
    			if (!row) return;

    			row.map(el => {
    				if (!filteredList.includes(el.id)) {
    					el.inactive = true;
    				} else {
    					el.inactive = false;
    				}

    				return el;
    			});

    			return row;
    		});

    		filterRows(newRows);
    	}; // rows = [ChemElementData.filter((el) => {
    	//   if (el.name === "Dummy" || el.symbol === "D") return false
    	//   return gases.includes(el.id)
    	// })]

    	const resetFilters = () => {
    		filterStates.forEach(state => {
    			const [filter, active] = state;

    			if (active) {
    				filter.click();
    			}
    		});
    	};

    	let { filterRows } = $$props;
    	let { filtered } = $$props;
    	let { allRows } = $$props;
    	let AM;
    	let amIsFiltered = false;
    	let AEM;
    	let aemIsFiltered = false;
    	let TM;
    	let tmIsFiltered = false;
    	let NB;
    	let nbIsFiltered = false;

    	onMount(() => {
    		filterStates = [
    			[AM, aemIsFiltered],
    			[AEM, aemIsFiltered],
    			[TM, tmIsFiltered],
    			[NB, nbIsFiltered]
    		];
    	});

    	const writable_props = ["filterRows", "filtered", "allRows"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Filters> was created with unknown prop '${key}'`);
    	});

    	function input0_change_handler() {
    		amIsFiltered = this.checked;
    		$$invalidate(1, amIsFiltered);
    	}

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, AM = $$value);
    		});
    	}

    	const change_handler = () => dispatchFilter("ALKALI_METALS");

    	function input1_change_handler() {
    		aemIsFiltered = this.checked;
    		$$invalidate(3, aemIsFiltered);
    	}

    	function input1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, AEM = $$value);
    		});
    	}

    	const change_handler_1 = () => dispatchFilter("EARTH_METALS");

    	function input2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, TM = $$value);
    		});
    	}

    	function input2_change_handler() {
    		tmIsFiltered = this.checked;
    		$$invalidate(5, tmIsFiltered);
    	}

    	const change_handler_2 = () => dispatchFilter("TRANSITION_METALS");

    	function input3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(6, NB = $$value);
    		});
    	}

    	function input3_change_handler() {
    		nbIsFiltered = this.checked;
    		$$invalidate(7, nbIsFiltered);
    	}

    	const change_handler_3 = () => dispatchFilter("NOBLE_GASES");
    	const click_handler = () => dispatchFilter();

    	$$self.$set = $$props => {
    		if ("filterRows" in $$props) $$invalidate(9, filterRows = $$props.filterRows);
    		if ("filtered" in $$props) $$invalidate(10, filtered = $$props.filtered);
    		if ("allRows" in $$props) $$invalidate(11, allRows = $$props.allRows);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		ShowWhen,
    		NOBLE_GASES,
    		ALKALI_METALS,
    		EARTH_METALS,
    		TRANSITION_METALS,
    		availableFilters,
    		activeFiltersIds,
    		toggleActiveFilter,
    		dispatchFilter,
    		handleFilter,
    		resetFilters,
    		filterRows,
    		filtered,
    		allRows,
    		AM,
    		amIsFiltered,
    		AEM,
    		aemIsFiltered,
    		TM,
    		tmIsFiltered,
    		NB,
    		nbIsFiltered,
    		JSON,
    		filterStates
    	});

    	$$self.$inject_state = $$props => {
    		if ("activeFiltersIds" in $$props) activeFiltersIds = $$props.activeFiltersIds;
    		if ("filterRows" in $$props) $$invalidate(9, filterRows = $$props.filterRows);
    		if ("filtered" in $$props) $$invalidate(10, filtered = $$props.filtered);
    		if ("allRows" in $$props) $$invalidate(11, allRows = $$props.allRows);
    		if ("AM" in $$props) $$invalidate(0, AM = $$props.AM);
    		if ("amIsFiltered" in $$props) $$invalidate(1, amIsFiltered = $$props.amIsFiltered);
    		if ("AEM" in $$props) $$invalidate(2, AEM = $$props.AEM);
    		if ("aemIsFiltered" in $$props) $$invalidate(3, aemIsFiltered = $$props.aemIsFiltered);
    		if ("TM" in $$props) $$invalidate(4, TM = $$props.TM);
    		if ("tmIsFiltered" in $$props) $$invalidate(5, tmIsFiltered = $$props.tmIsFiltered);
    		if ("NB" in $$props) $$invalidate(6, NB = $$props.NB);
    		if ("nbIsFiltered" in $$props) $$invalidate(7, nbIsFiltered = $$props.nbIsFiltered);
    		if ("filterStates" in $$props) filterStates = $$props.filterStates;
    	};

    	let filterStates;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*AM, aemIsFiltered, AEM, TM, tmIsFiltered, NB, nbIsFiltered*/ 253) {
    			 filterStates = [
    				[AM, aemIsFiltered],
    				[AEM, aemIsFiltered],
    				[TM, tmIsFiltered],
    				[NB, nbIsFiltered]
    			];
    		}
    	};

    	return [
    		AM,
    		amIsFiltered,
    		AEM,
    		aemIsFiltered,
    		TM,
    		tmIsFiltered,
    		NB,
    		nbIsFiltered,
    		dispatchFilter,
    		filterRows,
    		filtered,
    		allRows,
    		filterStates,
    		NOBLE_GASES,
    		ALKALI_METALS,
    		EARTH_METALS,
    		TRANSITION_METALS,
    		availableFilters,
    		activeFiltersIds,
    		toggleActiveFilter,
    		handleFilter,
    		resetFilters,
    		input0_change_handler,
    		input0_binding,
    		change_handler,
    		input1_change_handler,
    		input1_binding,
    		change_handler_1,
    		input2_binding,
    		input2_change_handler,
    		change_handler_2,
    		input3_binding,
    		input3_change_handler,
    		change_handler_3,
    		click_handler
    	];
    }

    class Filters extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, { filterRows: 9, filtered: 10, allRows: 11 }, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Filters",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*filterRows*/ ctx[9] === undefined && !("filterRows" in props)) {
    			console.warn("<Filters> was created without expected prop 'filterRows'");
    		}

    		if (/*filtered*/ ctx[10] === undefined && !("filtered" in props)) {
    			console.warn("<Filters> was created without expected prop 'filtered'");
    		}

    		if (/*allRows*/ ctx[11] === undefined && !("allRows" in props)) {
    			console.warn("<Filters> was created without expected prop 'allRows'");
    		}
    	}

    	get filterRows() {
    		throw new Error("<Filters>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filterRows(value) {
    		throw new Error("<Filters>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filtered() {
    		throw new Error("<Filters>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filtered(value) {
    		throw new Error("<Filters>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allRows() {
    		throw new Error("<Filters>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allRows(value) {
    		throw new Error("<Filters>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var emotion_umd_min = createCommonjsModule(function (module, exports) {
    !function(e,r){r(exports);}(commonjsGlobal,function(e){var r=function(){function e(e){this.isSpeedy=void 0===e.speedy||e.speedy,this.tags=[],this.ctr=0,this.nonce=e.nonce,this.key=e.key,this.container=e.container,this.before=null;}var r=e.prototype;return r.insert=function(e){if(this.ctr%(this.isSpeedy?65e3:1)==0){var r,t=function(e){var r=document.createElement("style");return r.setAttribute("data-emotion",e.key),void 0!==e.nonce&&r.setAttribute("nonce",e.nonce),r.appendChild(document.createTextNode("")),r}(this);r=0===this.tags.length?this.before:this.tags[this.tags.length-1].nextSibling,this.container.insertBefore(t,r),this.tags.push(t);}var a=this.tags[this.tags.length-1];if(this.isSpeedy){var n=function(e){if(e.sheet)return e.sheet;for(var r=0;r<document.styleSheets.length;r++)if(document.styleSheets[r].ownerNode===e)return document.styleSheets[r]}(a);try{var i=105===e.charCodeAt(1)&&64===e.charCodeAt(0);n.insertRule(e,i?0:n.cssRules.length);}catch(e){}}else a.appendChild(document.createTextNode(e));this.ctr++;},r.flush=function(){this.tags.forEach(function(e){return e.parentNode.removeChild(e)}),this.tags=[],this.ctr=0;},e}();function t(e){function r(e,r,a){var n=r.trim().split(b);r=n;var i=n.length,s=e.length;switch(s){case 0:case 1:var c=0;for(e=0===s?"":e[0]+" ";c<i;++c)r[c]=t(e,r[c],a).trim();break;default:var o=c=0;for(r=[];c<i;++c)for(var l=0;l<s;++l)r[o++]=t(e[l]+" ",n[c],a).trim();}return r}function t(e,r,t){var a=r.charCodeAt(0);switch(33>a&&(a=(r=r.trim()).charCodeAt(0)),a){case 38:return r.replace(g,"$1"+e.trim());case 58:return e.trim()+r.replace(g,"$1"+e.trim());default:if(0<1*t&&0<r.indexOf("\f"))return r.replace(g,(58===e.charCodeAt(0)?"":"$1")+e.trim())}return e+r}function a(e,r,t,i){var s=e+";",c=2*r+3*t+4*i;if(944===c){e=s.indexOf(":",9)+1;var o=s.substring(e,s.length-1).trim();return o=s.substring(0,e).trim()+o+";",1===z||2===z&&n(o,1)?"-webkit-"+o+o:o}if(0===z||2===z&&!n(s,1))return s;switch(c){case 1015:return 97===s.charCodeAt(10)?"-webkit-"+s+s:s;case 951:return 116===s.charCodeAt(3)?"-webkit-"+s+s:s;case 963:return 110===s.charCodeAt(5)?"-webkit-"+s+s:s;case 1009:if(100!==s.charCodeAt(4))break;case 969:case 942:return "-webkit-"+s+s;case 978:return "-webkit-"+s+"-moz-"+s+s;case 1019:case 983:return "-webkit-"+s+"-moz-"+s+"-ms-"+s+s;case 883:if(45===s.charCodeAt(8))return "-webkit-"+s+s;if(0<s.indexOf("image-set(",11))return s.replace(S,"$1-webkit-$2")+s;break;case 932:if(45===s.charCodeAt(4))switch(s.charCodeAt(5)){case 103:return "-webkit-box-"+s.replace("-grow","")+"-webkit-"+s+"-ms-"+s.replace("grow","positive")+s;case 115:return "-webkit-"+s+"-ms-"+s.replace("shrink","negative")+s;case 98:return "-webkit-"+s+"-ms-"+s.replace("basis","preferred-size")+s}return "-webkit-"+s+"-ms-"+s+s;case 964:return "-webkit-"+s+"-ms-flex-"+s+s;case 1023:if(99!==s.charCodeAt(8))break;return "-webkit-box-pack"+(o=s.substring(s.indexOf(":",15)).replace("flex-","").replace("space-between","justify"))+"-webkit-"+s+"-ms-flex-pack"+o+s;case 1005:return d.test(s)?s.replace(u,":-webkit-")+s.replace(u,":-moz-")+s:s;case 1e3:switch(r=(o=s.substring(13).trim()).indexOf("-")+1,o.charCodeAt(0)+o.charCodeAt(r)){case 226:o=s.replace(v,"tb");break;case 232:o=s.replace(v,"tb-rl");break;case 220:o=s.replace(v,"lr");break;default:return s}return "-webkit-"+s+"-ms-"+o+s;case 1017:if(-1===s.indexOf("sticky",9))break;case 975:switch(r=(s=e).length-10,c=(o=(33===s.charCodeAt(r)?s.substring(0,r):s).substring(e.indexOf(":",7)+1).trim()).charCodeAt(0)+(0|o.charCodeAt(7))){case 203:if(111>o.charCodeAt(8))break;case 115:s=s.replace(o,"-webkit-"+o)+";"+s;break;case 207:case 102:s=s.replace(o,"-webkit-"+(102<c?"inline-":"")+"box")+";"+s.replace(o,"-webkit-"+o)+";"+s.replace(o,"-ms-"+o+"box")+";"+s;}return s+";";case 938:if(45===s.charCodeAt(5))switch(s.charCodeAt(6)){case 105:return o=s.replace("-items",""),"-webkit-"+s+"-webkit-box-"+o+"-ms-flex-"+o+s;case 115:return "-webkit-"+s+"-ms-flex-item-"+s.replace(A,"")+s;default:return "-webkit-"+s+"-ms-flex-line-pack"+s.replace("align-content","").replace(A,"")+s}break;case 973:case 989:if(45!==s.charCodeAt(3)||122===s.charCodeAt(4))break;case 931:case 953:if(!0===x.test(e))return 115===(o=e.substring(e.indexOf(":")+1)).charCodeAt(0)?a(e.replace("stretch","fill-available"),r,t,i).replace(":fill-available",":stretch"):s.replace(o,"-webkit-"+o)+s.replace(o,"-moz-"+o.replace("fill-",""))+s;break;case 962:if(s="-webkit-"+s+(102===s.charCodeAt(5)?"-ms-"+s:"")+s,211===t+i&&105===s.charCodeAt(13)&&0<s.indexOf("transform",10))return s.substring(0,s.indexOf(";",27)+1).replace(h,"$1-webkit-$2")+s}return s}function n(e,r){var t=e.indexOf(1===r?":":"{"),a=e.substring(0,3!==r?t:10);return t=e.substring(t+1,e.length-1),G(2!==r?a:a.replace(C,"$1"),t,r)}function i(e,r){var t=a(r,r.charCodeAt(0),r.charCodeAt(1),r.charCodeAt(2));return t!==r+";"?t.replace(y," or ($1)").substring(4):"("+r+")"}function s(e,r,t,a,n,i,s,c,l,f){for(var u,d=0,h=r;d<_;++d)switch(u=R[d].call(o,e,h,t,a,n,i,s,c,l,f)){case void 0:case!1:case!0:case null:break;default:h=u;}if(h!==r)return h}function c(e){return void 0!==(e=e.prefix)&&(G=null,e?"function"!=typeof e?z=1:(z=2,G=e):z=0),c}function o(e,t){var c=e;if(33>c.charCodeAt(0)&&(c=c.trim()),c=[c],0<_){var o=s(-1,t,c,c,$,O,0,0,0,0);void 0!==o&&"string"==typeof o&&(t=o);}var u=function e(t,c,o,u,d){for(var h,b,g,v,y,A=0,C=0,x=0,S=0,R=0,G=0,I=g=h=0,M=0,W=0,P=0,D=0,F=o.length,L=F-1,T="",q="",B="",H="";M<F;){if(b=o.charCodeAt(M),M===L&&0!==C+S+x+A&&(0!==C&&(b=47===C?10:47),S=x=A=0,F++,L++),0===C+S+x+A){if(M===L&&(0<W&&(T=T.replace(f,"")),0<T.trim().length)){switch(b){case 32:case 9:case 59:case 13:case 10:break;default:T+=o.charAt(M);}b=59;}switch(b){case 123:for(h=(T=T.trim()).charCodeAt(0),g=1,D=++M;M<F;){switch(b=o.charCodeAt(M)){case 123:g++;break;case 125:g--;break;case 47:switch(b=o.charCodeAt(M+1)){case 42:case 47:e:{for(I=M+1;I<L;++I)switch(o.charCodeAt(I)){case 47:if(42===b&&42===o.charCodeAt(I-1)&&M+2!==I){M=I+1;break e}break;case 10:if(47===b){M=I+1;break e}}M=I;}}break;case 91:b++;case 40:b++;case 34:case 39:for(;M++<L&&o.charCodeAt(M)!==b;);}if(0===g)break;M++;}switch(g=o.substring(D,M),0===h&&(h=(T=T.replace(l,"").trim()).charCodeAt(0)),h){case 64:switch(0<W&&(T=T.replace(f,"")),b=T.charCodeAt(1)){case 100:case 109:case 115:case 45:W=c;break;default:W=E;}if(D=(g=e(c,W,g,b,d+1)).length,0<_&&(y=s(3,g,W=r(E,T,P),c,$,O,D,b,d,u),T=W.join(""),void 0!==y&&0===(D=(g=y.trim()).length)&&(b=0,g="")),0<D)switch(b){case 115:T=T.replace(w,i);case 100:case 109:case 45:g=T+"{"+g+"}";break;case 107:g=(T=T.replace(p,"$1 $2"))+"{"+g+"}",g=1===z||2===z&&n("@"+g,3)?"@-webkit-"+g+"@"+g:"@"+g;break;default:g=T+g,112===u&&(q+=g,g="");}else g="";break;default:g=e(c,r(c,T,P),g,u,d+1);}B+=g,g=P=W=I=h=0,T="",b=o.charCodeAt(++M);break;case 125:case 59:if(1<(D=(T=(0<W?T.replace(f,""):T).trim()).length))switch(0===I&&(h=T.charCodeAt(0),45===h||96<h&&123>h)&&(D=(T=T.replace(" ",":")).length),0<_&&void 0!==(y=s(1,T,c,t,$,O,q.length,u,d,u))&&0===(D=(T=y.trim()).length)&&(T="\0\0"),h=T.charCodeAt(0),b=T.charCodeAt(1),h){case 0:break;case 64:if(105===b||99===b){H+=T+o.charAt(M);break}default:58!==T.charCodeAt(D-1)&&(q+=a(T,h,b,T.charCodeAt(2)));}P=W=I=h=0,T="",b=o.charCodeAt(++M);}}switch(b){case 13:case 10:47===C?C=0:0===1+h&&107!==u&&0<T.length&&(W=1,T+="\0"),0<_*N&&s(0,T,c,t,$,O,q.length,u,d,u),O=1,$++;break;case 59:case 125:if(0===C+S+x+A){O++;break}default:switch(O++,v=o.charAt(M),b){case 9:case 32:if(0===S+A+C)switch(R){case 44:case 58:case 9:case 32:v="";break;default:32!==b&&(v=" ");}break;case 0:v="\\0";break;case 12:v="\\f";break;case 11:v="\\v";break;case 38:0===S+C+A&&(W=P=1,v="\f"+v);break;case 108:if(0===S+C+A+j&&0<I)switch(M-I){case 2:112===R&&58===o.charCodeAt(M-3)&&(j=R);case 8:111===G&&(j=G);}break;case 58:0===S+C+A&&(I=M);break;case 44:0===C+x+S+A&&(W=1,v+="\r");break;case 34:case 39:0===C&&(S=S===b?0:0===S?b:S);break;case 91:0===S+C+x&&A++;break;case 93:0===S+C+x&&A--;break;case 41:0===S+C+A&&x--;break;case 40:if(0===S+C+A){if(0===h)switch(2*R+3*G){case 533:break;default:h=1;}x++;}break;case 64:0===C+x+S+A+I+g&&(g=1);break;case 42:case 47:if(!(0<S+A+x))switch(C){case 0:switch(2*b+3*o.charCodeAt(M+1)){case 235:C=47;break;case 220:D=M,C=42;}break;case 42:47===b&&42===R&&D+2!==M&&(33===o.charCodeAt(D+2)&&(q+=o.substring(D,M+1)),v="",C=0);}}0===C&&(T+=v);}G=R,R=b,M++;}if(0<(D=q.length)){if(W=c,0<_&&void 0!==(y=s(2,q,W,t,$,O,D,u,d,u))&&0===(q=y).length)return H+q+B;if(q=W.join(",")+"{"+q+"}",0!=z*j){switch(2!==z||n(q,2)||(j=0),j){case 111:q=q.replace(k,":-moz-$1")+q;break;case 112:q=q.replace(m,"::-webkit-input-$1")+q.replace(m,"::-moz-$1")+q.replace(m,":-ms-input-$1")+q;}j=0;}}return H+q+B}(E,c,t,0,0);return 0<_&&(void 0!==(o=s(-2,u,c,c,$,O,u.length,0,0,0))&&(u=o)),j=0,O=$=1,u}var l=/^\0+/g,f=/[\0\r\f]/g,u=/: */g,d=/zoo|gra/,h=/([,: ])(transform)/g,b=/,\r+?/g,g=/([\t\r\n ])*\f?&/g,p=/@(k\w+)\s*(\S*)\s*/,m=/::(place)/g,k=/:(read-only)/g,v=/[svh]\w+-[tblr]{2}/,w=/\(\s*(.*)\s*\)/g,y=/([\s\S]*?);/g,A=/-self|flex-/g,C=/[^]*?(:[rp][el]a[\w-]+)[^]*/,x=/stretch|:\s*\w+\-(?:conte|avail)/,S=/([^-])(image-set\()/,O=1,$=1,j=0,z=1,E=[],R=[],_=0,G=null,N=0;return o.use=function e(r){switch(r){case void 0:case null:_=R.length=0;break;default:if("function"==typeof r)R[_++]=r;else if("object"==typeof r)for(var t=0,a=r.length;t<a;++t)e(r[t]);else N=0|!!r;}return e},o.set=c,void 0!==e&&c(e),o}function a(e){e&&n.current.insert(e+"}");}var n={current:null},i=function(e,r,t,i,s,c,o,l,f,u){switch(e){case 1:switch(r.charCodeAt(0)){case 64:return n.current.insert(r+";"),"";case 108:if(98===r.charCodeAt(2))return ""}break;case 2:if(0===l)return r+"/*|*/";break;case 3:switch(l){case 102:case 112:return n.current.insert(t[0]+r),"";default:return r+(0===u?"/*|*/":"")}case-2:r.split("/*|*/}").forEach(a);}};var s={animationIterationCount:1,borderImageOutset:1,borderImageSlice:1,borderImageWidth:1,boxFlex:1,boxFlexGroup:1,boxOrdinalGroup:1,columnCount:1,columns:1,flex:1,flexGrow:1,flexPositive:1,flexShrink:1,flexNegative:1,flexOrder:1,gridRow:1,gridRowEnd:1,gridRowSpan:1,gridRowStart:1,gridColumn:1,gridColumnEnd:1,gridColumnSpan:1,gridColumnStart:1,msGridRow:1,msGridRowSpan:1,msGridColumn:1,msGridColumnSpan:1,fontWeight:1,lineHeight:1,opacity:1,order:1,orphans:1,tabSize:1,widows:1,zIndex:1,zoom:1,WebkitLineClamp:1,fillOpacity:1,floodOpacity:1,stopOpacity:1,strokeDasharray:1,strokeDashoffset:1,strokeMiterlimit:1,strokeOpacity:1,strokeWidth:1};var c=/[A-Z]|^ms/g,o=/_EMO_([^_]+?)_([^]*?)_EMO_/g,l=function(e){return 45===e.charCodeAt(1)},f=function(e){return null!=e&&"boolean"!=typeof e},u=function(e){var r={};return function(t){return void 0===r[t]&&(r[t]=e(t)),r[t]}}(function(e){return l(e)?e:e.replace(c,"-$&").toLowerCase()}),d=function(e,r){switch(e){case"animation":case"animationName":if("string"==typeof r)return r.replace(o,function(e,r,t){return b={name:r,styles:t,next:b},r})}return 1===s[e]||l(e)||"number"!=typeof r||0===r?r:r+"px"};function h(e,r,t,a){if(null==t)return "";if(void 0!==t.__emotion_styles)return t;switch(typeof t){case"boolean":return "";case"object":if(1===t.anim)return b={name:t.name,styles:t.styles,next:b},t.name;if(void 0!==t.styles){var n=t.next;if(void 0!==n)for(;void 0!==n;)b={name:n.name,styles:n.styles,next:b},n=n.next;return t.styles+";"}return function(e,r,t){var a="";if(Array.isArray(t))for(var n=0;n<t.length;n++)a+=h(e,r,t[n],!1);else for(var i in t){var s=t[i];if("object"!=typeof s)null!=r&&void 0!==r[s]?a+=i+"{"+r[s]+"}":f(s)&&(a+=u(i)+":"+d(i,s)+";");else if(!Array.isArray(s)||"string"!=typeof s[0]||null!=r&&void 0!==r[s[0]]){var c=h(e,r,s,!1);switch(i){case"animation":case"animationName":a+=u(i)+":"+c+";";break;default:a+=i+"{"+c+"}";}}else for(var o=0;o<s.length;o++)f(s[o])&&(a+=u(i)+":"+d(i,s[o])+";");}return a}(e,r,t);case"function":if(void 0!==e){var i=b,s=t(e);return b=i,h(e,r,s,a)}}if(null==r)return t;var c=r[t];return void 0===c||a?t:c}var b,g=/label:\s*([^\s;\n{]+)\s*;/g,p=function(e,r,t){if(1===e.length&&"object"==typeof e[0]&&null!==e[0]&&void 0!==e[0].styles)return e[0];var a=!0,n="";b=void 0;var i=e[0];null==i||void 0===i.raw?(a=!1,n+=h(t,r,i,!1)):n+=i[0];for(var s=1;s<e.length;s++)n+=h(t,r,e[s],46===n.charCodeAt(n.length-1)),a&&(n+=i[s]);g.lastIndex=0;for(var c,o="";null!==(c=g.exec(n));)o+="-"+c[1];return {name:function(e){for(var r,t=e.length,a=t^t,n=0;t>=4;)r=1540483477*(65535&(r=255&e.charCodeAt(n)|(255&e.charCodeAt(++n))<<8|(255&e.charCodeAt(++n))<<16|(255&e.charCodeAt(++n))<<24))+((1540483477*(r>>>16)&65535)<<16),a=1540483477*(65535&a)+((1540483477*(a>>>16)&65535)<<16)^(r=1540483477*(65535&(r^=r>>>24))+((1540483477*(r>>>16)&65535)<<16)),t-=4,++n;switch(t){case 3:a^=(255&e.charCodeAt(n+2))<<16;case 2:a^=(255&e.charCodeAt(n+1))<<8;case 1:a=1540483477*(65535&(a^=255&e.charCodeAt(n)))+((1540483477*(a>>>16)&65535)<<16);}return a=1540483477*(65535&(a^=a>>>13))+((1540483477*(a>>>16)&65535)<<16),((a^=a>>>15)>>>0).toString(36)}(n)+o,styles:n,next:b}};function m(e,r,t){var a="";return t.split(" ").forEach(function(t){void 0!==e[t]?r.push(e[t]):a+=t+" ";}),a}function k(e,r){if(void 0===e.inserted[r.name])return e.insert("",r,e.sheet,!0)}function v(e,r,t){var a=[],n=m(e,a,t);return a.length<2?t:n+r(a)}var w=function e(r){for(var t="",a=0;a<r.length;a++){var n=r[a];if(null!=n){var i=void 0;switch(typeof n){case"boolean":break;case"object":if(Array.isArray(n))i=e(n);else for(var s in i="",n)n[s]&&s&&(i&&(i+=" "),i+=s);break;default:i=n;}i&&(t&&(t+=" "),t+=i);}}return t},y=function(e){var a=function(e){void 0===e&&(e={});var a,s=e.key||"css";void 0!==e.prefix&&(a={prefix:e.prefix});var c,o=new t(a),l={};c=e.container||document.head;var f,u=document.querySelectorAll("style[data-emotion-"+s+"]");Array.prototype.forEach.call(u,function(e){e.getAttribute("data-emotion-"+s).split(" ").forEach(function(e){l[e]=!0;}),e.parentNode!==c&&c.appendChild(e);}),o.use(e.stylisPlugins)(i),f=function(e,r,t,a){var i=r.name;n.current=t,o(e,r.styles),a&&(d.inserted[i]=!0);};var d={key:s,sheet:new r({key:s,container:c,nonce:e.nonce,speedy:e.speedy}),nonce:e.nonce,inserted:l,registered:{},insert:f};return d}(e);a.sheet.speedy=function(e){this.isSpeedy=e;},a.compat=!0;var s=function(){for(var e=arguments.length,r=new Array(e),t=0;t<e;t++)r[t]=arguments[t];var n=p(r,a.registered,void 0);return function(e,r,t){var a=e.key+"-"+r.name;if(!1===t&&void 0===e.registered[a]&&(e.registered[a]=r.styles),void 0===e.inserted[r.name]){var n=r;do{e.insert("."+a,n,e.sheet,!0),n=n.next;}while(void 0!==n)}}(a,n,!1),a.key+"-"+n.name};return {css:s,cx:function(){for(var e=arguments.length,r=new Array(e),t=0;t<e;t++)r[t]=arguments[t];return v(a.registered,s,w(r))},injectGlobal:function(){for(var e=arguments.length,r=new Array(e),t=0;t<e;t++)r[t]=arguments[t];var n=p(r,a.registered);k(a,n);},keyframes:function(){for(var e=arguments.length,r=new Array(e),t=0;t<e;t++)r[t]=arguments[t];var n=p(r,a.registered),i="animation-"+n.name;return k(a,{name:n.name,styles:"@keyframes "+i+"{"+n.styles+"}"}),i},hydrate:function(e){e.forEach(function(e){a.inserted[e]=!0;});},flush:function(){a.registered={},a.inserted={},a.sheet.flush();},sheet:a.sheet,cache:a,getRegisteredStyles:m.bind(null,a.registered),merge:v.bind(null,a.registered,s)}}(),A=y.flush,C=y.hydrate,x=y.cx,S=y.merge,O=y.getRegisteredStyles,$=y.injectGlobal,j=y.keyframes,z=y.css,E=y.sheet,R=y.cache;e.cache=R,e.css=z,e.cx=x,e.flush=A,e.getRegisteredStyles=O,e.hydrate=C,e.injectGlobal=$,e.keyframes=j,e.merge=S,e.sheet=E,Object.defineProperty(e,"__esModule",{value:!0});});

    });

    var emotion = unwrapExports(emotion_umd_min);

    const { css } = emotion;

    let windowWidth = window.innerWidth;
    const elPadding = 8;
    const elMargin = 4;
    const borderWidth = 1;

    window.addEventListener('resize', () => windowWidth = window.innerWidth);

    const canvasStyle = css`

`;
    const elementStyle = (color="#fff", visible, count=18) => css`
  position: relative;
  box-sizing: border-box;
  background: ${color};
  border: ${borderWidth}px solid ${LightenDarkenColor(color, -20)};
  padding: ${elPadding}px;
  margin: ${elMargin}px;
  visibility: ${visible ? 'visible' : 'hidden' };
`;
    const gridCellStyle = css`

`;

    function LightenDarkenColor(col, amt) {
      var usePound = false;

      if (col[0] == "#") {
          col = col.slice(1);
          usePound = true;
      }

      var num = parseInt(col,16);

      var r = (num >> 16) + amt;

      if (r > 255) r = 255;
      else if  (r < 0) r = 0;

      var b = ((num >> 8) & 0x00FF) + amt;

      if (b > 255) b = 255;
      else if  (b < 0) b = 0;

      var g = (num & 0x0000FF) + amt;

      if (g > 255) g = 255;
      else if (g < 0) g = 0;

      return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);

    }

    /* src/Element.svelte generated by Svelte v3.19.1 */
    const file$2 = "src/Element.svelte";

    // (113:0) {:else}
    function create_else_block(ctx) {
    	let div;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			children(div).forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(elementStyle(/*color*/ ctx[6], /*visible*/ ctx[7], /*count*/ ctx[8])) + " svelte-1vbn6bg"));
    			add_location(div, file$2, 113, 2, 2106);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*color, visible, count*/ 448 && div_class_value !== (div_class_value = "" + (null_to_empty(elementStyle(/*color*/ ctx[6], /*visible*/ ctx[7], /*count*/ ctx[8])) + " svelte-1vbn6bg"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(113:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (78:0) {#if visible}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let div_class_value;
    	let div_intro;
    	let dispose;
    	let if_block0 = /*variant*/ ctx[1] === "mobile" && create_if_block_4(ctx);
    	let if_block1 = /*variant*/ ctx[1] === "tablet" && create_if_block_3(ctx);
    	let if_block2 = /*variant*/ ctx[1] === "laptop" && create_if_block_2(ctx);
    	let if_block3 = /*detail*/ ctx[0] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			if (if_block0) if_block0.l(div_nodes);
    			t0 = claim_space(div_nodes);
    			if (if_block1) if_block1.l(div_nodes);
    			t1 = claim_space(div_nodes);
    			if (if_block2) if_block2.l(div_nodes);
    			t2 = claim_space(div_nodes);
    			if (if_block3) if_block3.l(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", div_class_value = "" + (/*variant*/ ctx[1] + "-screen " + elementStyle(/*color*/ ctx[6], /*visible*/ ctx[7]) + " svelte-1vbn6bg"));
    			toggle_class(div, "inactive", /*inactive*/ ctx[10]);
    			toggle_class(div, "detail", /*detail*/ ctx[0]);
    			add_location(div, file$2, 78, 2, 1330);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    			append_dev(div, t2);
    			if (if_block3) if_block3.m(div, null);
    			/*div_binding*/ ctx[19](div);
    			dispose = listen_dev(div, "click", /*click_handler*/ ctx[20], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (/*variant*/ ctx[1] === "mobile") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*variant*/ ctx[1] === "tablet") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*variant*/ ctx[1] === "laptop") {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					if_block2.m(div, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*detail*/ ctx[0]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1(ctx);
    					if_block3.c();
    					if_block3.m(div, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*variant, color, visible*/ 194 && div_class_value !== (div_class_value = "" + (/*variant*/ ctx[1] + "-screen " + elementStyle(/*color*/ ctx[6], /*visible*/ ctx[7]) + " svelte-1vbn6bg"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty & /*variant, color, visible, inactive*/ 1218) {
    				toggle_class(div, "inactive", /*inactive*/ ctx[10]);
    			}

    			if (dirty & /*variant, color, visible, detail*/ 195) {
    				toggle_class(div, "detail", /*detail*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (!div_intro) {
    				add_render_callback(() => {
    					div_intro = create_in_transition(div, fly, { delay: 5 * /*id*/ ctx[2], y: -20 });
    					div_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			/*div_binding*/ ctx[19](null);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(78:0) {#if visible}",
    		ctx
    	});

    	return block;
    }

    // (89:4) {#if variant === 'mobile'}
    function create_if_block_4(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*symbol*/ ctx[3]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			p = claim_element(nodes, "P", { class: true });
    			var p_nodes = children(p);
    			t = claim_text(p_nodes, /*symbol*/ ctx[3]);
    			p_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(p, "class", "symbol svelte-1vbn6bg");
    			add_location(p, file$2, 89, 6, 1603);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*symbol*/ 8) set_data_dev(t, /*symbol*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(89:4) {#if variant === 'mobile'}",
    		ctx
    	});

    	return block;
    }

    // (93:4) {#if variant === 'tablet'}
    function create_if_block_3(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let p1;
    	let t2;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text(/*id*/ ctx[2]);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(/*symbol*/ ctx[3]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			p0 = claim_element(nodes, "P", { class: true });
    			var p0_nodes = children(p0);
    			t0 = claim_text(p0_nodes, /*id*/ ctx[2]);
    			p0_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			p1 = claim_element(nodes, "P", { class: true });
    			var p1_nodes = children(p1);
    			t2 = claim_text(p1_nodes, /*symbol*/ ctx[3]);
    			p1_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(p0, "class", "id svelte-1vbn6bg");
    			add_location(p0, file$2, 93, 6, 1682);
    			attr_dev(p1, "class", "symbol svelte-1vbn6bg");
    			add_location(p1, file$2, 94, 6, 1711);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*id*/ 4) set_data_dev(t0, /*id*/ ctx[2]);
    			if (dirty & /*symbol*/ 8) set_data_dev(t2, /*symbol*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(93:4) {#if variant === 'tablet'}",
    		ctx
    	});

    	return block;
    }

    // (98:4) {#if variant === 'laptop'}
    function create_if_block_2(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let p1;
    	let t2;
    	let t3;
    	let p2;
    	let t4;
    	let t5;
    	let p3;
    	let t6;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text(/*id*/ ctx[2]);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(/*symbol*/ ctx[3]);
    			t3 = space();
    			p2 = element("p");
    			t4 = text(/*name*/ ctx[4]);
    			t5 = space();
    			p3 = element("p");
    			t6 = text(/*mass*/ ctx[5]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			p0 = claim_element(nodes, "P", { class: true });
    			var p0_nodes = children(p0);
    			t0 = claim_text(p0_nodes, /*id*/ ctx[2]);
    			p0_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			p1 = claim_element(nodes, "P", { class: true });
    			var p1_nodes = children(p1);
    			t2 = claim_text(p1_nodes, /*symbol*/ ctx[3]);
    			p1_nodes.forEach(detach_dev);
    			t3 = claim_space(nodes);
    			p2 = claim_element(nodes, "P", { class: true });
    			var p2_nodes = children(p2);
    			t4 = claim_text(p2_nodes, /*name*/ ctx[4]);
    			p2_nodes.forEach(detach_dev);
    			t5 = claim_space(nodes);
    			p3 = claim_element(nodes, "P", { class: true });
    			var p3_nodes = children(p3);
    			t6 = claim_text(p3_nodes, /*mass*/ ctx[5]);
    			p3_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(p0, "class", "id svelte-1vbn6bg");
    			add_location(p0, file$2, 98, 6, 1790);
    			attr_dev(p1, "class", "symbol svelte-1vbn6bg");
    			add_location(p1, file$2, 99, 6, 1819);
    			attr_dev(p2, "class", "name svelte-1vbn6bg");
    			add_location(p2, file$2, 100, 6, 1856);
    			attr_dev(p3, "class", "mass svelte-1vbn6bg");
    			add_location(p3, file$2, 101, 6, 1889);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*id*/ 4) set_data_dev(t0, /*id*/ ctx[2]);
    			if (dirty & /*symbol*/ 8) set_data_dev(t2, /*symbol*/ ctx[3]);
    			if (dirty & /*name*/ 16) set_data_dev(t4, /*name*/ ctx[4]);
    			if (dirty & /*mass*/ 32) set_data_dev(t6, /*mass*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(98:4) {#if variant === 'laptop'}",
    		ctx
    	});

    	return block;
    }

    // (105:4) {#if detail}
    function create_if_block_1(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let p1;
    	let t2;
    	let t3;
    	let p2;
    	let t4;
    	let t5;
    	let p3;
    	let t6;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text(/*id*/ ctx[2]);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(/*symbol*/ ctx[3]);
    			t3 = space();
    			p2 = element("p");
    			t4 = text(/*name*/ ctx[4]);
    			t5 = space();
    			p3 = element("p");
    			t6 = text(/*mass*/ ctx[5]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			p0 = claim_element(nodes, "P", { class: true });
    			var p0_nodes = children(p0);
    			t0 = claim_text(p0_nodes, /*id*/ ctx[2]);
    			p0_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			p1 = claim_element(nodes, "P", { class: true });
    			var p1_nodes = children(p1);
    			t2 = claim_text(p1_nodes, /*symbol*/ ctx[3]);
    			p1_nodes.forEach(detach_dev);
    			t3 = claim_space(nodes);
    			p2 = claim_element(nodes, "P", { class: true });
    			var p2_nodes = children(p2);
    			t4 = claim_text(p2_nodes, /*name*/ ctx[4]);
    			p2_nodes.forEach(detach_dev);
    			t5 = claim_space(nodes);
    			p3 = claim_element(nodes, "P", { class: true });
    			var p3_nodes = children(p3);
    			t6 = claim_text(p3_nodes, /*mass*/ ctx[5]);
    			p3_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(p0, "class", "id svelte-1vbn6bg");
    			add_location(p0, file$2, 105, 6, 1950);
    			attr_dev(p1, "class", "symbol svelte-1vbn6bg");
    			add_location(p1, file$2, 106, 6, 1979);
    			attr_dev(p2, "class", "name svelte-1vbn6bg");
    			add_location(p2, file$2, 107, 6, 2016);
    			attr_dev(p3, "class", "mass svelte-1vbn6bg");
    			add_location(p3, file$2, 108, 6, 2049);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*id*/ 4) set_data_dev(t0, /*id*/ ctx[2]);
    			if (dirty & /*symbol*/ 8) set_data_dev(t2, /*symbol*/ ctx[3]);
    			if (dirty & /*name*/ 16) set_data_dev(t4, /*name*/ ctx[4]);
    			if (dirty & /*mass*/ 32) set_data_dev(t6, /*mass*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(105:4) {#if detail}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*visible*/ ctx[7]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block);
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { detail } = $$props;
    	let { variant } = $$props;
    	let { id } = $$props;
    	let { symbol } = $$props;
    	let { name } = $$props;
    	let { mass } = $$props;
    	let { RCow } = $$props;
    	let { RVdW } = $$props;
    	let { maxBonds } = $$props;
    	let { color } = $$props;
    	let { color2 } = $$props;
    	let { posX } = $$props;
    	let { posY } = $$props;
    	let { visible } = $$props;
    	let { count } = $$props;
    	let { updateAtom } = $$props;
    	let { inactive } = $$props;
    	let detailDirection;
    	let element;

    	onMount(() => {
    		$$invalidate(11, detailDirection = "left");

    		if (posY > 3) {
    			$$invalidate(11, detailDirection = "top");
    		}

    		if (posY > 12) {
    			$$invalidate(11, detailDirection = "right");
    		}
    	});

    	const writable_props = [
    		"detail",
    		"variant",
    		"id",
    		"symbol",
    		"name",
    		"mass",
    		"RCow",
    		"RVdW",
    		"maxBonds",
    		"color",
    		"color2",
    		"posX",
    		"posY",
    		"visible",
    		"count",
    		"updateAtom",
    		"inactive"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Element> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(12, element = $$value);
    		});
    	}

    	const click_handler = () => updateAtom(element, detailDirection, variant);

    	$$self.$set = $$props => {
    		if ("detail" in $$props) $$invalidate(0, detail = $$props.detail);
    		if ("variant" in $$props) $$invalidate(1, variant = $$props.variant);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    		if ("symbol" in $$props) $$invalidate(3, symbol = $$props.symbol);
    		if ("name" in $$props) $$invalidate(4, name = $$props.name);
    		if ("mass" in $$props) $$invalidate(5, mass = $$props.mass);
    		if ("RCow" in $$props) $$invalidate(13, RCow = $$props.RCow);
    		if ("RVdW" in $$props) $$invalidate(14, RVdW = $$props.RVdW);
    		if ("maxBonds" in $$props) $$invalidate(15, maxBonds = $$props.maxBonds);
    		if ("color" in $$props) $$invalidate(6, color = $$props.color);
    		if ("color2" in $$props) $$invalidate(16, color2 = $$props.color2);
    		if ("posX" in $$props) $$invalidate(17, posX = $$props.posX);
    		if ("posY" in $$props) $$invalidate(18, posY = $$props.posY);
    		if ("visible" in $$props) $$invalidate(7, visible = $$props.visible);
    		if ("count" in $$props) $$invalidate(8, count = $$props.count);
    		if ("updateAtom" in $$props) $$invalidate(9, updateAtom = $$props.updateAtom);
    		if ("inactive" in $$props) $$invalidate(10, inactive = $$props.inactive);
    	};

    	$$self.$capture_state = () => ({
    		fly,
    		fade,
    		onMount,
    		afterUpdate,
    		elementStyle,
    		detail,
    		variant,
    		id,
    		symbol,
    		name,
    		mass,
    		RCow,
    		RVdW,
    		maxBonds,
    		color,
    		color2,
    		posX,
    		posY,
    		visible,
    		count,
    		updateAtom,
    		inactive,
    		detailDirection,
    		element
    	});

    	$$self.$inject_state = $$props => {
    		if ("detail" in $$props) $$invalidate(0, detail = $$props.detail);
    		if ("variant" in $$props) $$invalidate(1, variant = $$props.variant);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    		if ("symbol" in $$props) $$invalidate(3, symbol = $$props.symbol);
    		if ("name" in $$props) $$invalidate(4, name = $$props.name);
    		if ("mass" in $$props) $$invalidate(5, mass = $$props.mass);
    		if ("RCow" in $$props) $$invalidate(13, RCow = $$props.RCow);
    		if ("RVdW" in $$props) $$invalidate(14, RVdW = $$props.RVdW);
    		if ("maxBonds" in $$props) $$invalidate(15, maxBonds = $$props.maxBonds);
    		if ("color" in $$props) $$invalidate(6, color = $$props.color);
    		if ("color2" in $$props) $$invalidate(16, color2 = $$props.color2);
    		if ("posX" in $$props) $$invalidate(17, posX = $$props.posX);
    		if ("posY" in $$props) $$invalidate(18, posY = $$props.posY);
    		if ("visible" in $$props) $$invalidate(7, visible = $$props.visible);
    		if ("count" in $$props) $$invalidate(8, count = $$props.count);
    		if ("updateAtom" in $$props) $$invalidate(9, updateAtom = $$props.updateAtom);
    		if ("inactive" in $$props) $$invalidate(10, inactive = $$props.inactive);
    		if ("detailDirection" in $$props) $$invalidate(11, detailDirection = $$props.detailDirection);
    		if ("element" in $$props) $$invalidate(12, element = $$props.element);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		detail,
    		variant,
    		id,
    		symbol,
    		name,
    		mass,
    		color,
    		visible,
    		count,
    		updateAtom,
    		inactive,
    		detailDirection,
    		element,
    		RCow,
    		RVdW,
    		maxBonds,
    		color2,
    		posX,
    		posY,
    		div_binding,
    		click_handler
    	];
    }

    class Element extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$3, safe_not_equal, {
    			detail: 0,
    			variant: 1,
    			id: 2,
    			symbol: 3,
    			name: 4,
    			mass: 5,
    			RCow: 13,
    			RVdW: 14,
    			maxBonds: 15,
    			color: 6,
    			color2: 16,
    			posX: 17,
    			posY: 18,
    			visible: 7,
    			count: 8,
    			updateAtom: 9,
    			inactive: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Element",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*detail*/ ctx[0] === undefined && !("detail" in props)) {
    			console.warn("<Element> was created without expected prop 'detail'");
    		}

    		if (/*variant*/ ctx[1] === undefined && !("variant" in props)) {
    			console.warn("<Element> was created without expected prop 'variant'");
    		}

    		if (/*id*/ ctx[2] === undefined && !("id" in props)) {
    			console.warn("<Element> was created without expected prop 'id'");
    		}

    		if (/*symbol*/ ctx[3] === undefined && !("symbol" in props)) {
    			console.warn("<Element> was created without expected prop 'symbol'");
    		}

    		if (/*name*/ ctx[4] === undefined && !("name" in props)) {
    			console.warn("<Element> was created without expected prop 'name'");
    		}

    		if (/*mass*/ ctx[5] === undefined && !("mass" in props)) {
    			console.warn("<Element> was created without expected prop 'mass'");
    		}

    		if (/*RCow*/ ctx[13] === undefined && !("RCow" in props)) {
    			console.warn("<Element> was created without expected prop 'RCow'");
    		}

    		if (/*RVdW*/ ctx[14] === undefined && !("RVdW" in props)) {
    			console.warn("<Element> was created without expected prop 'RVdW'");
    		}

    		if (/*maxBonds*/ ctx[15] === undefined && !("maxBonds" in props)) {
    			console.warn("<Element> was created without expected prop 'maxBonds'");
    		}

    		if (/*color*/ ctx[6] === undefined && !("color" in props)) {
    			console.warn("<Element> was created without expected prop 'color'");
    		}

    		if (/*color2*/ ctx[16] === undefined && !("color2" in props)) {
    			console.warn("<Element> was created without expected prop 'color2'");
    		}

    		if (/*posX*/ ctx[17] === undefined && !("posX" in props)) {
    			console.warn("<Element> was created without expected prop 'posX'");
    		}

    		if (/*posY*/ ctx[18] === undefined && !("posY" in props)) {
    			console.warn("<Element> was created without expected prop 'posY'");
    		}

    		if (/*visible*/ ctx[7] === undefined && !("visible" in props)) {
    			console.warn("<Element> was created without expected prop 'visible'");
    		}

    		if (/*count*/ ctx[8] === undefined && !("count" in props)) {
    			console.warn("<Element> was created without expected prop 'count'");
    		}

    		if (/*updateAtom*/ ctx[9] === undefined && !("updateAtom" in props)) {
    			console.warn("<Element> was created without expected prop 'updateAtom'");
    		}

    		if (/*inactive*/ ctx[10] === undefined && !("inactive" in props)) {
    			console.warn("<Element> was created without expected prop 'inactive'");
    		}
    	}

    	get detail() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set detail(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get variant() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set variant(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get symbol() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set symbol(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mass() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mass(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get RCow() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set RCow(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get RVdW() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set RVdW(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxBonds() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxBonds(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color2() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color2(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get posX() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set posX(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get posY() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set posY(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visible() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visible(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get count() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set count(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get updateAtom() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set updateAtom(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inactive() {
    		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inactive(value) {
    		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Atom.svelte generated by Svelte v3.19.1 */
    const file$3 = "src/Atom.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let canvas_1;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			canvas_1 = element("canvas");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			canvas_1 = claim_element(div_nodes, "CANVAS", { id: true, height: true, width: true });
    			children(canvas_1).forEach(detach_dev);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(canvas_1, "id", "atomCanvas");
    			attr_dev(canvas_1, "height", "150");
    			attr_dev(canvas_1, "width", "300");
    			add_location(canvas_1, file$3, 132, 2, 2795);
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(canvasStyle) + " svelte-18iom2i"));
    			add_location(div, file$3, 131, 0, 2767);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, canvas_1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { atom } = $$props;
    	let electrons = atom.id;
    	let i = 0;
    	let z = 0;
    	let canvas;
    	let ctx;
    	let electronsAnim;
    	let drawAnim;

    	function draw() {
    		const h = canvas.height;
    		const w = canvas.width;

    		var circle = function (color, r) {
    			ctx.fillStyle = color;
    			ctx.beginPath();
    			ctx.arc(0, 0, r, 0, 2 * Math.PI, true);
    			ctx.closePath();
    			ctx.fill();
    		};

    		ctx.save();
    		ctx.fillStyle = "white";
    		ctx.fillRect(0, 0, w, h);

    		// set origin to center
    		ctx.translate(w / 2, h / 2);

    		// draw sun
    		circle("#999999", 5);

    		ctx.restore();
    		drawAnim = window.requestAnimationFrame(draw);
    	}

    	let rotation = 0;
    	let speed = 0;

    	function drawElectron(e) {
    		const idx = e && e < electrons ? e : electrons;

    		return function () {
    			ctx.save();
    			const h = canvas.height;
    			const w = canvas.width;
    			const v = idx * 20;

    			var valence = r => {
    				ctx.beginPath();
    				ctx.arc(0, 0, r, 0, 2 * Math.PI, true);
    				ctx.closePath();
    				ctx.strokeStyle = "#ccc";
    				ctx.stroke();
    			};

    			var circle = function (color, r) {
    				ctx.fillStyle = color;
    				ctx.beginPath();
    				ctx.arc(0, 0, r, 0, 2 * Math.PI, true);
    				ctx.closePath();
    				ctx.fill();
    			};

    			// set origin to center
    			ctx.translate(w / 2, h / 2);

    			valence(v);

    			// rotate + move along x
    			// ctx.rotate(rotation/(v));
    			ctx.translate(v, 0);

    			// draw planet
    			circle("red", 2);

    			rotation += 0.04;
    			electronsAnim = window.requestAnimationFrame(drawElectron(idx));
    			ctx.restore();
    		};
    	}

    	const redraw = () => {
    		if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    		rotation = 0;
    		electrons = 0;
    		electrons = atom.id;
    		ctx.restore();
    		if (electronsAnim) cancelAnimationFrame(electronsAnim);
    		if (drawAnim) cancelAnimationFrame(drawAnim);
    		draw();

    		for (let e = 0; e <= electrons; e++) {
    			electronsAnim = window.requestAnimationFrame(drawElectron(e));
    		}
    	};

    	onMount(() => {
    		canvas = document.getElementById("atomCanvas");
    		ctx = canvas.getContext("2d");
    		redraw();
    	});

    	afterUpdate(() => {
    		ctx.save();
    		redraw();
    	});

    	const writable_props = ["atom"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Atom> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("atom" in $$props) $$invalidate(0, atom = $$props.atom);
    	};

    	$$self.$capture_state = () => ({
    		canvasStyle,
    		onMount,
    		afterUpdate,
    		atom,
    		electrons,
    		i,
    		z,
    		canvas,
    		ctx,
    		electronsAnim,
    		drawAnim,
    		draw,
    		rotation,
    		speed,
    		drawElectron,
    		redraw,
    		Math,
    		window,
    		cancelAnimationFrame,
    		document
    	});

    	$$self.$inject_state = $$props => {
    		if ("atom" in $$props) $$invalidate(0, atom = $$props.atom);
    		if ("electrons" in $$props) electrons = $$props.electrons;
    		if ("i" in $$props) i = $$props.i;
    		if ("z" in $$props) z = $$props.z;
    		if ("canvas" in $$props) canvas = $$props.canvas;
    		if ("ctx" in $$props) ctx = $$props.ctx;
    		if ("electronsAnim" in $$props) electronsAnim = $$props.electronsAnim;
    		if ("drawAnim" in $$props) drawAnim = $$props.drawAnim;
    		if ("rotation" in $$props) rotation = $$props.rotation;
    		if ("speed" in $$props) speed = $$props.speed;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [atom];
    }

    class Atom extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, { atom: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Atom",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*atom*/ ctx[0] === undefined && !("atom" in props)) {
    			console.warn("<Atom> was created without expected prop 'atom'");
    		}
    	}

    	get atom() {
    		throw new Error("<Atom>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set atom(value) {
    		throw new Error("<Atom>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ElementDetail.svelte generated by Svelte v3.19.1 */
    const file$4 = "src/ElementDetail.svelte";

    // (94:0) {:else}
    function create_else_block$1(ctx) {
    	let div3;
    	let svg;
    	let if_block0_anchor;
    	let if_block1_anchor;
    	let svg_class_value;
    	let t0;
    	let button0;
    	let t1;
    	let t2;
    	let h3;
    	let t3_value = /*atom*/ ctx[3].name + "";
    	let t3;
    	let t4;
    	let div0;
    	let t5;
    	let div1;
    	let t6;
    	let t7;
    	let div2;
    	let button1;
    	let t8;
    	let div3_intro;
    	let div3_outro;
    	let current;
    	let dispose;
    	let if_block0 = /*direction*/ ctx[5] === "left" && create_if_block_3$1(ctx);
    	let if_block1 = /*direction*/ ctx[5] === "top" && create_if_block_2$1(ctx);
    	let if_block2 = /*direction*/ ctx[5] === "right" && create_if_block_1$1(ctx);

    	const atom_1 = new Atom({
    			props: { atom: /*atom*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			svg = svg_element("svg");
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			if (if_block2) if_block2.c();
    			t0 = space();
    			button0 = element("button");
    			t1 = text("x");
    			t2 = space();
    			h3 = element("h3");
    			t3 = text(t3_value);
    			t4 = space();
    			div0 = element("div");
    			create_component(atom_1.$$.fragment);
    			t5 = space();
    			div1 = element("div");
    			t6 = text("Lorem ipsum");
    			t7 = space();
    			div2 = element("div");
    			button1 = element("button");
    			t8 = text("More");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div3 = claim_element(nodes, "DIV", { class: true, style: true });
    			var div3_nodes = children(div3);

    			svg = claim_element(
    				div3_nodes,
    				"svg",
    				{
    					class: true,
    					width: true,
    					height: true,
    					xmlns: true
    				},
    				1
    			);

    			var svg_nodes = children(svg);
    			if (if_block0) if_block0.l(svg_nodes);
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.l(svg_nodes);
    			if_block1_anchor = empty();
    			if (if_block2) if_block2.l(svg_nodes);
    			svg_nodes.forEach(detach_dev);
    			t0 = claim_space(div3_nodes);
    			button0 = claim_element(div3_nodes, "BUTTON", { class: true });
    			var button0_nodes = children(button0);
    			t1 = claim_text(button0_nodes, "x");
    			button0_nodes.forEach(detach_dev);
    			t2 = claim_space(div3_nodes);
    			h3 = claim_element(div3_nodes, "H3", {});
    			var h3_nodes = children(h3);
    			t3 = claim_text(h3_nodes, t3_value);
    			h3_nodes.forEach(detach_dev);
    			t4 = claim_space(div3_nodes);
    			div0 = claim_element(div3_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			claim_component(atom_1.$$.fragment, div0_nodes);
    			div0_nodes.forEach(detach_dev);
    			t5 = claim_space(div3_nodes);
    			div1 = claim_element(div3_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			t6 = claim_text(div1_nodes, "Lorem ipsum");
    			div1_nodes.forEach(detach_dev);
    			t7 = claim_space(div3_nodes);
    			div2 = claim_element(div3_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			button1 = claim_element(div2_nodes, "BUTTON", {});
    			var button1_nodes = children(button1);
    			t8 = claim_text(button1_nodes, "More");
    			button1_nodes.forEach(detach_dev);
    			div2_nodes.forEach(detach_dev);
    			div3_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(svg, "class", svg_class_value = "pointer-" + /*direction*/ ctx[5] + " svelte-10jqglw");
    			attr_dev(svg, "width", "30");
    			attr_dev(svg, "height", "30");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$4, 100, 4, 2366);
    			attr_dev(button0, "class", "close svelte-10jqglw");
    			add_location(button0, file$4, 118, 4, 3104);
    			add_location(h3, file$4, 119, 4, 3158);
    			attr_dev(div0, "class", "atom-card svelte-10jqglw");
    			add_location(div0, file$4, 120, 4, 3183);
    			attr_dev(div1, "class", "detail-body py-4");
    			add_location(div1, file$4, 123, 4, 3249);
    			add_location(button1, file$4, 127, 31, 3341);
    			attr_dev(div2, "class", "detail-footer");
    			add_location(div2, file$4, 127, 4, 3314);
    			attr_dev(div3, "class", "detail-card svelte-10jqglw");
    			set_style(div3, "left", /*x*/ ctx[0] + "px");
    			set_style(div3, "top", /*y*/ ctx[1] + "px");
    			add_location(div3, file$4, 94, 2, 2206);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, svg);
    			if (if_block0) if_block0.m(svg, null);
    			append_dev(svg, if_block0_anchor);
    			if (if_block1) if_block1.m(svg, null);
    			append_dev(svg, if_block1_anchor);
    			if (if_block2) if_block2.m(svg, null);
    			append_dev(div3, t0);
    			append_dev(div3, button0);
    			append_dev(button0, t1);
    			append_dev(div3, t2);
    			append_dev(div3, h3);
    			append_dev(h3, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div0);
    			mount_component(atom_1, div0, null);
    			append_dev(div3, t5);
    			append_dev(div3, div1);
    			append_dev(div1, t6);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, button1);
    			append_dev(button1, t8);
    			/*div3_binding*/ ctx[15](div3);
    			current = true;

    			dispose = [
    				listen_dev(
    					button0,
    					"click",
    					function () {
    						if (is_function(/*close*/ ctx[4])) /*close*/ ctx[4].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(button1, "click", /*handleFullDetail*/ ctx[8], false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*direction*/ ctx[5] === "left") {
    				if (!if_block0) {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					if_block0.m(svg, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*direction*/ ctx[5] === "top") {
    				if (!if_block1) {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(svg, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*direction*/ ctx[5] === "right") {
    				if (!if_block2) {
    					if_block2 = create_if_block_1$1(ctx);
    					if_block2.c();
    					if_block2.m(svg, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!current || dirty & /*direction*/ 32 && svg_class_value !== (svg_class_value = "pointer-" + /*direction*/ ctx[5] + " svelte-10jqglw")) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if ((!current || dirty & /*atom*/ 8) && t3_value !== (t3_value = /*atom*/ ctx[3].name + "")) set_data_dev(t3, t3_value);
    			const atom_1_changes = {};
    			if (dirty & /*atom*/ 8) atom_1_changes.atom = /*atom*/ ctx[3];
    			atom_1.$set(atom_1_changes);

    			if (!current || dirty & /*x*/ 1) {
    				set_style(div3, "left", /*x*/ ctx[0] + "px");
    			}

    			if (!current || dirty & /*y*/ 2) {
    				set_style(div3, "top", /*y*/ ctx[1] + "px");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(atom_1.$$.fragment, local);

    			add_render_callback(() => {
    				if (div3_outro) div3_outro.end(1);
    				if (!div3_intro) div3_intro = create_in_transition(div3, fly, /*flyOptions*/ ctx[7]);
    				div3_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(atom_1.$$.fragment, local);
    			if (div3_intro) div3_intro.invalidate();
    			div3_outro = create_out_transition(div3, fly, /*flyOptions*/ ctx[7]);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_component(atom_1);
    			/*div3_binding*/ ctx[15](null);
    			if (detaching && div3_outro) div3_outro.end();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(94:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (76:0) {#if fullDetail}
    function create_if_block$1(ctx) {
    	let div1;
    	let button;
    	let t0;
    	let t1;
    	let t2;
    	let div0;
    	let t3;
    	let div1_transition;
    	let current;
    	let dispose;
    	const element_1_spread_levels = [{ detail: true }, /*atom*/ ctx[3]];
    	let element_1_props = {};

    	for (let i = 0; i < element_1_spread_levels.length; i += 1) {
    		element_1_props = assign(element_1_props, element_1_spread_levels[i]);
    	}

    	const element_1 = new Element({ props: element_1_props, $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			button = element("button");
    			t0 = text("x");
    			t1 = space();
    			create_component(element_1.$$.fragment);
    			t2 = space();
    			div0 = element("div");
    			t3 = text("Lorem ipsum");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div1 = claim_element(nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			button = claim_element(div1_nodes, "BUTTON", { class: true });
    			var button_nodes = children(button);
    			t0 = claim_text(button_nodes, "x");
    			button_nodes.forEach(detach_dev);
    			t1 = claim_space(div1_nodes);
    			claim_component(element_1.$$.fragment, div1_nodes);
    			t2 = claim_space(div1_nodes);
    			div0 = claim_element(div1_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			t3 = claim_text(div0_nodes, "Lorem ipsum");
    			div0_nodes.forEach(detach_dev);
    			div1_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(button, "class", "close svelte-10jqglw");
    			add_location(button, file$4, 82, 2, 1941);
    			attr_dev(div0, "class", "detail-body py-4");
    			add_location(div0, file$4, 87, 2, 2129);
    			attr_dev(div1, "class", "detail-card full svelte-10jqglw");
    			add_location(div1, file$4, 76, 2, 1850);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button);
    			append_dev(button, t0);
    			append_dev(div1, t1);
    			mount_component(element_1, div1, null);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, t3);
    			/*div1_binding*/ ctx[14](div1);
    			current = true;

    			dispose = listen_dev(
    				button,
    				"click",
    				function () {
    					if (is_function((/*click_handler*/ ctx[13], /*close*/ ctx[4]()))) (/*click_handler*/ ctx[13], /*close*/ ctx[4]()).apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			const element_1_changes = (dirty & /*atom*/ 8)
    			? get_spread_update(element_1_spread_levels, [element_1_spread_levels[0], get_spread_object(/*atom*/ ctx[3])])
    			: {};

    			element_1.$set(element_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(element_1.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fly, {}, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(element_1.$$.fragment, local);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fly, {}, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(element_1);
    			/*div1_binding*/ ctx[14](null);
    			if (detaching && div1_transition) div1_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(76:0) {#if fullDetail}",
    		ctx
    	});

    	return block;
    }

    // (102:6) {#if direction === "left"}
    function create_if_block_3$1(ctx) {
    	let g;
    	let rect;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			rect = svg_element("rect");
    			this.h();
    		},
    		l: function claim(nodes) {
    			g = claim_element(nodes, "g", { transform: true }, 1);
    			var g_nodes = children(g);

    			rect = claim_element(
    				g_nodes,
    				"rect",
    				{
    					width: true,
    					height: true,
    					fill: true,
    					stroke: true,
    					"stroke-dasharray": true
    				},
    				1
    			);

    			children(rect).forEach(detach_dev);
    			g_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(rect, "width", "15");
    			attr_dev(rect, "height", "15");
    			attr_dev(rect, "fill", "white");
    			attr_dev(rect, "stroke", "#ccc");
    			attr_dev(rect, "stroke-dasharray", "15 15 0");
    			add_location(rect, file$4, 103, 10, 2554);
    			attr_dev(g, "transform", "translate(4, 10) rotate(-45)");
    			add_location(g, file$4, 102, 8, 2499);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, rect);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(102:6) {#if direction === \\\"left\\\"}",
    		ctx
    	});

    	return block;
    }

    // (107:6) {#if direction === "top"}
    function create_if_block_2$1(ctx) {
    	let g;
    	let rect;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			rect = svg_element("rect");
    			this.h();
    		},
    		l: function claim(nodes) {
    			g = claim_element(nodes, "g", { transform: true }, 1);
    			var g_nodes = children(g);

    			rect = claim_element(
    				g_nodes,
    				"rect",
    				{
    					width: true,
    					height: true,
    					fill: true,
    					stroke: true,
    					"stroke-dasharray": true
    				},
    				1
    			);

    			children(rect).forEach(detach_dev);
    			g_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(rect, "width", "15");
    			attr_dev(rect, "height", "15");
    			attr_dev(rect, "fill", "white");
    			attr_dev(rect, "stroke", "#ccc");
    			attr_dev(rect, "stroke-dasharray", "15 15 0");
    			add_location(rect, file$4, 108, 10, 2765);
    			attr_dev(g, "transform", "translate(4, 10) rotate(-135 7 7)");
    			add_location(g, file$4, 107, 8, 2705);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, rect);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(107:6) {#if direction === \\\"top\\\"}",
    		ctx
    	});

    	return block;
    }

    // (112:6) {#if direction === "right"}
    function create_if_block_1$1(ctx) {
    	let g;
    	let rect;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			rect = svg_element("rect");
    			this.h();
    		},
    		l: function claim(nodes) {
    			g = claim_element(nodes, "g", { transform: true }, 1);
    			var g_nodes = children(g);

    			rect = claim_element(
    				g_nodes,
    				"rect",
    				{
    					width: true,
    					height: true,
    					fill: true,
    					stroke: true,
    					"stroke-dasharray": true
    				},
    				1
    			);

    			children(rect).forEach(detach_dev);
    			g_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(rect, "width", "15");
    			attr_dev(rect, "height", "15");
    			attr_dev(rect, "fill", "white");
    			attr_dev(rect, "stroke", "#ccc");
    			attr_dev(rect, "stroke-dasharray", "15 15 0");
    			add_location(rect, file$4, 113, 10, 2977);
    			attr_dev(g, "transform", "translate(4, 10) rotate(135 7 7)");
    			add_location(g, file$4, 112, 8, 2918);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, rect);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(112:6) {#if direction === \\\"right\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*fullDetail*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { atom } = $$props;
    	let { close } = $$props;
    	let { selectedEl } = $$props;
    	let { x } = $$props;
    	let { y } = $$props;
    	let { direction } = $$props;
    	let { fullDetail = false } = $$props;
    	let detailElement;
    	let detailRect = { height: 0 };
    	let scrollY;

    	const handleFullDetail = () => {
    		$$invalidate(2, fullDetail = true);
    	};

    	const getFlyOptions = dir => {
    		let opts;

    		switch (dir) {
    			case "top":
    				opts = { y: -5, speed: 50 };
    				break;
    			case "left":
    				opts = { x: -5, speed: 50 };
    				break;
    			case "right":
    				opts = { x: 10, speed: 50 };
    				break;
    			default:
    				opts = { y: -5, speed: 50 };
    		}

    		return opts;
    	};

    	onMount(() => {
    		detailRect = detailElement.getBoundingClientRect();
    	});

    	afterUpdate(() => {
    		scrollY = window.scrollY;
    		scrollX = window.scrollX;

    		if (direction === "left") {
    			$$invalidate(0, x = selectedEl.x + selectedEl.width + 15);
    			$$invalidate(1, y = selectedEl.y - (detailRect.height / 2 - selectedEl.height / 2) + scrollY);
    		}

    		if (direction === "top") {
    			$$invalidate(0, x = selectedEl.x - (detailRect.width / 2 - selectedEl.width / 2) + scrollX);
    			$$invalidate(1, y = selectedEl.y - detailRect.height - 15 + scrollY);
    		}

    		if (direction === "right") {
    			$$invalidate(0, x = selectedEl.x - (detailRect.width + 15));
    			$$invalidate(1, y = selectedEl.y - (detailRect.height / 2 - selectedEl.height / 2) + scrollY);
    		}
    	});

    	const writable_props = ["atom", "close", "selectedEl", "x", "y", "direction", "fullDetail"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ElementDetail> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(2, fullDetail = false);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(6, detailElement = $$value);
    		});
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(6, detailElement = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("atom" in $$props) $$invalidate(3, atom = $$props.atom);
    		if ("close" in $$props) $$invalidate(4, close = $$props.close);
    		if ("selectedEl" in $$props) $$invalidate(9, selectedEl = $$props.selectedEl);
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("direction" in $$props) $$invalidate(5, direction = $$props.direction);
    		if ("fullDetail" in $$props) $$invalidate(2, fullDetail = $$props.fullDetail);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		afterUpdate,
    		fly,
    		slide,
    		Atom,
    		Element,
    		atom,
    		close,
    		selectedEl,
    		x,
    		y,
    		direction,
    		fullDetail,
    		detailElement,
    		detailRect,
    		scrollY,
    		handleFullDetail,
    		getFlyOptions,
    		flyOptions,
    		window,
    		scrollX
    	});

    	$$self.$inject_state = $$props => {
    		if ("atom" in $$props) $$invalidate(3, atom = $$props.atom);
    		if ("close" in $$props) $$invalidate(4, close = $$props.close);
    		if ("selectedEl" in $$props) $$invalidate(9, selectedEl = $$props.selectedEl);
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("direction" in $$props) $$invalidate(5, direction = $$props.direction);
    		if ("fullDetail" in $$props) $$invalidate(2, fullDetail = $$props.fullDetail);
    		if ("detailElement" in $$props) $$invalidate(6, detailElement = $$props.detailElement);
    		if ("detailRect" in $$props) detailRect = $$props.detailRect;
    		if ("scrollY" in $$props) scrollY = $$props.scrollY;
    		if ("flyOptions" in $$props) $$invalidate(7, flyOptions = $$props.flyOptions);
    	};

    	let flyOptions;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*direction*/ 32) {
    			 $$invalidate(7, flyOptions = getFlyOptions(direction));
    		}
    	};

    	return [
    		x,
    		y,
    		fullDetail,
    		atom,
    		close,
    		direction,
    		detailElement,
    		flyOptions,
    		handleFullDetail,
    		selectedEl,
    		detailRect,
    		scrollY,
    		getFlyOptions,
    		click_handler,
    		div1_binding,
    		div3_binding
    	];
    }

    class ElementDetail extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$5, safe_not_equal, {
    			atom: 3,
    			close: 4,
    			selectedEl: 9,
    			x: 0,
    			y: 1,
    			direction: 5,
    			fullDetail: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ElementDetail",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*atom*/ ctx[3] === undefined && !("atom" in props)) {
    			console.warn("<ElementDetail> was created without expected prop 'atom'");
    		}

    		if (/*close*/ ctx[4] === undefined && !("close" in props)) {
    			console.warn("<ElementDetail> was created without expected prop 'close'");
    		}

    		if (/*selectedEl*/ ctx[9] === undefined && !("selectedEl" in props)) {
    			console.warn("<ElementDetail> was created without expected prop 'selectedEl'");
    		}

    		if (/*x*/ ctx[0] === undefined && !("x" in props)) {
    			console.warn("<ElementDetail> was created without expected prop 'x'");
    		}

    		if (/*y*/ ctx[1] === undefined && !("y" in props)) {
    			console.warn("<ElementDetail> was created without expected prop 'y'");
    		}

    		if (/*direction*/ ctx[5] === undefined && !("direction" in props)) {
    			console.warn("<ElementDetail> was created without expected prop 'direction'");
    		}
    	}

    	get atom() {
    		throw new Error("<ElementDetail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set atom(value) {
    		throw new Error("<ElementDetail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get close() {
    		throw new Error("<ElementDetail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set close(value) {
    		throw new Error("<ElementDetail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectedEl() {
    		throw new Error("<ElementDetail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedEl(value) {
    		throw new Error("<ElementDetail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<ElementDetail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<ElementDetail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<ElementDetail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<ElementDetail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get direction() {
    		throw new Error("<ElementDetail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set direction(value) {
    		throw new Error("<ElementDetail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fullDetail() {
    		throw new Error("<ElementDetail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fullDetail(value) {
    		throw new Error("<ElementDetail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Table.svelte generated by Svelte v3.19.1 */
    const file$5 = "src/Table.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (27:0) {#if atom}
    function create_if_block_1$2(ctx) {
    	let current;

    	const elementdetail = new ElementDetail({
    			props: {
    				selectedEl: /*selectedEl*/ ctx[2],
    				direction: /*detailDirection*/ ctx[3],
    				atom: /*atom*/ ctx[0],
    				close: /*func*/ ctx[6]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(elementdetail.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(elementdetail.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(elementdetail, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const elementdetail_changes = {};
    			if (dirty & /*selectedEl*/ 4) elementdetail_changes.selectedEl = /*selectedEl*/ ctx[2];
    			if (dirty & /*detailDirection*/ 8) elementdetail_changes.direction = /*detailDirection*/ ctx[3];
    			if (dirty & /*atom*/ 1) elementdetail_changes.atom = /*atom*/ ctx[0];
    			if (dirty & /*atom*/ 1) elementdetail_changes.close = /*func*/ ctx[6];
    			elementdetail.$set(elementdetail_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(elementdetail.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(elementdetail.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(elementdetail, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(27:0) {#if atom}",
    		ctx
    	});

    	return block;
    }

    // (36:4) {#if row}
    function create_if_block$2(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*row*/ ctx[8];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*el*/ ctx[11].uuid;
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(nodes);
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*toggleDetail, rows*/ 18) {
    				const each_value_1 = /*row*/ ctx[8];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block_1, each_1_anchor, get_each_context_1);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(36:4) {#if row}",
    		ctx
    	});

    	return block;
    }

    // (37:6) {#each row as el (el.uuid)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let current;

    	function func_1(...args) {
    		return /*func_1*/ ctx[7](/*el*/ ctx[11], ...args);
    	}

    	const element_1_spread_levels = [{ updateAtom: func_1 }, { count: /*row*/ ctx[8].length }, /*el*/ ctx[11]];
    	let element_1_props = {};

    	for (let i = 0; i < element_1_spread_levels.length; i += 1) {
    		element_1_props = assign(element_1_props, element_1_spread_levels[i]);
    	}

    	const element_1 = new Element({ props: element_1_props, $$inline: true });

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(element_1.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			first = empty();
    			claim_component(element_1.$$.fragment, nodes);
    			this.h();
    		},
    		h: function hydrate() {
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(element_1, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			const element_1_changes = (dirty & /*toggleDetail, rows*/ 18)
    			? get_spread_update(element_1_spread_levels, [
    					element_1_spread_levels[0],
    					dirty & /*rows*/ 2 && { count: /*row*/ ctx[8].length },
    					dirty & /*rows*/ 2 && get_spread_object(/*el*/ ctx[11])
    				])
    			: {};

    			element_1.$set(element_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(element_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(element_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(element_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(37:6) {#each row as el (el.uuid)}",
    		ctx
    	});

    	return block;
    }

    // (35:2) {#each rows as row}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*row*/ ctx[8] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*row*/ ctx[8]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(35:2) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let t;
    	let div;
    	let current;
    	let if_block = /*atom*/ ctx[0] && create_if_block_1$2(ctx);
    	let each_value = /*rows*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			t = claim_space(nodes);
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div_nodes);
    			}

    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "svelte-126gplm");
    			add_location(div, file$5, 33, 0, 859);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*atom*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*rows, toggleDetail*/ 18) {
    				each_value = /*rows*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { rows } = $$props;
    	let { atom } = $$props;
    	let { updateAtom } = $$props;
    	let selectedEl;
    	let detailDirection = "left";

    	const toggleDetail = (el, dom, direction) => {
    		if (dom) {
    			$$invalidate(0, atom = el);
    			$$invalidate(2, selectedEl = dom.getBoundingClientRect());
    			$$invalidate(3, detailDirection = direction);
    		}
    	};

    	const writable_props = ["rows", "atom", "updateAtom"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Table> was created with unknown prop '${key}'`);
    	});

    	const func = () => $$invalidate(0, atom = null);
    	const func_1 = (el, domEl, direction) => toggleDetail(el, domEl, direction);

    	$$self.$set = $$props => {
    		if ("rows" in $$props) $$invalidate(1, rows = $$props.rows);
    		if ("atom" in $$props) $$invalidate(0, atom = $$props.atom);
    		if ("updateAtom" in $$props) $$invalidate(5, updateAtom = $$props.updateAtom);
    	};

    	$$self.$capture_state = () => ({
    		Element,
    		ElementDetail,
    		rows,
    		atom,
    		updateAtom,
    		selectedEl,
    		detailDirection,
    		toggleDetail
    	});

    	$$self.$inject_state = $$props => {
    		if ("rows" in $$props) $$invalidate(1, rows = $$props.rows);
    		if ("atom" in $$props) $$invalidate(0, atom = $$props.atom);
    		if ("updateAtom" in $$props) $$invalidate(5, updateAtom = $$props.updateAtom);
    		if ("selectedEl" in $$props) $$invalidate(2, selectedEl = $$props.selectedEl);
    		if ("detailDirection" in $$props) $$invalidate(3, detailDirection = $$props.detailDirection);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		atom,
    		rows,
    		selectedEl,
    		detailDirection,
    		toggleDetail,
    		updateAtom,
    		func,
    		func_1
    	];
    }

    class Table extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, { rows: 1, atom: 0, updateAtom: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Table",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*rows*/ ctx[1] === undefined && !("rows" in props)) {
    			console.warn("<Table> was created without expected prop 'rows'");
    		}

    		if (/*atom*/ ctx[0] === undefined && !("atom" in props)) {
    			console.warn("<Table> was created without expected prop 'atom'");
    		}

    		if (/*updateAtom*/ ctx[5] === undefined && !("updateAtom" in props)) {
    			console.warn("<Table> was created without expected prop 'updateAtom'");
    		}
    	}

    	get rows() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get atom() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set atom(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get updateAtom() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set updateAtom(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Grid.svelte generated by Svelte v3.19.1 */
    const file$6 = "src/Grid.svelte";

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (30:0) {#if atom}
    function create_if_block_2$2(ctx) {
    	let current;

    	const elementdetail = new ElementDetail({
    			props: {
    				selectedEl: /*selectedEl*/ ctx[3],
    				direction: /*detailDirection*/ ctx[4],
    				atom: /*atom*/ ctx[0],
    				fullDetail: /*variant*/ ctx[2] !== "laptop",
    				close: /*func*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(elementdetail.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(elementdetail.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(elementdetail, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const elementdetail_changes = {};
    			if (dirty & /*selectedEl*/ 8) elementdetail_changes.selectedEl = /*selectedEl*/ ctx[3];
    			if (dirty & /*detailDirection*/ 16) elementdetail_changes.direction = /*detailDirection*/ ctx[4];
    			if (dirty & /*atom*/ 1) elementdetail_changes.atom = /*atom*/ ctx[0];
    			if (dirty & /*variant*/ 4) elementdetail_changes.fullDetail = /*variant*/ ctx[2] !== "laptop";
    			if (dirty & /*atom*/ 1) elementdetail_changes.close = /*func*/ ctx[7];
    			elementdetail.$set(elementdetail_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(elementdetail.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(elementdetail.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(elementdetail, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(30:0) {#if atom}",
    		ctx
    	});

    	return block;
    }

    // (43:8) {#if cell.title}
    function create_if_block_1$3(ctx) {
    	let t_value = /*cell*/ ctx[12].title + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		l: function claim(nodes) {
    			t = claim_text(nodes, t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rows*/ 2 && t_value !== (t_value = /*cell*/ ctx[12].title + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(43:8) {#if cell.title}",
    		ctx
    	});

    	return block;
    }

    // (46:8) {#if cell.symbol}
    function create_if_block$3(ctx) {
    	let current;

    	function func_1(...args) {
    		return /*func_1*/ ctx[8](/*cell*/ ctx[12], ...args);
    	}

    	const element_1_spread_levels = [
    		{ variant: /*variant*/ ctx[2] },
    		{ updateAtom: func_1 },
    		{ count: /*row*/ ctx[9].length },
    		/*cell*/ ctx[12]
    	];

    	let element_1_props = {};

    	for (let i = 0; i < element_1_spread_levels.length; i += 1) {
    		element_1_props = assign(element_1_props, element_1_spread_levels[i]);
    	}

    	const element_1 = new Element({ props: element_1_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(element_1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(element_1.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(element_1, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			const element_1_changes = (dirty & /*variant, toggleDetail, rows*/ 38)
    			? get_spread_update(element_1_spread_levels, [
    					dirty & /*variant*/ 4 && { variant: /*variant*/ ctx[2] },
    					dirty & /*toggleDetail, rows*/ 34 && { updateAtom: func_1 },
    					dirty & /*rows*/ 2 && { count: /*row*/ ctx[9].length },
    					dirty & /*rows*/ 2 && get_spread_object(/*cell*/ ctx[12])
    				])
    			: {};

    			element_1.$set(element_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(element_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(element_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(element_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(46:8) {#if cell.symbol}",
    		ctx
    	});

    	return block;
    }

    // (41:4) {#each row as cell(cell.uuid)}
    function create_each_block_1$1(key_1, ctx) {
    	let div;
    	let t0;
    	let t1;
    	let current;
    	let if_block0 = /*cell*/ ctx[12].title && create_if_block_1$3(ctx);
    	let if_block1 = /*cell*/ ctx[12].symbol && create_if_block$3(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			if (if_block0) if_block0.l(div_nodes);
    			t0 = claim_space(div_nodes);
    			if (if_block1) if_block1.l(div_nodes);
    			t1 = claim_space(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "grid-cell svelte-1bd9b6g");
    			toggle_class(div, "title-row", /*cell*/ ctx[12].titleRow);
    			toggle_class(div, "title-column", /*cell*/ ctx[12].titleColumn);
    			add_location(div, file$6, 41, 6, 1053);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*cell*/ ctx[12].title) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$3(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*cell*/ ctx[12].symbol) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*rows*/ 2) {
    				toggle_class(div, "title-row", /*cell*/ ctx[12].titleRow);
    			}

    			if (dirty & /*rows*/ 2) {
    				toggle_class(div, "title-column", /*cell*/ ctx[12].titleColumn);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(41:4) {#each row as cell(cell.uuid)}",
    		ctx
    	});

    	return block;
    }

    // (40:2) {#each rows as row}
    function create_each_block$1(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*row*/ ctx[9];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*cell*/ ctx[12].uuid;
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(nodes);
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rows, variant, toggleDetail*/ 38) {
    				const each_value_1 = /*row*/ ctx[9];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block_1$1, each_1_anchor, get_each_context_1$1);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(40:2) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let t;
    	let div;
    	let div_class_value;
    	let current;
    	let if_block = /*atom*/ ctx[0] && create_if_block_2$2(ctx);
    	let each_value = /*rows*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			t = claim_space(nodes);
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div_nodes);
    			}

    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", div_class_value = "grid-container " + /*variant*/ ctx[2] + "-screen" + " svelte-1bd9b6g");
    			add_location(div, file$6, 38, 0, 944);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*atom*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_2$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*rows, variant, toggleDetail*/ 38) {
    				each_value = /*rows*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*variant*/ 4 && div_class_value !== (div_class_value = "grid-container " + /*variant*/ ctx[2] + "-screen" + " svelte-1bd9b6g")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { rows } = $$props;
    	let { atom } = $$props;
    	let { updateAtom } = $$props;
    	let { variant = "laptop" } = $$props;
    	let selectedEl;
    	let detailDirection = "left";

    	const toggleDetail = (el, dom, direction) => {
    		if (dom) {
    			$$invalidate(0, atom = el);
    			$$invalidate(3, selectedEl = dom.getBoundingClientRect());
    			$$invalidate(4, detailDirection = direction);
    		}
    	};

    	const writable_props = ["rows", "atom", "updateAtom", "variant"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Grid> was created with unknown prop '${key}'`);
    	});

    	const func = () => $$invalidate(0, atom = null);
    	const func_1 = (cell, domEl, direction) => toggleDetail(cell, domEl, direction);

    	$$self.$set = $$props => {
    		if ("rows" in $$props) $$invalidate(1, rows = $$props.rows);
    		if ("atom" in $$props) $$invalidate(0, atom = $$props.atom);
    		if ("updateAtom" in $$props) $$invalidate(6, updateAtom = $$props.updateAtom);
    		if ("variant" in $$props) $$invalidate(2, variant = $$props.variant);
    	};

    	$$self.$capture_state = () => ({
    		gridCellStyle,
    		Element,
    		ElementDetail,
    		rows,
    		atom,
    		updateAtom,
    		variant,
    		selectedEl,
    		detailDirection,
    		toggleDetail
    	});

    	$$self.$inject_state = $$props => {
    		if ("rows" in $$props) $$invalidate(1, rows = $$props.rows);
    		if ("atom" in $$props) $$invalidate(0, atom = $$props.atom);
    		if ("updateAtom" in $$props) $$invalidate(6, updateAtom = $$props.updateAtom);
    		if ("variant" in $$props) $$invalidate(2, variant = $$props.variant);
    		if ("selectedEl" in $$props) $$invalidate(3, selectedEl = $$props.selectedEl);
    		if ("detailDirection" in $$props) $$invalidate(4, detailDirection = $$props.detailDirection);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		atom,
    		rows,
    		variant,
    		selectedEl,
    		detailDirection,
    		toggleDetail,
    		updateAtom,
    		func,
    		func_1
    	];
    }

    class Grid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$7, safe_not_equal, {
    			rows: 1,
    			atom: 0,
    			updateAtom: 6,
    			variant: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Grid",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*rows*/ ctx[1] === undefined && !("rows" in props)) {
    			console.warn("<Grid> was created without expected prop 'rows'");
    		}

    		if (/*atom*/ ctx[0] === undefined && !("atom" in props)) {
    			console.warn("<Grid> was created without expected prop 'atom'");
    		}

    		if (/*updateAtom*/ ctx[6] === undefined && !("updateAtom" in props)) {
    			console.warn("<Grid> was created without expected prop 'updateAtom'");
    		}
    	}

    	get rows() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get atom() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set atom(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get updateAtom() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set updateAtom(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get variant() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set variant(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
    // find the complete implementation of crypto (msCrypto) on IE11.
    var getRandomValues = typeof crypto != 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto != 'undefined' && typeof window.msCrypto.getRandomValues == 'function' && msCrypto.getRandomValues.bind(msCrypto);
    var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

    function rng() {
      if (!getRandomValues) {
        throw new Error('uuid: This browser does not seem to support crypto.getRandomValues(). If you need to support this browser, please provide a custom random number generator through options.rng.');
      }

      return getRandomValues(rnds8);
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */
    var byteToHex = [];

    for (var i = 0; i < 256; ++i) {
      byteToHex[i] = (i + 0x100).toString(16).substr(1);
    }

    function bytesToUuid(buf, offset) {
      var i = offset || 0;
      var bth = byteToHex; // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4

      return [bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]]].join('');
    }

    function v4(options, buf, offset) {
      var i = buf && offset || 0;

      if (typeof options == 'string') {
        buf = options === 'binary' ? new Array(16) : null;
        options = null;
      }

      options = options || {};
      var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

      if (buf) {
        for (var ii = 0; ii < 16; ++ii) {
          buf[i + ii] = rnds[ii];
        }
      }

      return buf || bytesToUuid(rnds);
    }

    var chemElements = createCommonjsModule(function (module, exports) {
    !function(o,s){module.exports=s();}("undefined"!=typeof self?self:commonjsGlobal,(function(){return function(o){var s={};function m(l){if(s[l])return s[l].exports;var a=s[l]={i:l,l:!1,exports:{}};return o[l].call(a.exports,a,a.exports,m),a.l=!0,a.exports}return m.m=o,m.c=s,m.d=function(o,s,l){m.o(o,s)||Object.defineProperty(o,s,{enumerable:!0,get:l});},m.r=function(o){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(o,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(o,"__esModule",{value:!0});},m.t=function(o,s){if(1&s&&(o=m(o)),8&s)return o;if(4&s&&"object"==typeof o&&o&&o.__esModule)return o;var l=Object.create(null);if(m.r(l),Object.defineProperty(l,"default",{enumerable:!0,value:o}),2&s&&"string"!=typeof o)for(var a in o)m.d(l,a,function(s){return o[s]}.bind(null,a));return l},m.n=function(o){var s=o&&o.__esModule?function(){return o.default}:function(){return o};return m.d(s,"a",s),s},m.o=function(o,s){return Object.prototype.hasOwnProperty.call(o,s)},m.p="",m(m.s=1)}([function(o,s,m){Object.defineProperty(s,"__esModule",{value:!0}),s.ChemElementData=[{id:0,symbol:"Q",RCow:.77,RVdW:0,maxBonds:0,mass:0,name:"Dummy",posX:1,posY:7,color:"#FFFFFF",color2:"#808080"},{id:1,symbol:"H",RCow:.37,RVdW:1.2,maxBonds:1,mass:1.00794,name:"Hydrogen",posX:1,posY:1,color:"#FFFFFF",color2:"#808080"},{id:1,symbol:"D",RCow:.37,RVdW:1.2,maxBonds:1,mass:2,name:"Diyterium",posX:1,posY:8,color:"#FFFFFF",color2:"#808080"},{id:2,symbol:"He",RCow:.32,RVdW:1.4,maxBonds:0,mass:4.002602,name:"Helium",posX:1,posY:18,color:"#D9FFFF",color2:"#849B9B"},{id:3,symbol:"Li",RCow:1.34,RVdW:2.2,maxBonds:1,mass:6.941,name:"Lithium",posX:2,posY:1,color:"#CC80FF",color2:"#C87EFA"},{id:4,symbol:"Be",RCow:.9,RVdW:1.9,maxBonds:2,mass:9.012182,name:"Beryllium",posX:2,posY:2,color:"#C2FF00",color2:"#82AB00"},{id:5,symbol:"B",RCow:.82,RVdW:1.8,maxBonds:3,mass:10.811,name:"Boron",posX:2,posY:13,color:"#FFB5B5",color2:"#F090A0"},{id:6,symbol:"C",RCow:.77,RVdW:1.7,maxBonds:4,mass:12.0107,name:"Carbon",posX:2,posY:14,color:"#909090",color2:"#000000"},{id:7,symbol:"N",RCow:.75,RVdW:1.6,maxBonds:4,mass:14.0067,name:"Nitrogen",posX:2,posY:15,color:"#3050F8",color2:"#304FF7"},{id:8,symbol:"O",RCow:.73,RVdW:1.55,maxBonds:2,mass:15.9994,name:"Oxygen",posX:2,posY:16,color:"#FF0D0D",color2:"#FF0D0D"},{id:9,symbol:"F",RCow:.71,RVdW:1.5,maxBonds:1,mass:18.9984032,name:"Fluorine",posX:2,posY:17,color:"#90E050",color2:"#228B22"},{id:10,symbol:"Ne",RCow:.69,RVdW:1.54,maxBonds:0,mass:20.1797,name:"Neon",posX:2,posY:18,color:"#B3E3F5",color2:"#7B9CA8"},{id:11,symbol:"Na",RCow:1.54,RVdW:2.4,maxBonds:1,mass:22.98977,name:"Sodium",posX:3,posY:1,color:"#AB5CF2",color2:"#AB5CF2"},{id:12,symbol:"Mg",RCow:1.3,RVdW:2.2,maxBonds:2,mass:24.305,name:"Magnesium",posX:3,posY:2,color:"#8AFF00",color2:"#61B400"},{id:13,symbol:"Al",RCow:1.18,RVdW:2.1,maxBonds:6,mass:26.981538,name:"Aluminium",posX:3,posY:13,color:"#BFA6A6",color2:"#A79191"},{id:14,symbol:"Si",RCow:1.11,RVdW:2.1,maxBonds:6,mass:28.0855,name:"Silicon",posX:3,posY:14,color:"#F0C8A0",color2:"#B09276"},{id:15,symbol:"P",RCow:1.06,RVdW:1.95,maxBonds:5,mass:30.973761,name:"Phosphorus",posX:3,posY:15,color:"#FF8000",color2:"#FF8000"},{id:16,symbol:"S",RCow:1.02,RVdW:1.8,maxBonds:6,mass:32.065,name:"Sulfur",posX:3,posY:16,color:"#FFFF30",color2:"#FFC832"},{id:17,symbol:"Cl",RCow:.99,RVdW:1.8,maxBonds:1,mass:35.453,name:"Chlorine",posX:3,posY:17,color:"#1FF01F",color2:"#1DC51D"},{id:18,symbol:"Ar",RCow:.97,RVdW:1.88,maxBonds:0,mass:39.948,name:"Argon",posX:3,posY:18,color:"#80D1E3",color2:"#63A2B0"},{id:19,symbol:"K",RCow:1.96,RVdW:2.8,maxBonds:1,mass:39.0983,name:"Potassium",posX:4,posY:1,color:"#8F40D4",color2:"#8F40D4"},{id:20,symbol:"Ca",RCow:1.74,RVdW:2.4,maxBonds:2,mass:40.078,name:"Calcium",posX:4,posY:2,color:"#3DFF00",color2:"#2FC300"},{id:21,symbol:"Sc",RCow:1.44,RVdW:2.3,maxBonds:6,mass:44.95591,name:"Scandium",posX:4,posY:3,color:"#E6E6E6",color2:"#969696"},{id:22,symbol:"Ti",RCow:1.36,RVdW:2.15,maxBonds:6,mass:47.867,name:"Titanium",posX:4,posY:4,color:"#BFC2C7",color2:"#94969A"},{id:23,symbol:"V",RCow:1.25,RVdW:2.05,maxBonds:6,mass:50.9415,name:"Vanadium",posX:4,posY:5,color:"#A6A6AB",color2:"#96969A"},{id:24,symbol:"Cr",RCow:1.27,RVdW:2.05,maxBonds:6,mass:51.9961,name:"Chromium",posX:4,posY:6,color:"#8A99C7",color2:"#8796C3"},{id:25,symbol:"Mn",RCow:1.39,RVdW:2.05,maxBonds:8,mass:54.938049,name:"Manganese",posX:4,posY:7,color:"#9C7AC7",color2:"#9C7AC7"},{id:26,symbol:"Fe",RCow:1.25,RVdW:2.05,maxBonds:6,mass:55.845,name:"Iron",posX:4,posY:8,color:"#E06633",color2:"#E06633"},{id:27,symbol:"Co",RCow:1.26,RVdW:2,maxBonds:6,mass:58.9332,name:"Cobalt",posX:4,posY:9,color:"#F090A0",color2:"#DB8293"},{id:28,symbol:"Ni",RCow:1.21,RVdW:2,maxBonds:6,mass:58.6934,name:"Nickel",posX:4,posY:10,color:"#50D050",color2:"#45B645"},{id:29,symbol:"Cu",RCow:1.38,RVdW:2,maxBonds:6,mass:63.546,name:"Copper",posX:4,posY:11,color:"#C88033",color2:"#C78033"},{id:30,symbol:"Zn",RCow:1.31,RVdW:2.1,maxBonds:6,mass:65.409,name:"Zinc",posX:4,posY:12,color:"#7D80B0",color2:"#7D80B0"},{id:31,symbol:"Ga",RCow:1.26,RVdW:2.1,maxBonds:3,mass:69.723,name:"Gallium",posX:4,posY:13,color:"#C28F8F",color2:"#BD8C8C"},{id:32,symbol:"Ge",RCow:1.22,RVdW:2.1,maxBonds:4,mass:72.64,name:"Germanium",posX:4,posY:14,color:"#668F8F",color2:"#668F8F"},{id:33,symbol:"As",RCow:1.19,RVdW:2.05,maxBonds:3,mass:74.9216,name:"Arsenic",posX:4,posY:15,color:"#BD80E3",color2:"#BD80E3"},{id:34,symbol:"Se",RCow:1.16,RVdW:1.9,maxBonds:2,mass:78.96,name:"Selenium",posX:4,posY:16,color:"#FFA100",color2:"#E28F00"},{id:35,symbol:"Br",RCow:1.14,RVdW:1.9,maxBonds:1,mass:79.904,name:"Bromine",posX:4,posY:17,color:"#A62929",color2:"#A62929"},{id:36,symbol:"Kr",RCow:1.1,RVdW:2.02,maxBonds:0,mass:83.798,name:"Krypton",posX:4,posY:18,color:"#5CB8D1",color2:"#53A6BC"},{id:37,symbol:"Rb",RCow:2.11,RVdW:2.9,maxBonds:1,mass:85.4678,name:"Rubidium",posX:5,posY:1,color:"#702EB0",color2:"#702EB0"},{id:38,symbol:"Sr",RCow:1.92,RVdW:2.55,maxBonds:2,mass:87.62,name:"Strontium",posX:5,posY:2,color:"#00FF00",color2:"#00D000"},{id:39,symbol:"Y",RCow:1.62,RVdW:2.4,maxBonds:6,mass:88.90585,name:"Yttrium",posX:5,posY:3,color:"#94FFFF",color2:"#5FA4A4"},{id:40,symbol:"Zr",RCow:1.48,RVdW:2.3,maxBonds:6,mass:91.224,name:"Zirconium",posX:5,posY:4,color:"#94E0E0",color2:"#6BA2A2"},{id:41,symbol:"Nb",RCow:1.37,RVdW:2.15,maxBonds:6,mass:92.90638,name:"Niobium",posX:5,posY:5,color:"#73C2C9",color2:"#61A4A9"},{id:42,symbol:"Mo",RCow:1.45,RVdW:2.1,maxBonds:6,mass:95.94,name:"Molybdenum",posX:5,posY:6,color:"#54B5B5",color2:"#4EA9A9"},{id:43,symbol:"Tc",RCow:1.56,RVdW:2.05,maxBonds:6,mass:98,name:"Technetium",posX:5,posY:7,color:"#3B9E9E",color2:"#4EA9A9"},{id:44,symbol:"Ru",RCow:1.26,RVdW:2.05,maxBonds:6,mass:101.07,name:"Ruthenium",posX:5,posY:8,color:"#248F8F",color2:"#248F8F"},{id:45,symbol:"Rh",RCow:1.35,RVdW:2,maxBonds:6,mass:102.9055,name:"Rhodium",posX:5,posY:9,color:"#0A7D8C",color2:"#0A7D8C"},{id:46,symbol:"Pd",RCow:1.31,RVdW:2.05,maxBonds:6,mass:106.42,name:"Palladium",posX:5,posY:10,color:"#006985",color2:"#006985"},{id:47,symbol:"Ag",RCow:1.53,RVdW:2.1,maxBonds:6,mass:107.8682,name:"Silver",posX:5,posY:11,color:"#C0C0C0",color2:"#969696"},{id:48,symbol:"Cd",RCow:1.48,RVdW:2.2,maxBonds:6,mass:112.411,name:"Cadmium",posX:5,posY:12,color:"#FFD98F",color2:"#AE9462"},{id:49,symbol:"In",RCow:1.44,RVdW:2.2,maxBonds:3,mass:114.818,name:"Indium",posX:5,posY:13,color:"#A67573",color2:"#A67573"},{id:50,symbol:"Sn",RCow:1.41,RVdW:2.25,maxBonds:4,mass:118.71,name:"Tin",posX:5,posY:14,color:"#668080",color2:"#668080"},{id:51,symbol:"Sb",RCow:1.38,RVdW:2.2,maxBonds:3,mass:121.76,name:"Antimony",posX:5,posY:15,color:"#9E63B5",color2:"#9E63B5"},{id:52,symbol:"Te",RCow:1.35,RVdW:2.1,maxBonds:2,mass:127.6,name:"Tellurium",posX:5,posY:16,color:"#D47A00",color2:"#D47A00"},{id:53,symbol:"I",RCow:1.33,RVdW:2.1,maxBonds:1,mass:126.90447,name:"Iodine",posX:5,posY:17,color:"#940094",color2:"#940094"},{id:54,symbol:"Xe",RCow:1.3,RVdW:2.16,maxBonds:0,mass:131.293,name:"Xenon",posX:5,posY:18,color:"#429EB0",color2:"#429EB0"},{id:55,symbol:"Cs",RCow:2.25,RVdW:3,maxBonds:1,mass:132.90545,name:"Cesium",posX:6,posY:1,color:"#57178F",color2:"#57178F"},{id:56,symbol:"Ba",RCow:1.98,RVdW:2.7,maxBonds:2,mass:137.327,name:"Barium",posX:6,posY:2,color:"#00C900",color2:"#00C900"},{id:57,symbol:"La",RCow:1.69,RVdW:2.5,maxBonds:12,mass:138.9055,name:"Lanthanum",posX:9,posY:3,color:"#70D4FF",color2:"#57A4C5"},{id:58,symbol:"Ce",RCow:1.6,RVdW:2.48,maxBonds:6,mass:140.116,name:"Cerium",posX:9,posY:4,color:"#FFFFC7",color2:"#989877"},{id:59,symbol:"Pr",RCow:1.6,RVdW:2.47,maxBonds:6,mass:140.90765,name:"Praseodymium",posX:9,posY:5,color:"#D9FFC7",color2:"#869D7B"},{id:60,symbol:"Nd",RCow:1.6,RVdW:2.45,maxBonds:6,mass:144.24,name:"Neodymium",posX:9,posY:6,color:"#C7FFC7",color2:"#7DA07D"},{id:61,symbol:"Pm",RCow:1.6,RVdW:2.43,maxBonds:6,mass:145,name:"Promethium",posX:9,posY:7,color:"#A3FFC7",color2:"#69A581"},{id:62,symbol:"Sm",RCow:1.6,RVdW:2.42,maxBonds:6,mass:150.36,name:"Samarium",posX:9,posY:8,color:"#8FFFC7",color2:"#5EA883"},{id:63,symbol:"Eu",RCow:1.6,RVdW:2.4,maxBonds:6,mass:151.964,name:"Europium",posX:9,posY:9,color:"#61FFC7",color2:"#43B089"},{id:64,symbol:"Gd",RCow:1.6,RVdW:2.38,maxBonds:6,mass:157.25,name:"Gadolinium",posX:9,posY:10,color:"#45FFC7",color2:"#31B48D"},{id:65,symbol:"Tb",RCow:1.6,RVdW:2.37,maxBonds:6,mass:158.92534,name:"Terbium",posX:9,posY:11,color:"#30FFC7",color2:"#23B890"},{id:66,symbol:"Dy",RCow:1.6,RVdW:2.35,maxBonds:6,mass:162.5,name:"Dysprosium",posX:9,posY:12,color:"#1FFFC7",color2:"#17BB92"},{id:67,symbol:"Ho",RCow:1.6,RVdW:2.33,maxBonds:6,mass:164.93032,name:"Holmium",posX:9,posY:13,color:"#00FF9C",color2:"#00C578"},{id:68,symbol:"Er",RCow:1.6,RVdW:2.32,maxBonds:6,mass:167.259,name:"Erbium",posX:9,posY:14,color:"#00E675",color2:"#00C765"},{id:69,symbol:"Tm",RCow:1.6,RVdW:2.3,maxBonds:6,mass:168.93421,name:"Thulium",posX:9,posY:15,color:"#00D452",color2:"#00C94E"},{id:70,symbol:"Yb",RCow:1.6,RVdW:2.28,maxBonds:6,mass:173.04,name:"Ytterbium",posX:9,posY:16,color:"#00BF38",color2:"#00BF38"},{id:71,symbol:"Lu",RCow:1.6,RVdW:2.27,maxBonds:6,mass:174.967,name:"Lutetium",posX:9,posY:17,color:"#00AB24",color2:"#00AB24"},{id:72,symbol:"Hf",RCow:1.5,RVdW:2.25,maxBonds:6,mass:178.49,name:"Hafnium",posX:6,posY:4,color:"#4DC2FF",color2:"#42A8DC"},{id:73,symbol:"Ta",RCow:1.38,RVdW:2.2,maxBonds:6,mass:180.9479,name:"Tantalum",posX:6,posY:5,color:"#4DA6FF",color2:"#4BA2F9"},{id:74,symbol:"W",RCow:1.46,RVdW:2.1,maxBonds:6,mass:183.84,name:"Tungsten",posX:6,posY:6,color:"#2194D6",color2:"#2194D6"},{id:75,symbol:"Re",RCow:1.59,RVdW:2.05,maxBonds:6,mass:186.207,name:"Rhenium",posX:6,posY:7,color:"#267DAB",color2:"#267DAB"},{id:76,symbol:"Os",RCow:1.28,RVdW:2,maxBonds:6,mass:190.23,name:"Osmium",posX:6,posY:8,color:"#266696",color2:"#266696"},{id:77,symbol:"Ir",RCow:1.37,RVdW:2,maxBonds:6,mass:192.217,name:"Iridium",posX:6,posY:9,color:"#175487",color2:"#175487"},{id:78,symbol:"Pt",RCow:1.28,RVdW:2.05,maxBonds:6,mass:195.078,name:"Platinum",posX:6,posY:10,color:"#D0D0E0",color2:"#9595A0"},{id:79,symbol:"Au",RCow:1.44,RVdW:2.1,maxBonds:6,mass:196.96655,name:"Gold",posX:6,posY:11,color:"#FFD123",color2:"#B9981A"},{id:80,symbol:"Hg",RCow:1.49,RVdW:2.05,maxBonds:6,mass:200.59,name:"Mercury",posX:6,posY:12,color:"#B8B8D0",color2:"#9595A9"},{id:81,symbol:"Tl",RCow:1.48,RVdW:2.2,maxBonds:3,mass:204.3833,name:"Thallium",posX:6,posY:13,color:"#A6544D",color2:"#A6544D"},{id:82,symbol:"Pb",RCow:1.47,RVdW:2.3,maxBonds:4,mass:207.2,name:"Lead",posX:6,posY:14,color:"#575961",color2:"#575961"},{id:83,symbol:"Bi",RCow:1.46,RVdW:2.3,maxBonds:3,mass:208.98038,name:"Bismuth",posX:6,posY:15,color:"#9E4FB5",color2:"#9E4FB5"},{id:84,symbol:"Po",RCow:1.6,RVdW:2,maxBonds:2,mass:209,name:"Polonium",posX:6,posY:16,color:"#AB5C00",color2:"#AB5C00"},{id:85,symbol:"At",RCow:1.6,RVdW:2,maxBonds:1,mass:210,name:"Astatine",posX:6,posY:17,color:"#754F45",color2:"#754F45"},{id:86,symbol:"Rn",RCow:1.45,RVdW:2,maxBonds:0,mass:222,name:"Radon",posX:6,posY:18,color:"#428296",color2:"#428296"},{id:87,symbol:"Fr",RCow:1.6,RVdW:2,maxBonds:1,mass:223,name:"Francium",posX:7,posY:1,color:"#420066",color2:"#420066"},{id:88,symbol:"Ra",RCow:1.6,RVdW:2,maxBonds:2,mass:226,name:"Radium",posX:7,posY:2,color:"#007D00",color2:"#007D00"},{id:89,symbol:"Ac",RCow:1.6,RVdW:2,maxBonds:6,mass:227,name:"Actinium",posX:10,posY:3,color:"#70ABFA",color2:"#669CE4"},{id:90,symbol:"Th",RCow:1.6,RVdW:2.4,maxBonds:6,mass:232.0381,name:"Thorium",posX:10,posY:4,color:"#00BAFF",color2:"#00B8FC"},{id:91,symbol:"Pa",RCow:1.6,RVdW:2,maxBonds:6,mass:231.03588,name:"Protactinium",posX:10,posY:5,color:"#00A1FF",color2:"#00A1FF"},{id:92,symbol:"U",RCow:1.6,RVdW:2.3,maxBonds:6,mass:238.02891,name:"Uranium",posX:10,posY:6,color:"#008FFF",color2:"#008FFF"},{id:93,symbol:"Np",RCow:1.6,RVdW:2,maxBonds:6,mass:237,name:"Neptunium",posX:10,posY:7,color:"#0080FF",color2:"#0080FF"},{id:94,symbol:"Pu",RCow:1.6,RVdW:2,maxBonds:6,mass:244,name:"Plutonium",posX:10,posY:8,color:"#006BFF",color2:"#006BFF"},{id:95,symbol:"Am",RCow:1.6,RVdW:2,maxBonds:6,mass:243,name:"Americium",posX:10,posY:9,color:"#545CF2",color2:"#545CF2"},{id:96,symbol:"Cm",RCow:1.6,RVdW:2,maxBonds:6,mass:247,name:"Curium",posX:10,posY:10,color:"#785CE3",color2:"#785CE3"},{id:97,symbol:"Bk",RCow:1.6,RVdW:2,maxBonds:6,mass:247,name:"Berkelium",posX:10,posY:11,color:"#8A4FE3",color2:"#8A4FE3"},{id:98,symbol:"Cf",RCow:1.6,RVdW:2,maxBonds:6,mass:251,name:"Californium",posX:10,posY:12,color:"#A136D4",color2:"#A136D4"},{id:99,symbol:"Es",RCow:1.6,RVdW:2,maxBonds:6,mass:252,name:"Einsteinium",posX:10,posY:13,color:"#B31FD4",color2:"#B31FD4"},{id:100,symbol:"Fm",RCow:1.6,RVdW:2,maxBonds:6,mass:257,name:"Fermium",posX:10,posY:14,color:"#B31FBA",color2:"#B31FBA"},{id:101,symbol:"Md",RCow:1.6,RVdW:2,maxBonds:6,mass:258,name:"Mendelevium",posX:10,posY:15,color:"#B30DA6",color2:"#B30DA6"},{id:102,symbol:"No",RCow:1.6,RVdW:2,maxBonds:6,mass:259,name:"Nobelium",posX:10,posY:16,color:"#BD0D87",color2:"#BD0D87"},{id:103,symbol:"Lr",RCow:1.6,RVdW:2,maxBonds:6,mass:262,name:"Lawrencium",posX:10,posY:17,color:"#C70066",color2:"#C70066"},{id:104,symbol:"Rf",RCow:1.6,RVdW:2,maxBonds:6,mass:261,name:"Rutherfordium",posX:7,posY:4,color:"#CC0059",color2:"#42A8DC"},{id:105,symbol:"Db",RCow:1.6,RVdW:2,maxBonds:6,mass:262,name:"Dubnium",posX:7,posY:5,color:"#D1004F",color2:"#4BA2F9"},{id:106,symbol:"Sg",RCow:1.6,RVdW:2,maxBonds:6,mass:266,name:"Seaborgium",posX:7,posY:6,color:"#D90045",color2:"#2194D6"},{id:107,symbol:"Bh",RCow:1.6,RVdW:2,maxBonds:6,mass:264,name:"Bohrium",posX:7,posY:7,color:"#E00038",color2:"#267DAB"},{id:108,symbol:"Hs",RCow:1.6,RVdW:2,maxBonds:6,mass:277,name:"Hassium",posX:7,posY:8,color:"#E6002E",color2:"#266696"},{id:109,symbol:"Mt",RCow:1.6,RVdW:2,maxBonds:6,mass:268,name:"Meitnerium",posX:7,posY:9,color:"#EB0026",color2:"#175487"},{id:110,symbol:"Ds",RCow:1.6,RVdW:2,maxBonds:6,mass:281,name:"Darmstadtium",posX:7,posY:10,color:"#FF1493",color2:"#9595A0"},{id:111,symbol:"Rg",RCow:1.6,RVdW:2,maxBonds:6,mass:272,name:"Roentgenium",posX:7,posY:11,color:"#FF1494",color2:"#B9981A"},{id:112,symbol:"Cn",RCow:1.6,RVdW:2,maxBonds:6,mass:277,name:"Copernicium",posX:7,posY:12,color:"#FF1495",color2:"#9595A9"}];},function(o,s,m){function l(o){for(var m in o)s.hasOwnProperty(m)||(s[m]=o[m]);}Object.defineProperty(s,"__esModule",{value:!0}),l(m(2)),l(m(0));},function(o,s,m){Object.defineProperty(s,"__esModule",{value:!0});var l=m(0),a=function(){function o(){}return o.getById=function(o){for(var s=0,m=l.ChemElementData;s<m.length;s++){var a=m[s];if(a.id===o)return a}return null},o.getBySymbol=function(o){for(var s=(o||"").replace(/[^a-z]/gim,"").toLowerCase(),m=s.charAt(0).toUpperCase()+s.slice(1),a=0,n=l.ChemElementData;a<n.length;a++){var d=n[a];if(d.symbol===m)return d}return null},o.getAll=function(){return l.ChemElementData.filter((function(o){return "Q"!==o.symbol&&"D"!==o.symbol}))},o.getAllSymbols=function(){return o.getAll().map((function(o){return o.symbol}))},o}();s.ChemElements=a;}])}));

    });

    var Elements = unwrapExports(chemElements);

    const { ChemElements, ChemElementData } = Elements;

    const emptyElTemplate = () => {
      return {
        uuid: v4(),
        visible: false,
        titleColumn: false,
        titleRow: false,
        title: null
      }
    };

    const isRowHeader = (row, col) => {
      return col === 0 && row > 0 && row < 8
    };
    const isColumnHeader = (row, col) => {
      if (row === 0 && col === 1) return true
      if (row === 1 && col === 2) return true
      if (row === 0 && col === 18) return true
      if (row === 3 && col > 2 && col < 13) return true
      if (row === 1 && col >= 13 && col < 18) return true
    };

    const gridData = [...Array(11)].map((_, rowIdx) => {
      const columns = [...Array(19)].map((_, colIdx) => {
        const obj = emptyElTemplate();
        if (isColumnHeader(rowIdx, colIdx)) {
          obj.titleColumn = true;
          obj.title = colIdx;
          obj.visible = true;
        } else if (colIdx === 0 && rowIdx === 0) {
          obj.titleRow = true;
          obj.visible = true;
        }

        if (isRowHeader(rowIdx, colIdx)) {
          obj.titleRow = true;
          obj.title = rowIdx;
          obj.visible = true;
        }

        return obj
      });

      return columns
    });

    console.log(gridData);

    const defaultTableData = ChemElementData.reduce((table, el) => {
      if (el.name === "Dummy" || el.symbol === "D") return table;
      el = Object.assign(el, emptyElTemplate());

      const x = el.posX - 1;
      const y = el.posY - 1;

      if (table[x] === undefined) {
        const newRow = new Array(18);
        for (let step = 0; step < 18; step++) {
          newRow[step] = emptyElTemplate();
        }
        table[x] = newRow;
      }

      el.visible = true;
      table[x][y] = el;

      return table;
    }, new Array(9));

    const pt = ChemElementData.reduce((table, element) => {
      if (element.name === "Dummy" || element.symbol === "D") return table;
      let x = element.posX;
      let y = element.posY;
      if (!table[x]) {
        return table
      }
      table[x][y].visible = true;
      table[x][y] = Object.assign(element, table[x][y]);

      return table
    }, gridData);

    /* src/App.svelte generated by Svelte v3.19.1 */
    const file$7 = "src/App.svelte";

    // (51:4) <ShowWhen screen="mobile">
    function create_default_slot_2(ctx) {
    	let current;

    	const grid = new Grid({
    			props: {
    				variant: "mobile",
    				updateAtom: /*updateAtom*/ ctx[3],
    				rows: /*rows*/ ctx[0],
    				atom: /*atom*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(grid.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(grid.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const grid_changes = {};
    			if (dirty & /*rows*/ 1) grid_changes.rows = /*rows*/ ctx[0];
    			if (dirty & /*atom*/ 4) grid_changes.atom = /*atom*/ ctx[2];
    			grid.$set(grid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(51:4) <ShowWhen screen=\\\"mobile\\\">",
    		ctx
    	});

    	return block;
    }

    // (54:4) <ShowWhen screen="tablet">
    function create_default_slot_1(ctx) {
    	let current;

    	const grid = new Grid({
    			props: {
    				variant: "tablet",
    				updateAtom: /*updateAtom*/ ctx[3],
    				rows: /*rows*/ ctx[0],
    				atom: /*atom*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(grid.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(grid.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const grid_changes = {};
    			if (dirty & /*rows*/ 1) grid_changes.rows = /*rows*/ ctx[0];
    			if (dirty & /*atom*/ 4) grid_changes.atom = /*atom*/ ctx[2];
    			grid.$set(grid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(54:4) <ShowWhen screen=\\\"tablet\\\">",
    		ctx
    	});

    	return block;
    }

    // (58:4) <ShowWhen screen="laptop">
    function create_default_slot(ctx) {
    	let current;

    	const grid = new Grid({
    			props: {
    				updateAtom: /*updateAtom*/ ctx[3],
    				rows: /*rows*/ ctx[0],
    				atom: /*atom*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(grid.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(grid.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const grid_changes = {};
    			if (dirty & /*rows*/ 1) grid_changes.rows = /*rows*/ ctx[0];
    			if (dirty & /*atom*/ 4) grid_changes.atom = /*atom*/ ctx[2];
    			grid.$set(grid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(58:4) <ShowWhen screen=\\\"laptop\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let main;
    	let header;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let div;
    	let t3;
    	let t4;
    	let t5;
    	let current;

    	const filters_1 = new Filters({
    			props: {
    				filtered: /*filtered*/ ctx[1],
    				allRows: pt,
    				filterRows: /*func*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const showwhen0 = new ShowWhen({
    			props: {
    				screen: "mobile",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const showwhen1 = new ShowWhen({
    			props: {
    				screen: "tablet",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const showwhen2 = new ShowWhen({
    			props: {
    				screen: "laptop",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tailwindcss = new Tailwindcss({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			header = element("header");
    			h1 = element("h1");
    			t0 = text("Periodic Table");
    			t1 = space();
    			create_component(filters_1.$$.fragment);
    			t2 = space();
    			div = element("div");
    			create_component(showwhen0.$$.fragment);
    			t3 = space();
    			create_component(showwhen1.$$.fragment);
    			t4 = space();
    			create_component(showwhen2.$$.fragment);
    			t5 = space();
    			create_component(tailwindcss.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", {});
    			var main_nodes = children(main);
    			header = claim_element(main_nodes, "HEADER", { class: true });
    			var header_nodes = children(header);
    			h1 = claim_element(header_nodes, "H1", { class: true });
    			var h1_nodes = children(h1);
    			t0 = claim_text(h1_nodes, "Periodic Table");
    			h1_nodes.forEach(detach_dev);
    			t1 = claim_space(header_nodes);
    			claim_component(filters_1.$$.fragment, header_nodes);
    			header_nodes.forEach(detach_dev);
    			t2 = claim_space(main_nodes);
    			div = claim_element(main_nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			claim_component(showwhen0.$$.fragment, div_nodes);
    			t3 = claim_space(div_nodes);
    			claim_component(showwhen1.$$.fragment, div_nodes);
    			t4 = claim_space(div_nodes);
    			claim_component(showwhen2.$$.fragment, div_nodes);
    			div_nodes.forEach(detach_dev);
    			main_nodes.forEach(detach_dev);
    			t5 = claim_space(nodes);
    			claim_component(tailwindcss.$$.fragment, nodes);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(h1, "class", "svelte-jn8pb0");
    			add_location(h1, file$7, 43, 4, 974);
    			attr_dev(header, "class", "text-center svelte-jn8pb0");
    			add_location(header, file$7, 42, 2, 941);
    			attr_dev(div, "class", "table-container svelte-jn8pb0");
    			add_location(div, file$7, 49, 2, 1123);
    			add_location(main, file$7, 41, 0, 932);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, header);
    			append_dev(header, h1);
    			append_dev(h1, t0);
    			append_dev(header, t1);
    			mount_component(filters_1, header, null);
    			append_dev(main, t2);
    			append_dev(main, div);
    			mount_component(showwhen0, div, null);
    			append_dev(div, t3);
    			mount_component(showwhen1, div, null);
    			append_dev(div, t4);
    			mount_component(showwhen2, div, null);
    			insert_dev(target, t5, anchor);
    			mount_component(tailwindcss, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const filters_1_changes = {};
    			if (dirty & /*filtered*/ 2) filters_1_changes.filtered = /*filtered*/ ctx[1];
    			if (dirty & /*rows*/ 1) filters_1_changes.filterRows = /*func*/ ctx[7];
    			filters_1.$set(filters_1_changes);
    			const showwhen0_changes = {};

    			if (dirty & /*$$scope, rows, atom*/ 261) {
    				showwhen0_changes.$$scope = { dirty, ctx };
    			}

    			showwhen0.$set(showwhen0_changes);
    			const showwhen1_changes = {};

    			if (dirty & /*$$scope, rows, atom*/ 261) {
    				showwhen1_changes.$$scope = { dirty, ctx };
    			}

    			showwhen1.$set(showwhen1_changes);
    			const showwhen2_changes = {};

    			if (dirty & /*$$scope, rows, atom*/ 261) {
    				showwhen2_changes.$$scope = { dirty, ctx };
    			}

    			showwhen2.$set(showwhen2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(filters_1.$$.fragment, local);
    			transition_in(showwhen0.$$.fragment, local);
    			transition_in(showwhen1.$$.fragment, local);
    			transition_in(showwhen2.$$.fragment, local);
    			transition_in(tailwindcss.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(filters_1.$$.fragment, local);
    			transition_out(showwhen0.$$.fragment, local);
    			transition_out(showwhen1.$$.fragment, local);
    			transition_out(showwhen2.$$.fragment, local);
    			transition_out(tailwindcss.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(filters_1);
    			destroy_component(showwhen0);
    			destroy_component(showwhen1);
    			destroy_component(showwhen2);
    			if (detaching) detach_dev(t5);
    			destroy_component(tailwindcss, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let rows = [];
    	let filtered = false;
    	let filteredByNobleGases = false;
    	let atom = null;
    	const filters = [];

    	const updateAtom = el => {
    		$$invalidate(2, atom = null);
    		setTimeout(() => $$invalidate(2, atom = el), 10);
    	};

    	const all = () => {
    		$$invalidate(2, atom = null);
    		$$invalidate(0, rows = []);
    		$$invalidate(1, filtered = false);
    		$$invalidate(0, rows = pt);
    	};

    	onMount(() => {
    		$$invalidate(0, rows = pt);
    	});

    	const func = filteredRows => {
    		$$invalidate(0, rows = filteredRows);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Tailwindcss,
    		Filters,
    		Table,
    		Grid,
    		ShowWhen,
    		pt,
    		rows,
    		filtered,
    		filteredByNobleGases,
    		atom,
    		filters,
    		updateAtom,
    		all,
    		setTimeout
    	});

    	$$self.$inject_state = $$props => {
    		if ("rows" in $$props) $$invalidate(0, rows = $$props.rows);
    		if ("filtered" in $$props) $$invalidate(1, filtered = $$props.filtered);
    		if ("filteredByNobleGases" in $$props) filteredByNobleGases = $$props.filteredByNobleGases;
    		if ("atom" in $$props) $$invalidate(2, atom = $$props.atom);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [rows, filtered, atom, updateAtom, filteredByNobleGases, filters, all, func];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    const app = new App({
    	target: document.querySelector('.pt-container'),
    	hydrate: true
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
