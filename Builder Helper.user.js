// ==UserScript==
// @name     Builder Helper
// @namespace   https://*.tribalwars.net
// @namespace   https://*.voynaplemyon.com
// @include     *.tribalwars.net*screen=main*
// @version     1.1
// @grant       GM_xmlhttpRequest
// ==/UserScript==


$(document).ready(function() {

    let scriptInitials = 'BB';
    let scriptFriendlyName = 'Build Bot';
    let scriptTimerColor = '#FF7F50';
    let config = {};
    let buildings = {};
    let orders;

    readScreenParams();
    readSessionConfig();
    readSessionState();
    createControls();

    // Click ready regardless of script state
    processFastCompletion();

    // start the rest only after faster completion

    function scriptVillageName() {
        return scriptInitials + '.' + config.q.village;
    }

    function readSessionConfig() {
        console.log('Reading session config ...');

        config.session = {};

        let i = 0;
        let prefix = scriptVillageName() + '.';

        while(true) {
            let key = sessionStorage.key(i++);

            if (!key) {
                break;
            }

            // process only current script/village config
            if (key.startsWith(prefix)) {
                let item = key.substr(prefix.length);
                console.log(key + '->' + item);
                config.session[item] = sessionStorage.getItem(key);
            }
        }

        if (!config.session.state) {
            disableSession();
        }

        console.log('Session config read', config.session);
    }

    function saveSessionConfig() {
        console.log('Saving session config ...', config.session);
        let prefix = scriptVillageName() + '.';

        for (let item in config.session) {
            let value = sessionStorage.getItem(prefix + item);
            if (!value || value != config.session[item]) {
                console.log('Saving:', prefix + item, config.session[item]);
                sessionStorage.setItem(prefix + item, config.session[item]);
            } else {
                console.log('Not changed:', prefix + item, config.session[item]);
            }
        }

        console.log('Session config saved');
    }

    function isEnabled() {
        return config.session.state === 'enabled';
    }

    function readSessionState() {
        config.session.state = sessionStorage.getItem('state');
    }

    function saveSessionState() {
        sessionStorage.setItem('state', config.session.state);
    }

    function enableSession() {
        config.session.state = 'enabled';
        saveSessionState();
    }

    function disableSession() {
        config.session.state = 'disabled';
        saveSessionState()
    }

    function createControls() {
        console.log('Creating controls ...');

        // Remove useless td
        document.getElementById('content_value').getElementsByTagName('table')[0].remove();

        let inputs = {};

        const element = document.getElementById('contentContainer');

        let controlsDiv = document.createElement('div');
        controlsDiv.className = 'vis';
        element.before(controlsDiv);

        let h = document.createElement('h4');
        h.innerHTML = scriptFriendlyName;
        controlsDiv.appendChild(h);

        let innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';
        innerDiv.appendChild(table);

        let body = document.createElement('tbody');
        table.appendChild(body);

        // add buttons
        let btntable = document.createElement('table');
        btntable.className = 'vis';
        btntable.width = '100%';
        table.after(btntable);

        body = document.createElement('tbody');
        btntable.appendChild(body);

        let tr0 = document.createElement('tr');
        body.appendChild(tr0);

        // save
        let tdb = document.createElement('td');
        tdb.width = '5%';
        tdb.align = 'center';

        let btn = document.createElement('input');
        btn.className = 'btn';
        btn.value = 'Сохранить';
        btn.addEventListener('click', saveSelection, false);
        tdb.appendChild(btn);

        tr0.appendChild(tdb);

        inputs.save = btn;

        // start
        tdb = document.createElement('td');
        tdb.width = '5%';
        tdb.align = 'center';

        btn = document.createElement('input');
        btn.className = 'btn';
        if (!isEnabled()) {
            btn.value = 'Запустить';
            btn.addEventListener('click', activate, false);
        } else {
            btn.value = 'Остановить';
            btn.addEventListener('click', deactivate, false);
        }
        tdb.appendChild(btn);

        tr0.appendChild(tdb);
        inputs.start = btn;

        // create timers control
        // create div
        let timersDiv = document.createElement('div');
        timersDiv.className = 'vis';
        controlsDiv.after(timersDiv);

        h = document.createElement('h4');
        h.innerHTML = 'Очередь выполнения';
        timersDiv.appendChild(h);

        innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        timersDiv.appendChild(createTimersTable());
        console.log('Controls created.', inputs);
    }

    function saveSelection() {
        saveSessionConfig();

        // add vilalge to timers list with no delay
        addTimer('Готовность к запуску', pageUrl(), 0, true);
    }

    function pageUrl() {
        let url = 'https://' + window.location.hostname + '/game.php?' + ((config.q.t) ? 't=' + config.q.t + '&': '') + 'village=' + config.q.village + '&screen=main';
        return url;
    }

    function disablecontrols() {
    }

    function start() {

        disablecontrols();

        setStatus('Запусакется ...');

        startProcess(false);
    }

    function activate() {
        saveSelection();
        disablecontrols();

        setStatus('Запусакется ...');
        enableSession();
        loadFirstTimer();
    }

    function deactivate() {
        disableSession();
        window.location.reload();
    }

    function startProcess(wait) {

        let min = wait ? (config.wait - 3) * 60000 : 600;
        let max = wait ? (config.wait + 3) * 60000 : 800;

        let rand = Math.floor(Math.random() * (max - min + 1) + min);
        console.log('Waiting for ' + rand + ' milliseconds ...');
        window.setTimeout(function() {
            processBuild();
        }, rand);

        var date = new Date(Date.now() + rand);
        return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    }

    function waitAndReload(reason, min, max) {

        setStatus(reason);

        let time = Math.floor(Math.random() * (max - min + 1) + min);


        let left = calculateDateTimeOffsets();

        if (left > 0 && left < time) {
            time = left;
        }
        let url = pageUrl();

        // add to timers list
        // load first timer in list
        addTimer(reason, url, time, true);
        loadFirstTimer();
    }

    function calculateDateTimeOffsets() {
        let date = document.getElementById('serverDate').innerHTML.split('/');
        let time = document.getElementById('serverTime').innerHTML.split(':');

        const server = new Date();
        server.setHours(parseInt(time[0]));
        server.setMinutes(parseInt(time[1]));
        server.setSeconds(parseInt(time[2]));

        const next = new Date();
        const lines = document.getElementsByClassName('lit-item');
        let left = -1;
        if (lines.length > 3) {
            let data = lines[3].firstChild.data;
            data = data.substring(data.lastIndexOf(' ') + 1);
            time = data.split(':');
            next.setHours(parseInt(time[0]));
            next.setMinutes(parseInt(time[1]));
            next.setSeconds(parseInt(time[2]));
            left = next.getTime() - server.getTime();
            if (left > 3 * 60000) {
                left = left - 3 * 60000 + 2000;
            }
        }
        return left;
    }

    function processBuild() {
        console.log('Processing ...');

        // find current queue length
        var queue = document.querySelectorAll('[class*="buildorder_"]');
        console.log('Queue length', queue.length);

        let value = sessionStorage.getItem('OrdersQueue');

        if (value) {
            orders = JSON.parse(value);
        } else {
            orders = [];
        }

        let current = -1;

        for (let i = 0; i < orders.length; ++i) {
            const order = orders[i];
            console.log('Trying', order.name, order.level);
            const node = readBuilding(order.name);
            if (node) {
                if (readLevel(node, order.name) < order.level) {
                    current = i;
                    break;
                }
            }
        }

        if (current > 0) {
            orders.splice(0, current);
            saveOrders();
        }

        if (orders.length == 0) {
            // no more build orders, proceed with other bots
            loadFirstTimer();
            return;
        }

        console.log('Current order', orders[0]);

        // If queue is too long
        if (queue.length > 4) {
            // wait to complete
            waitAndReload('Queue too long', 14 * 60000, 19 * 60000);
        } else {
            let btn;

            let node = readBuilding(orders[0].name);

            const options = node.getElementsByClassName('build_options');

            if (options && options.length > 0) {
                // check if farm needed
                let inactive = options[0].getElementsByClassName('inactive center');
                if (inactive && inactive.length > 0) {
                    if (inactive[0].innerHTML.includes('Farm') && !isOrdered('farm')) {
                        node = readBuilding('farm');
                        orders.unshift({'name': 'farm', 'level': readLevel(node, 'farm') + 1});
                        saveOrders();
                        location.reload();
                    }
                }
                inactive = options[0].getElementsByClassName('inactive');
                if (inactive && inactive.length > 0) {
                    if (inactive[0].innerHTML.includes('Warehouse') && !isOrdered('storage')) {
                        node = readBuilding('storage');
                        orders.unshift({'name': 'storage', 'level': readLevel(node, 'storage') + 1});
                        saveOrders();
                        location.reload();
                    }
                }
                const btns = options[0].getElementsByClassName('btn-build');
                if (btns && btns.length > 0) {
                    btn = btns[0];
                }
            }

            if (btn && btn.checkVisibility()) {
                btn.click();
                window.setTimeout(function() {
                    location.reload();
                }, 4000);
            } else {
                waitAndReload('Waiting for ' + orders[0].name, 14 * 60000, 19 * 60000);
            }
        }
    }

    function readBuildings() {
        let names = [
            'main',
            'barracks',
            'place',
            'statue',
            'market',
            'wood',
            'stone',
            'iron',
            'farm',
            'storage',
            'hide',
            'stable',
            'garage',
            'academy',
            'smith',
            'wall'
        ];
        for (const name of names) {
            const building = readBuilding(name);
            if (building) {
              const level = readLevel(building, name);
              buildings[name] = { 'node' : building, 'level': level, 'added': level };
            }
        }
        console.log(buildings);
    }

    function createQueueControls() {
        // Read queue
        let value = sessionStorage.getItem('OrdersQueue');

        if (value) {
            orders = JSON.parse(value);
        } else {
            orders = [];
        }

        // Create UI
        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';
        table.id = 'bot_orders_table';

        const element = document.getElementById('contentContainer');

        let controlsDiv = document.createElement('div');
        controlsDiv.className = 'vis';
        element.after(controlsDiv);

        controlsDiv.appendChild(table);

        // Create Controls
        let main = readBuilding('main');
        let firstTh = main.parentNode.firstChild.getElementsByTagName('th')[0];
        let th = document.createElement('th');
        th.innerHTML = 'Add';
        firstTh.after(th);

        for (let building in buildings) {
            let td = document.createElement('td');
            const tds = buildings[building].node.getElementsByTagName('td');
            if (tds.length > 2) {
                buildings[building].td = td;
                td.innerHTML = (buildings[building].added + 1) + ' <a class="" href="#"><img src="https://dsen.innogamescdn.com/asset/72737c96/graphic/premium_plus.png" title="" alt="" class=""></a>'
            }
            td.addEventListener('click', function() {addOrder(building, buildings[building])}, false);
            tds[0].after(td);
        }

        // add orders
        createOrdersUi();
    }

    function createOrdersUi() {
        console.log('Creating orders UI ...');

        // find table by id
        let table = document.getElementById('bot_orders_table');

        // delete children
        while (table.firstChild) {
            table.removeChild(table.lastChild);
        }

        let body = document.createElement('tbody');
        table.appendChild(body);

        let tr0 = document.createElement('tr');
        body.appendChild(tr0);

        let headers = ['Building', 'Level'];

        for (let i = 0; i < headers.length; ++i) {
            let th = document.createElement('th');
            th.style = 'text-align:center';
            th.innerHTML = headers[i];
            tr0.appendChild(th);
        }

        let th = document.createElement('th');
        th.innerHTML = '<img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/delete_small.png" title="" alt="" class="">';
        tr0.appendChild(th);

        // reset levels
        Object.keys(buildings).forEach(function(key) {
            var building = buildings[key];
            building.added = building.level;
        });

        // add nodes
        for (let i = 0; i < orders.length; ++i) {
            let tr = document.createElement('tr');
            body.appendChild(tr);

            let order = orders[i];
            let td = document.createElement('td');
            td.innerHTML = order.name;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = order.level;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = '<a class="" href="#"><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/delete_small.png" title="" alt="" class=""></a>';
            tr.appendChild(td);
            td.addEventListener('click', function() {removeOrder(i)}, false);

            let building = buildings[order.name];
            if (building) {
                if (building.added < order.level) {
                    building.added = order.level;
                }
            }
        }
        // update controls
        Object.keys(buildings).forEach(function(key) {
            var building = buildings[key];
            if (building.td) {
                building.td.innerHTML = (building.added + 1) + ' <a class="" href="#"><img src="https://dsen.innogamescdn.com/asset/72737c96/graphic/premium_plus.png" title="" alt="" class=""></a>'
            }
        });
    }

    function addOrder(name, building) {
        orders.push({'name': name, 'level': building.added + 1});
        saveOrders();
        createOrdersUi(); // will update added
    }

    function removeOrder(index) {
        const order = orders[index];
        orders.splice(index, 1);
        saveOrders();
        createOrdersUi();
    }

    function saveOrders(index) {
        sessionStorage.setItem('OrdersQueue', JSON.stringify(orders));
    }
    function readBuilding(name) {
        const building = document.getElementById('main_buildrow_' + name);
        if (building) {
            //console.log('Building', name, 'found', building);
            return building;
        } else {
            //console.log('Building', name, 'not found');
        }
    }

    function isOrdered(name) {
        const orders = document.getElementsByClassName('buildorder_' + name);
        return orders && orders.length > 0;
    }

    function readLevel(building, name) {
        // check if already building
        const orders = document.getElementsByClassName('buildorder_' + name);
        const match = building.children[0].getElementsByTagName('span')[0].firstChild.nodeValue.match(/Level (.*)/);
        let level = 0;
        if (match) {
            level = parseInt(match[1]);
            if (orders) {
                level += orders.length;
            }
        }
        return level;
    }

    function processFastCompletion() {
        // Find construction queue first record
        // find if ready to complete

        console.log('Processing fast completion...');
        let processed = false;

        let elements = document.getElementsByClassName('btn-instant-free');
        if (elements && elements.length > 0) {
            if (elements[0].style.display == 'none') {
                console.log('Not ready yet');
                processed = true;
            } else {
                //complition
                console.log('Instant complete');
                let rand = Math.floor(Math.random() * (7000 - 4000 + 1) + 4000);

                window.setTimeout(function() {
                    console.log('clicking');
                    elements[0].click();
                    window.setTimeout(function() {
                        processFastCompletion();
                    }, 4000);
                }, rand);
            }
        } else {
            console.log('Not found');
            processed = true;
        }

        if (processed) {
            console.log('Fast completion processed');
            if (isEnabled())
            {
                start();
            }
            readBuildings();
            createQueueControls();
        }
    }

    function setStatus(status) {
       // config.inputs[''].innerHTML = status;
    }

    function readScreenParams() {
        console.log('Reading params ...');

        // find sit id and h code
        let elements = document.getElementsByClassName('footer-link');
        for (let i = elements.length - 1; i >= 0; i--) {
            config.q = readQuerryParams(String(elements[i]));
            if (config.q.village) {
                break;
            }
        }

        console.log('Params reading done.', config);
    }

    function readQuerryParams(url) {
        let params = {};
        let hh = url.substring(url.indexOf('?') + 1).split('&');

        // move params into config
        for (let i = 0; i < hh.length; ++i) {
            let param = hh[i].split('=');
            params[param[0]] = param[1];
        }

        return params;
    }

    // timer
    // Bot Name, Village, url, time - Date().getTime();

    let timers;
    let timerTimeout = null;

    readTimers();

/*
    addTimer('1', 'url', 5000);
    addTimer('2', 'url', 10000);
    addTimer('4', 'url', 15000);
    addTimer('0', 'url', 3000);
    addTimer('3', 'url', 12000);
*/
    function readTimers() {
        console.log('Reading timers ...');
        let value = sessionStorage.getItem('BotTimers');

        if (value) {
            timers = JSON.parse(value);
        } else {
            timers = [];
        }
        // timers are stored ordered
        createTimersUi();
        console.log('Timers read', JSON.stringify(timers));
    }

    function saveTimers() {
        console.log('Saving timers ...');
        sessionStorage.setItem('BotTimers', JSON.stringify(timers));
        console.log('Timers saved');
    }

    function addTimer(reason, url, time, unique) {
        console.log('Adding timer', reason, url, time, unique);

        clearTimeout(timerTimeout);

        let newTimer = {
            name: scriptFriendlyName,
            village: document.getElementsByClassName('village')[0].nextSibling.data,
            color: scriptTimerColor,
            reason: reason,
            url: url,
            time: new Date().getTime() + time
        };

        // drop prev timers from the same script+village if requested
        if (unique) {
            for (let i = 0; i < timers.length; ++i) {
                if (timers[i].name == newTimer.name &&
                    timers[i].village == newTimer.village) {
                    timers.splice(i, 1);
                    break;
                }
            }
        }

        // now add to list
        let i = 0;
        for (; i < timers.length; ++i) {
            if (timers[i].time > newTimer.time) {
                break;
            }
        }

        timers.splice(i, 0, newTimer);
        saveTimers();

        createTimersUi();
    }

    function loadFirstTimer() {
        clearTimeout(timerTimeout);

        if (timers.length > 0) {
            let current = timers[0];
            let time = current.time - new Date().getTime();
            if (time <=0) {
                time = 500;
            }
            console.log('Loading timer', current, time);
            timerTimeout = setTimeout(function() {
                console.log('---');
                console.log('Timer', current.name, time);
                // remove from list
                timers.splice(0, 1);
                saveTimers();
                // reload page

                console.log('Reloading to', current.url);
                location.href = current.url;
            }, time);
        }
    }

    function createTimersTable() {
        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';
        table.id = 'bot_timers_table';
        return table;
    }

    function removeTimer(index) {
        clearTimeout(timerTimeout);
        timers.splice(index, 1);
        saveTimers();
        window.location.reload();
    }

    function createTimersUi() {
        console.log('Creating timers UI ...');

        // find table by id
        let table = document.getElementById('bot_timers_table');

        // delete children
        while (table.firstChild) {
            table.removeChild(table.lastChild);
        }

        let body = document.createElement('tbody');
        table.appendChild(body);

        let tr0 = document.createElement('tr');
        body.appendChild(tr0);

        let headers = ['Бот', 'Деревня', 'Причина', 'Время'];

        for (let i = 0; i < headers.length; ++i) {
            let th = document.createElement('th');
            th.style = 'text-align:center';
            th.innerHTML = headers[i];
            tr0.appendChild(th);
        }

        let th = document.createElement('th');
        th.innerHTML = '<img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/delete_small.png" title="" alt="" class="">';
        tr0.appendChild(th);

        // add nodes
        for (let i = 0; i < timers.length; ++i) {
            let tr = document.createElement('tr');
            body.appendChild(tr);

            let timer = timers[i];
            let td = document.createElement('td');
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            let href = document.createElement('a');
            href.setAttribute('href', timer.url);
            href.innerHTML = timer.name;
            td.appendChild(href);
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = timer.village;
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = timer.reason;
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            tr.appendChild(td);

            td = document.createElement('td');
            let date = new Date();
            date.setTime(timer.time);
            td.innerHTML = date.toLocaleTimeString();
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = '<a class="" href="#"><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/delete_small.png" title="" alt="" class=""></a>';
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            tr.appendChild(td);
            td.addEventListener('click', function() {removeTimer(i)}, false);
        }
    }

});