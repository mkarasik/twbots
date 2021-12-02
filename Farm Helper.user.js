// ==UserScript==
// @name     Farm Helper
// @namespace   https://*.tribalwars.net
// @namespace   https://*.voyna-plemyon.ru
// @include     *.voyna-plemyon.ru*screen=am_farm*
// @version     4.4
// @grant       GM_xmlhttpRequest
// ==/UserScript==

$(document).ready(function() {

    let scriptInitials = 'FH';
    let scriptFriendlyName = 'Фарм Бот';

    let config = {};

    readScreenParams();
    readSessionConfig();
    readSessionState();
    readReports();
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

    function saveIndex() {
        config.session.index = '' + config.currentIndex;
        saveSessionConfig()
    }

    function readIndex() {
        config.currentIndex = config.session.index ? parseInt(config.session.index) : 0;
    }

    function resetIndex() {
        config.currentIndex = 0;
        saveIndex();
    }

    function createControls() {
        console.log('Creating controls ...');

        let inputs = {};

        let elements = document.querySelectorAll('div.vis');
        //console.log(elements);

        // create div
        let controlsDiv = document.createElement('div');
        controlsDiv.className = 'vis';
        elements[1].parentNode.insertBefore(controlsDiv, elements[1].nextSibling);

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
        body.appendChild(tr0);

        let tr1 = document.createElement('tr');
        body.appendChild(tr1);

        // columns
        let columns = [
            ['', 'Статус'],
            ['template', 'Шаблон', '<option value="a">A</option><option value="b">B</option>', 'a'],
            ['distance', 'Расстояние', '<option value="6">6</option><option value="12">12</option><option value="18">18</option><option value="36">36</option><option value="100">100</option>', '36']
        ];

        for (let i = 0; i < columns.length; ++i) {
            let th = document.createElement('th');
            th.style = 'text-align:center';
            th.innerHTML = columns[i][1];
            tr0.appendChild(th);

            let td = document.createElement('td');
            td.align = 'center';
            if (i == 0) {
                td.innerHTML = 'Неактивно.';
                td.style = 'width:30%';
                inputs[columns[i][0]] = td;
            } else {
                let input = document.createElement('select');
                input.innerHTML = columns[i][2];
                input.name = columns[i][0];
                td.appendChild(input);
                inputs[columns[i][0]] = input;

                if (config.session[columns[i][0]]) {
                    console.log('From session', columns[i][0], config.session[columns[i][0]]);
                    input.value = config.session[columns[i][0]];
                } else {
                    console.log('From defaults', columns[i][0]);
                    input.value = columns[i][3];
                }
            }
            tr1.appendChild(td);
        }

        // add buttons

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

        tr1.appendChild(tdb);
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
    }

    function saveSelection() {
        for (let control in config.inputs) {
            let name = config.inputs[control].name;
            let value = config.inputs[control].value;

            if (name) {
                config.session[name] = value;
            }
        }
        saveSessionConfig();

        // add vilalge to timers list with no delay
        addTimer('Готовность к запуску', pageUrl(), 0, true);
    }

    function disablecontrols() {
        // remove divs
        let elements = document.querySelectorAll('div.vis');
        elements[0].remove();
        elements[1].remove();

        // disable controls
        for (let control in config.inputs) {
            if (control != 'start') {
                config.inputs[control].readOnly = true;
                config.inputs[control].disabled = true;
            }
        }
    }

    function startLoot() {

        disablecontrols();

        setStatus('Запусакется ...');

        readIndex();

        config.currentTemplate = config[config.session.template];        
        config.wait = 25;
        config.distance = parseInt(config.session.distance);

        startReportProcess(false);
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

    function startReportProcess(wait) {

        let min = wait ? (config.wait - 3) * 60000 : 600;
        let max = wait ? (config.wait + 3) * 60000 : 800;

        let rand = Math.floor(Math.random() * (max - min + 1) + min);
        console.log('Waiting for ' + rand + ' milliseconds ...');
        window.setTimeout(function() {
            processReport();
        }, rand);

        var date = new Date(Date.now() + rand);
        return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    }

    function pageUrl(page) {
        let url = 'https://' + window.location.hostname + '/game.php?' + ((config.q.t) ? 't=' + config.q.t + '&': '') + 'village=' + config.q.village + '&screen=am_farm&order=distance&dir=asc';
        if (page) {
            url += '&Farm_page=' + page;
        }
        return url;
    }

    function waitAndReload(reason, page) {

        setStatus(reason);

        // don't wait too long for page 3 - 5 sec
        let min = page ? 3000 : (config.wait - 3) * 60000;
        let max = page ? 5000 : (config.wait + 3) * 60000;

        let rand = Math.floor(Math.random() * (max - min + 1) + min);

        let url = pageUrl(page);

        // add to timers list
        // load first timer in list
        addTimer(reason, url, rand, true);
        loadFirstTimer();
    }

    function getNextPage() {
        let page;
        let q = readQuerryParams(window.location.href);
        if (!q.Farm_page) {
            page = 0;
        } else {
            page = parseInt(q.Farm_page);
        }

        console.log('current page', page);
        let numPages = document.getElementsByClassName('paged-nav-item').length / 2;
        if (++page >= numPages) {
            page = 0;
        }

        return page;
    }

    function processReport() {
        console.log('Processing', config.currentIndex);

        if (config.currentIndex >= config.reports.length) {
            console.log('Done');
            let page = getNextPage();
            resetIndex();
            waitAndReload('Страница завершена.', page);
        } else if (config.reports[config.currentIndex].distance > config.distance) {
            resetIndex();
            waitAndReload('Радиус ' + config.distance + ' завершен.', 0);
        } else {
            setStatus('Репорт: ' + config.currentIndex + '/' + config.reports.length + ' ...');

            // sending POST
            let data = 'target=' + config.reports[config.currentIndex].target + '&template_id=' + config.currentTemplate.template_id + '&source=' + config.q.village + '&h=' + config.q.h;
            let url = 'https://' + window.location.hostname + '/game.php?' + ((config.q.t) ? 't=' + config.q.t + '&' : '') + 'village=' + config.q.village + '&screen=am_farm&mode=farm&ajaxaction=farm&json=1&=';
            console.log(url, data);
            console.log(config.currentTemplate);

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
                            window.location.reload();
                        } else if (resp.response && resp.response.success) {
                            config.currentIndex++;
                            startReportProcess(false);
                        } else if (resp.error && resp.error.length > 0) {
                            saveIndex();
                            waitAndReload(resp.error[0]);
                        }
                    } else {
                        setStatus('Failed to send request: ', response.status);
                        console.log(response);
                    }
                }
            } );
        }
    }

    function setStatus(status) {
        config.inputs[''].innerHTML = status;
    }

    function readReports() {
        console.log('Reading reports ...');

        let elements = document.querySelectorAll('[id^=village_]');
        let reports = [];

        for (let i = 0; i < elements.length; ++i) {

            if (elements[i].className.startsWith('report_')) {
                let report = {};
                // get target
                report.target = elements[i].id.substring(8);

                // get distance
                report.distance = parseInt(elements[i].childNodes[15].innerHTML.split('.')[0]);
                reports.push(report);
            }
        }

        config.reports = reports;
        console.log('Reports reading done.', reports);
    }

    function readScreenParams() {
        console.log('Reading params ...');

        // find sit id and h code
        let elements = document.getElementsByClassName('footer-link');
        config.q = readQuerryParams(String(elements[elements.length - 2]));

         // Read templates
        config.a = readTemplate(document.getElementsByClassName('farm_icon_a'));
        config.b = readTemplate(document.getElementsByClassName('farm_icon_b'));

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

    function readTemplate(elements) {
        if (elements.length < 2) {
            console.log('Template not found ', elements);
        } else {
            let element = elements[1];
            console.log('Template found ', element.outerHTML.split(', ')[2].split(')')[0]);
            return { 'template_id' : element.outerHTML.split(', ')[2].split(')')[0] };
        }
        return {};
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
