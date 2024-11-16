document.addEventListener('DOMContentLoaded', () => updateStatus());

document.querySelectorAll('.nav-tab').forEach(element =>
    element.addEventListener('click', event => changeTab(event)));

document.getElementById('connect').addEventListener('click', () => {
    const proxyString = document.getElementById('proxyString').value;

    if(!proxyString) {
        alert('Please enter a proxy string!');
        return;
    }

    try {
        const url = new URL(proxyString);

        sendAction('connect', response => updateStatus(), {
            scheme: url.protocol.slice(0, -1),
            host: url.hostname,
            port: url.port || url.host.split(':')[1] || ((url.protocol === 'https:') ? 443 : 80),
            username: url.username,
            password: url.password,
        });
    } catch(e) {
        alert('Invalid format!');
    }
});

document.getElementById('disconnect').addEventListener('click', () => switchProxy(0, true));

document.getElementById('saveBypassList').addEventListener('click', () => {
    const bypassList = document.getElementById('bypassList').value;
    chrome.storage.local.set({ bypassList: bypassList }, () => {
        reconnectProxy();
    });
});

function changeTab(event) {
    document.querySelectorAll('.nav-tab').forEach(element => element.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.tab').forEach(element => element.style.display = 'none');
    document.getElementById(event.target.dataset.tab).style.display = 'block';
}

function sendAction(action, callback, params = {}) {
    const config = {action: action};
    for(const key in params)
        config[key] = params[key];
    chrome.runtime.sendMessage(config, response => callback(response));
}

function updateStatus() {
    chrome.proxy.settings.get({ incognito: false }, config => {
        document.getElementById('status').textContent = (config.value.mode === 'fixed_servers')
            ? `Status: Connected to ${config.value.rules.singleProxy.scheme}://${config.value.rules.singleProxy.host}:${config.value.rules.singleProxy.port}`
            : 'Status: Not connected';
    });
    loadStorageData();
}

function loadStorageData() {
    sendAction('get', response => {
        document.getElementById('bypassList').value = response.bypassList || '';

        const savedProxies = document.getElementById('savedProxies');
        savedProxies.innerHTML = (response.proxies.length) ? '' : 'No proxies found, add on the connection form tab';

        response.proxies.forEach((proxy, index) => {
            const div = document.createElement('div');
            div.classList.add('proxy');

            const text = document.createElement('span');
            text.textContent = `${proxy.scheme}://${proxy.host}:${proxy.port}`;
            text.onclick = () => document.getElementById('proxyString').value = (proxy.username && proxy.password)
                ? `${proxy.scheme}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
                : `${proxy.scheme}://${proxy.host}:${proxy.port}`;
            div.appendChild(text);

            const p = document.createElement('p');
            p.classList.add('row');

            const switcher = document.createElement('a');
            switcher.classList.add('col');
            switcher.innerHTML = (proxy.connected) ? `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-on" viewBox="0 0 16 16">
                    <path d="M5 3a5 5 0 0 0 0 10h6a5 5 0 0 0 0-10zm6 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8"/>
                </svg>
            ` : `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-off" viewBox="0 0 16 16">
                    <path d="M11 4a4 4 0 0 1 0 8H8a5 5 0 0 0 2-4 5 5 0 0 0-2-4zm-6 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8M0 8a5 5 0 0 0 5 5h6a5 5 0 0 0 0-10H5a5 5 0 0 0-5 5"/>
                </svg>
            `;
            switcher.onclick = () => switchProxy(index, proxy.connected);
            p.appendChild(switcher);

            const deleteLink = document.createElement('a');
            deleteLink.classList.add('col');
            deleteLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>
            `;
            deleteLink.onclick = () => deleteProxy(index);
            p.appendChild(deleteLink);

            div.appendChild(p);
            savedProxies.appendChild(div);
        });
    });
}

function reconnectProxy() {
    chrome.proxy.settings.get({ incognito: false }, config => {
        if(config.value.mode === 'fixed_servers') {
            sendAction('connect', response => updateStatus(), config.value.rules.singleProxy);
        }
    });
}

function switchProxy(index, connected = false) {
    sendAction(connected ? 'disconnect' : 'connect', response => updateStatus(), { index: index });
}

function deleteProxy(index) {
    sendAction('delete', response => updateStatus(), { index: index });
}