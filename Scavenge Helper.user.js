// ==UserScript==
// @name     Scavenge Helper
// @namespace   https://*.tribalwars.net
// @namespace   https://*.voyna-plemyon.ru
// @include     *.voyna-plemyon.ru*mode=scavenge*
// @version     1.2
// @grant       GM_xmlhttpRequest
// ==/UserScript==
$(document).ready(function() {

    let scriptInitials = 'SH';
    let scriptFriendlyName = 'Сбор Бот';

    let config = {};

    let unitParams = [
        {'name': 'spear', 'capacity': 25},
        {'name': 'sword', 'capacity': 15},
        {'name': 'axe', 'capacity': 10},
        {'name': 'archer', 'capacity': 10},
        {'name': 'light', 'capacity': 80},
        {'name': 'marcher', 'capacity': 50},
        {'name': 'heavy', 'capacity': 50}
    ];

    readScreenParams();
    readSessionConfig();
    readSessionState();
    createControls();

    // start loot if enabled
    if (isEnabled()) {
        startLoot();
    }

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

        if (config.session.groups) {
            config.groups = JSON.parse(config.session.groups);
            config.sums = JSON.parse(config.session.sums);
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

        // save groups and sums
        sessionStorage.setItem(prefix + 'groups', JSON.stringify(config.groups));
        sessionStorage.setItem(prefix + 'sums', JSON.stringify(config.sums));

        console.log('Session config saved');
    }

    function isEnabled() {
        return config.session.state === 'enabled';
    }

    function readSessionState() {
        console.log('Reading state');
        config.session.state = sessionStorage.getItem('state');
        console.log('State', config.session.state);
    }

    function saveSessionState() {
        console.log('Saving state');
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

        let inputs = {};

        // create div
        let controlsDiv = document.createElement('div');
        controlsDiv.className = 'vis';
        let elements = document.getElementsByClassName('candidate-squad-container');
        elements[0].after(controlsDiv);

        let h = document.createElement('h4');
        h.innerHTML = 'Фарм Бот';
        controlsDiv.appendChild(h);

        let innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';
        innerDiv.appendChild(table);

        let body = document.createElement('tbody');
        table.appendChild(body);

        let tr0 = document.createElement('tr');
        tr0.innerHTML = '<th><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/unit/unit_spear.png"></th><th><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/unit/unit_sword.png"></th><th><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/unit/unit_axe.png"></th><th><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/unit/unit_archer.png"></th><th><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/unit/unit_light.png"></th><th><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/unit/unit_marcher.png"></th><th><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/unit/unit_heavy.png"></th><th><span class="icon header res"></span></th>';
        body.appendChild(tr0);

        config.groupInputs=[];
        for (let j = 0; j < 4; ++j) {
            let units = [];
            let tr1 = document.createElement('tr');
            body.appendChild(tr1);

            for (let i = 0; i < 8; ++i) {
                let td = document.createElement('td');
                td.innerHTML = '0';
                tr1.appendChild(td);
                units.push(td);
            }
            config.groupInputs.push(units);
        }

        // add buttons
        let btntable = document.createElement('table');
        btntable.className = 'vis';
        btntable.width = '100%';
        table.after(btntable);

        body = document.createElement('tbody');
        btntable.appendChild(body);

        tr0 = document.createElement('tr');
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
        if (!config.sums || !config.sums[0]) {
            btn.disabled = true;
        }
        tdb.appendChild(btn);

        tr0.appendChild(tdb);
        inputs.start = btn;

        console.log('Controls created.', inputs);

        config.inputs = inputs;

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

        console.log('Adding units', config.groups);
        if (config.groups) {
            setControls();
        }
    }


    function readUnits() {
        config.units = [];
        for (let i = 0; i < unitParams.length; ++i) {
            let inputs = document.getElementsByName(unitParams[i].name);
            let unit = {};
            unit.name = unitParams[i].name;
            unit.capacity = unitParams[i].capacity;
            if (inputs && inputs[0].value.length > 0) {
                unit.num = parseInt(inputs[0].value);
            } else {
                unit.num = 0;
            }
            config.units.push(unit);
        }
    }

    function assignUnit(unitName, groupUnits, left) {
        //console.log(unitName, groupUnits, left);
        for (let i = 0; i < config.units.length; ++i) {
            if (config.units[i].name == unitName) {
                let units = Math.floor(left / config.units[i].capacity);
                units = (units <= config.units[i].num) ? units : config.units[i].num;
                config.units[i].num -= units;
                groupUnits[i].num = units;
                left -= units * config.units[i].capacity;
            }
        }
        return left;
    }

    function buildGroup() {
        let group = [];
        for (let i = 0; i < unitParams.length; ++i) {
            let unit = {};
            unit.name = unitParams[i].name;
            unit.capacity = unitParams[i].capacity;
            unit.num = 0;
            group.push(unit);
        }

        return group;
    }

    function calculateGroups() {
        let sum = 0;
        for (let i = 0; i < config.units.length; ++i) {
            sum += config.units[i].num * config.units[i].capacity;
        }

        let sums = [];

        sums.push(sum);
        if (config.n > 1) {
            if (config.n == 2) {
                sums.push(Math.floor(sum * 2/7));
            } else if (config.n == 3) {
                sums.push(Math.floor(sum * 2/8));
                sums.push(Math.floor(sum * 1/8));
            } else {
                sums.push(Math.floor(sum * 6/26));
                sums.push(Math.floor(sum * 3/26));
                sums.push(Math.floor(sum * 2/26));
            }
        }

        // re-create groups
        config.groups = [];
        for (let i = 0; i < config.n; ++i) {
            config.groups.push(buildGroup());
        }

        // assign all to first group
        for (let j = 0; j < config.units.length; ++j) {
            config.groups[0][j].num = config.units[j].num;
        }

        // assign units to groups
        for (let i = config.n - 1; i > 0; --i) {
            sums[i] = assignUnit('light', config.groups[i], sums[i]);
            sums[i] = assignUnit('heavy', config.groups[i], sums[i]);
            sums[i] = assignUnit('marcher', config.groups[i], sums[i]);
            sums[i] = assignUnit('spear', config.groups[i], sums[i]);
            sums[i] = assignUnit('sword', config.groups[i], sums[i]);
            sums[i] = assignUnit('axe', config.groups[i], sums[i]);
            sums[i] = assignUnit('archer', config.groups[i], sums[i]);
        }

        // calculate how much left in the first one
        for (let i = 1; i < config.groups.length; ++i) {
            //console.log('group', i);
            for (let j = 0; j < config.groups[0].length; ++j) {
                //console.log('unit', j, config.groups[0][j].num, config.groups[i][j].num);
                config.groups[0][j].num -= config.groups[i][j].num;
            }
        }

        // real sums
        for (let i = 0; i < config.groups.length; ++i) {
            sums[i] = 0;
            for (let j = 0; j < config.groups[0].length; ++j) {
                sums[i] += config.groups[i][j].num * config.groups[i][j].capacity;
            }
        }
        config.sums = sums;
        console.log(config.sums, config.groups);
    }

    function setControls() {
        for (let i = 0; i < config.groups.length; ++i) {
            for (let j = 0; j < config.groups[i].length; ++j) {
                config.groupInputs[i][j].innerHTML = config.groups[i][j].num;
            }
            config.groupInputs[i][7].innerHTML = config.sums[i];
        }
    }

    function saveSelection() {
        if (config.time > 0) {
            alert('Невозможно до оконачания сборов');
            return;
        }
        readUnits();
        calculateGroups();
        setControls();
        saveSessionConfig();
        // add vilalge to timers list with no delay
        addTimer('Готовность к запуску', pageUrl(), 0, true);
        config.inputs.start.disabled = false;
    }

    function disablecontrols() {
        // disable controls
        for (let control in config.inputs) {
            if (control != 'start') {
                config.inputs[control].readOnly = true;
                config.inputs[control].disabled = true;
            }
        }
    }

    function waitAndReload(reason) {
        // don't wait too long for page 3 - 5 sec
        let min = 22 * 60000;
        let max = 28 * 60000;

        let rand = Math.floor(Math.random() * (max - min + 1) + min);

        let url = pageUrl();

        // add to timers list
        // load first timer in list
        addTimer(reason, url, rand + config.time, true);
        loadFirstTimer();
    }

    function buildRequestPart(num, groupUnits, sum) {
        let hasArchers = (!!document.getElementsByName('archer'));
        let request = 'squad_requests%5B' + num + '%5D%5Bvillage_id%5D=' + config.q.village;

        let candidatePrefix = '&squad_requests%5B' + num + '%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5B';

        // add units
        for (let i = 0; i < groupUnits.length; ++i) {
            if (!hasArchers && groupUnits[i].name.includes('arch')) {
                continue;
            }
            request += candidatePrefix + groupUnits[i].name + '%5D=' + groupUnits[i].num;
        }
        // knight
        request += candidatePrefix + 'knight%5D=0';
        // add sum
        request += '&squad_requests%5B' + num + '%5D%5Bcandidate_squad%5D%5Bcarry_max%5D=' + sum;
        request += '&squad_requests%5B' + num + '%5D%5Boption_id%5D=' + (num + 1);
        request += '&squad_requests%5B' + num + '%5D%5Buse_premium%5D=false';

        return request;
    }

    function startLoot() {
        // Started
        console.log('Started');
        disablecontrols();
        document.getElementsByClassName('candidate-squad-container')[0].remove();

        if (config.time > 0) {
            // wait for timers to complete + 25 min
            console.log('Waiting');
            setTimeout(function() {
                waitAndReload('Сбор в процессе');
            }, 3000);
        } else {
            // build url
            let data = '';
            for (let i = 0; i < config.groups.length; ++i) {
                data += buildRequestPart(i, config.groups[i], config.sums[i]) + '&';
            }
            data += 'h=' + config.q.h;

            let url = 'https://' + window.location.hostname + '/game.php?' + ((config.q.t) ? 't=' + config.q.t + '&' : '') + 'village=' + config.q.village + '&screen=scavenge_api&ajaxaction=send_squads';
            console.log(url, data);

            GM_xmlhttpRequest ( {
                method:     'POST',
                url:        url,
                data:       data,
                headers:    {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'TribalWars-Ajax': '1',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                onload: function (response) {
                    console.log(response);

                    if (response.status == 200) {
                        let resp = JSON.parse(response.response);
                        console.log(resp);

                        if (resp.bot_protect) {
                            disableSession();
                        }
                    } else {
                        console.log(response);
                    }
                    setTimeout(function() {
                        window.location.reload();
                    }, 2000);
                }
            } );
        }
    }

    function pageUrl() {
        let url = 'https://' + window.location.hostname + '/game.php?' + ((config.q.t) ? 't=' + config.q.t + '&': '') + 'village=' + config.q.village + '&screen=place&mode=scavenge';
        return url;
    }

    function activate() {
        if (config.time > 0) {
            alert('Невозможно до оконачания сборов');
            return;
        }

        console.log('Activating');
        disablecontrols();
        enableSession();
        loadFirstTimer();
    }

    function deactivate() {
        disableSession();
        window.location.reload();
    }

    function timetoMilliSeconds(hours, minutes, seconds) {
        return hours * 3600000 + minutes * 60000 + seconds * 1000;
    }

    function readScreenParams() {
        console.log('Reading params ...');

        // find sit id and h code
        let elements = document.getElementsByClassName('footer-link');
        config.q = readQuerryParams(String(elements[elements.length - 2]));

         // find all busy groups
        elements = document.getElementsByClassName('return-countdown');
        console.log('Count downs', elements);
        let time = 0;
        for (let i = 0; i < elements.length; ++i) {
            let times = elements[i].innerHTML.split(':');
            let current = timetoMilliSeconds(times[0], times[1], times[2]);
            if (current > time) {
                time = current;
            }
        }

        config.time = time;

        // find number of opened places
        // ignore care if busy
        if (config.time == 0) {
            var access = document.getElementsByClassName('status-specific');
            for (let i = 3; i >= 0; --i) {
                if (access[i].lastChild.className == 'inactive-view')
                {
                    config.n = i + 1;
                    break;
                }
            }
            console.log('Number opened places', config.n);
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
            td.innerHTML = timer.name;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = timer.village;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = timer.reason;
            tr.appendChild(td);

            td = document.createElement('td');
            let date = new Date();
            date.setTime(timer.time);
            td.innerHTML = date.toLocaleTimeString();
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = '<a class="" href="#"><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/delete_small.png" title="" alt="" class=""></a>';
            tr.appendChild(td);
            td.addEventListener('click', function() {removeTimer(i)}, false);
        }
    }

});