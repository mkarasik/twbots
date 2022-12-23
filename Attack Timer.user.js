// ==UserScript==
// @name        Attack Timer
// @namespace   https://*.tribalwars.net
// @namespace   https://*.voynaplemyon.com
// @include     *.voynaplemyon.com*screen=place&try=confirm*
// @include     *.tribalwars.net*screen=place&try=confirm*
// @version     1.5
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js
// @require     https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.min.js
// @resource    jqUI_CSS  http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/themes/base/jquery-ui.css
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==


//--- Date picker needs additional CSS
GM_addStyle (GM_getResourceText ("jqUI_CSS") );

let config = {};

let attackClockScew = GM_getValue('ATClockScew', -100);

readSessionConfig();
readScreenParams();
calculateDateTimeOffsets();
createControls();


// calculate date/time offsets
function calculateDateTimeOffsets() {
    let date = document.getElementById('serverDate').innerHTML.split('/');
    let time = document.getElementById('serverTime').innerHTML.split(':');

    config.date = {};
    config.date.server = new Date(parseInt(date[2]), parseInt(date[1]) - 1, parseInt(date[0]), parseInt(time[0]));
    config.date.local = new Date();
    config.date.local.setMinutes(0, 0, 0);

    console.log(config.date.server, config.date.local);
}

/*--- Clean up ultra-crappy event handling ('til dev team eventually fixes).
    This must be done to allow the picker to work in a sandboxed environment.
    Alternately, you can modify the jQuery-UI source ala http://stackoverflow.com/q/2855403
*/
function cleanUpCrappyEventHandling () {
    //-- Fix base controls.
    var nodesWithBadEvents  = $(
        "div.ui-datepicker td[onclick^='DP'], div.ui-datepicker a[onclick^='DP']"
    );
    nodesWithBadEvents.each ( function () {
        fixNodeEvents ($(this), "click");
    } );

    //-- Fix month and year drop-downs.
    nodesWithBadEvents  = $(
        "div.ui-datepicker select[onchange^='DP']"
    );
    nodesWithBadEvents.each ( function () {
        fixNodeEvents ($(this), "change");
    } );
}

function fixNodeEvents (jNode, eventType) {
    var onName      = "on" + eventType;
    var fubarFunc   = jNode.attr (onName);

    /*--- fubarFunc will typically be like:
        DP_jQuery_1325718069430.datepicker._selectDay('#pickMe',0,2012, this);return false;
    */
    fubarFunc       = fubarFunc.replace (/return\s+\w+;/i, "");

    jNode.removeAttr (onName);
    jNode.bind (eventType, function () {
        eval (fubarFunc);
        cleanUpCrappyEventHandling ();
    } );
}

function createControls() {
    console.log('Creating controls ...');

    let inputs = {};

    // create div
    let controlsDiv = document.createElement('div');
    controlsDiv.className = 'vis';
    document.forms[0].parentNode.insertBefore(controlsDiv, document.forms[0]);

    let h = document.createElement('h4');
    h.innerHTML = 'Снайпер Бот';
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

    let tr2 = document.createElement('tr');
    body.appendChild(tr2);

    // columns
    let columns = [
        ['ATcriteria', 'select', 'Критерий выбора', '<option value="arrival">Прибытие</option><option value="departure">Отправление</option>', 'arrival'],
        //['ATcriteria', 'select', 'Критерий выбора', '<option value="arrival">Прибытие</option><option value="departure">Отправление</option><option value="return">Возвращение</option>', 'arrival'],
        ['ATdeparture', 'input', 'Отправление'],
        ['ATarrival', 'input', 'Прибытие']/*,
        ['ATreturn', 'input', 'Возвращение'],
        ['ATleft', 'status', 'Время до отправления']
        */
    ];

    for (let i = 0; i < columns.length; ++i) {
        let th = document.createElement('th');
        th.style = 'text-align:center';
        th.innerHTML = columns[i][2];
        tr0.appendChild(th);

        let td = document.createElement('td');
        td.align = 'center';

        let tdt = document.createElement('td');
        tdt.align = 'center';

        if (columns[i][1] == 'status') {
            td.innerHTML = 'Неактивно.';
            td.style = 'width:30%';
            inputs[columns[i][0]] = td;
        } else if (columns[i][1] == 'select') {
            td.rowSpan = 2;
            let input = document.createElement('select');
            input.innerHTML = columns[i][3];
            input.name = columns[i][0];
            td.appendChild(input);
            inputs[input.name] = input;

            if (config.session[columns[i][0]]) {
                console.log('From session', columns[i][0], config.session[columns[i][0]]);
                input.value = config.session[columns[i][0]];
            } else {
                console.log('From defaults', columns[i][0]);
                input.value = columns[i][4];
            }
        } else {
            let input = document.createElement('input');
            input.type = 'text';
            input.name = columns[i][0] + '_date';
            input.id = input.name;
            input.value = date2str(config.date.server, 'yyyy-MM-dd');
            td.appendChild(input);
            inputs[input.name] = input;

            input = document.createElement('input');
            input.type = 'text';
            input.name = columns[i][0] + '_time';
            tdt.appendChild(input);
            inputs[input.name] = input;

            // set typing processing
            input.timeout = null;
            input.addEventListener('input', function (e) {
                // Clear the timeout if it has already been set.
                // This will prevent the previous task from executing
                // if it has been less than <MILLISECONDS>
                clearTimeout(input.timeout);

                // Make a new timeout set to go off in 1000ms (1 second)
                input.timeout = setTimeout(function () {
                    recalculate();
                }, 1000);
            });
            tr2.appendChild(tdt);
        }

        tr1.appendChild(td);
    }

    //--- Add datepicker popups to select inputs
    for (let i = 0; i < columns.length; ++i) {
        if (columns[i][1] == 'input') {
            let id = columns[i][0] + '_date';

            //--- Add datepicker popups to select input:
            $("#" + id).datepicker ({
                dateFormat: "yy-mm-dd",
                defaultDate: config.date.server,
                minDate: config.date.server,
                changeMonth: true,
                changeYear: true,
                onSelect: function () {
                    selectedDate = date2str( $(this).datepicker('getDate'), 'yyyy-MM-dd');
                    recalculate();
                }
            });
            $("#" + id).click ( function () {
                setTimeout (cleanUpCrappyEventHandling, 100);
            });
        }
    }

    // criteria select event
    inputs.ATcriteria.addEventListener('change', selectCriteriaChanged, false);

    // clock scew config
    let th = document.createElement('th');
    th.style = 'text-align:center';
    th.innerHTML = 'Корректировка';
    tr0.appendChild(th);

    let td = document.createElement('td');
    td.align = 'center';
    let input = document.createElement('input');
    input.type = 'text';
    input.value = attackClockScew;
    td.appendChild(input);
    inputs.scew = input;
    tr1.appendChild(td);

    // add button
    let tdb = document.createElement('td');
    //tdb.rowSpan = 2;
    tdb.width = '5%';
    tdb.align = 'center';

    let btn = document.createElement('input');
    btn.className = 'btn';
    btn.value = 'Запустить';
    btn.addEventListener('click', startTimer, false);
    tdb.appendChild(btn);

    tr2.appendChild(tdb);

    inputs.btn = btn;


    // status
    table = document.createElement('table');
    table.className = 'vis';
    table.width = '100%';
    innerDiv.appendChild(table);

    body = document.createElement('tbody');
    table.appendChild(body);

    tr0 = document.createElement('tr');
    body.appendChild(tr0);

    tr1 = document.createElement('tr');
    body.appendChild(tr1);

    th = document.createElement('th');
    th.style = 'text-align:center';
    th.innerHTML = 'Локальное время отправления';
    tr0.appendChild(th);

    td = document.createElement('td');
    td.align = 'center';
    td.innerHTML = 'Неактивно';
    tr1.appendChild(td);
    inputs.localDeparture = td;

    th = document.createElement('th');
    th.style = 'text-align:center';
    th.innerHTML = 'Время до отправления';
    tr0.appendChild(th);

    td = document.createElement('td');
    td.align = 'center';
    tr1.appendChild(td);
    inputs.left = td;

    console.log('Controls created.', inputs);
    config.inputs = inputs;
    selectCriteriaChanged();
}

const zeroPad = (num, places) => String(num).padStart(places, '0');
function date2str(x, y) {
    var z = {
        M: x.getMonth() + 1,
        d: x.getDate(),
        h: x.getHours(),
        m: x.getMinutes(),
        s: x.getSeconds()
    };
    y = y.replace(/(M+|d+|h+|m+|s+)/g, function(v) {
        return ((v.length > 1 ? "0" : "") + z[v.slice(-1)]).slice(-2)
    });

    y = y.replace(/(S+)/g, function(v) {
        return zeroPad(x.getMilliseconds(), 3);
    });

    return y.replace(/(y+)/g, function(v) {
        return x.getFullYear().toString().slice(-v.length)
    });
}

function times2Str(hours, minutes, seconds, milliSeconds) {
    return zeroPad(hours, 2) + ':' + zeroPad(minutes, 2) + ':' + zeroPad(seconds, 2) + ':' + zeroPad(milliSeconds, 3);
}

function readtime(criteria) {

    // read time
    let times = timeParse(config.inputs['AT' + criteria + '_time'].value);

    if (!times) {
        return null;
    }

    let date = $("#AT" + criteria + "_date").datepicker('getDate');

    // use local time, will convert later
    date.setHours(times[0], times[1], times[2], times[3]);

    return date;
}

function timeParse(timeVal, trust) {
    let times = timeVal.split(':');

    if (times.length < 3 || times.length > 4) {
        console.log('wrong/incomplete time');
        return null;
    } else if (times.length == 3) {
        // push milliseconds
        times.push('000');
    }

    for (let i = 0; i < 4; ++i) {
        times[i] = parseInt(times[i]);
    }

    if (!trust) {
        // validate
        if (times[0] < 0 || times[0] > 23 ||
            times[1] < 0 || times[1] > 59 ||
            times[2] < 0 || times[2] > 59 ||
            times[3] < 0 || times[3] > 999) {
            console.log('wrong/incomplete time');
            return null;
        }
    }

    return times;
}

function timetoMilliSeconds(hours, minutes, seconds, milliSeconds) {
  	return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliSeconds;
}

function recalculate() {
    let elementText = document.URL.includes('tribal') ? 'Duration:' : 'Длительность:';
    let durationTd = findElement('td', elementText);
    let duration = timeParse(durationTd.nextElementSibling.innerHTML, true);

    // calculate times
    if (config.inputs.ATcriteria.value == 'arrival') {
        config.date.arrival = readtime('arrival');
        if (config.date.arrival) {
            config.date.departure = new Date(config.date.arrival.getTime() - timetoMilliSeconds(duration[0], duration[1], duration[2], duration[3]));
            let date = config.date.departure;
            config.inputs.ATdeparture_date.value = date2str(date, 'yyyy-MM-dd');
            config.inputs.ATdeparture_time.value = times2Str(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        }
    } else if (config.inputs.ATcriteria.value == 'departure') {
        config.date.departure = readtime('departure');
        if (config.date.departure) {
            config.date.arrival = new Date(config.date.departure.getTime() + timetoMilliSeconds(duration[0], duration[1], duration[2], duration[3]));
            let date = config.date.arrival;
            config.inputs.ATarrival_date.value = date2str(date, 'yyyy-MM-dd');
            config.inputs.ATarrival_time.value = times2Str(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        }
    } else {
        config.date.return = readtime('return');
    }
}

function findElement(tag, innerHtml) {
    var anchors = document.getElementsByTagName(tag);

    for (let i = 0; i < anchors.length; i++) {
        if (anchors[i].innerHTML == innerHtml) {
            return anchors[i];
        }
    }

    return null;
}

function startTimer() {
    recalculate();

    let localDeparture = new Date(config.date.local.getTime() - config.date.server.getTime() + config.date.departure.getTime());
    if (localDeparture < new Date()) {
        alert('Слишком поздно');
    } else {
        // disable controls
        for (let control in config.inputs) {
            let name = config.inputs[control].name;
            let value = config.inputs[control].value;

            if (name) {
                config.session[name] = value;
            }
            config.inputs[control].readOnly = true;
            config.inputs[control].disabled = true;
        }
        // start timers
        config.inputs.localDeparture.innerHTML = date2str(localDeparture, 'yyyy-MM-dd hh:mm:ss:SSS');

        // clock scew
        attackClockScew = parseInt(config.inputs.scew.value);
        GM_setValue('ATClockScew', attackClockScew);
        startTimers(localDeparture);
    }
}

function intervalToString(interval) {

  	let hours = Math.floor(interval / 3600000);
  	let minutes = Math.floor((interval - hours * 3600000) / 60000);
  	let seconds = Math.floor((interval - hours * 3600000 - minutes * 60000) / 1000);

  	return zeroPad(hours, 2) + ':' + zeroPad(minutes, 2) + ':' + zeroPad(seconds, 2);
}

function startTimers(localDeparture) {
    // Attack wait interval
  	let interval = localDeparture.getTime() - new Date().getTime() + attackClockScew;
    let form = document.forms[0];

    // if more 30 seconds start rough timer
    // readjust time on event
    if (interval > 12 * 1000) {
        window.setTimeout(function() {
            startSubmitTimer(localDeparture);
        }, interval - 10 * 1000);
    } else {
        startSubmitTimer(localDeparture);
    }

    startCountDownTimer(localDeparture);
}

function startCountDownTimer(localDeparture) {
    let interval = localDeparture.getTime() - new Date().getTime() + attackClockScew;
    config.inputs.left.innerHTML = intervalToString(interval);

    if (interval > 5) {
        window.setTimeout(function() {
            startCountDownTimer(localDeparture);
        }, 5000);
    }
}

function startSubmitTimer(localDeparture) {
    console.log('Submit Timer');

    let attackInput = document.getElementsByName('submit_confirm')[0];
    let interval = localDeparture.getTime() - new Date().getTime() + attackClockScew;

    window.setTimeout(function() {
        //console.log(new Date());
        attackInput.click();
    }, interval);
}

function selectCriteriaChanged() {
    let departureVal;
    let arrivalVal;
    let returnVal;

    if (config.inputs.ATcriteria.value == 'arrival') {
        departureVal = true;
        arrivalVal = false;
        returnVal = true;
    } else if (config.inputs.ATcriteria.value == 'departure') {
        departureVal = false;
        arrivalVal = true;
        returnVal = true;
    } else {
        departureVal = true;
        arrivalVal = true;
        returnVal = false;
    }

    config.inputs.ATdeparture_date.readOnly = departureVal;
    config.inputs.ATdeparture_date.disabled = departureVal;
    config.inputs.ATdeparture_time.readOnly = departureVal;
    config.inputs.ATdeparture_time.disabled = departureVal;

    config.inputs.ATarrival_date.readOnly = arrivalVal;
    config.inputs.ATarrival_date.disabled = arrivalVal;
    config.inputs.ATarrival_time.readOnly = arrivalVal;
    config.inputs.ATarrival_time.disabled = arrivalVal;
/*
    config.inputs.ATreturn_date.readOnly = returnVal;
    config.inputs.ATreturn_date.disabled = returnVal;
    config.inputs.ATreturn_time.readOnly = returnVal;
    config.inputs.ATreturn_time.disabled = returnVal;
 */
}

function readSessionConfig() {
    console.log('Reading session config ...');

    config.session = {};

    let i = 0;
    while(true) {
        let key = sessionStorage.key(i++);

        if (!key) {
            break;
        }
        console.log(key);
        config.session[key] = sessionStorage.getItem(key);
    }

    console.log('Session config read', config.session);
}

function saveSessionconfig() {
    console.log('Saving session config ...', config.session);

    sessionStorage.clear();
    for (let item in config.session) {
        sessionStorage.setItem(item, config.session[item]);
    }

    console.log('Session config saved');
}


function readScreenParams() {
    console.log('Reading params ...');

    // find sit id and h code
    let elements = document.getElementsByClassName('footer-link');
    config.q = readQuerryParams(String(elements[elements.length - 2]));

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