function updateContextMenu() {
    chrome.proxy.settings.get({ incognito: false }, config => {
        chrome.contextMenus.removeAll(() => {
            if(config.value.mode === 'fixed_servers') {
                chrome.contextMenus.create({
                    id: 'disconnectProxy',
                    title: 'Disconnect from proxy',
                    contexts: ['all'],
                });
            } else {
                chrome.storage.local.get('proxies', data => {
                    const proxies = data.proxies || [];
                    if(proxies.length > 0) {
                        chrome.contextMenus.create({
                            id: 'connectProxy',
                            title: 'Connect to proxy',
                            contexts: ['all'],
                        });
                    }
                });
            }
        });
    });
}

function setBadgeText(text) {
    chrome.action.setBadgeText({ text: text });
    chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ proxies: [], bypassList: '' });
    chrome.proxy.settings.get({ incognito: false }, config => {
        setBadgeText((config.value.mode === 'fixed_servers') ? ' ' : '');
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    chrome.storage.local.get(['proxies', 'bypassList'], data => {
        const proxies = data.proxies;
        const bypassList = data.bypassList.split(';').map(item => item.trim());

        switch(request.action) {
            case 'get':
                sendResponse({
                    proxies: data.proxies,
                    bypassList: data.bypassList
                });
                break;

            case 'connect':
                proxies.forEach(proxy => proxy.connected = false);

                let proxy = proxies[request.index] || {
                    scheme: request.scheme,
                    host: request.host,
                    port: request.port,
                    username: request.username,
                    password: request.password,
                    connected: false,
                };

                const checkProxies = proxies.filter(p =>
                    p.scheme === proxy.scheme
                    && p.host === proxy.host
                    && parseInt(p.port) === parseInt(proxy.port)
                );

                if(!checkProxies.length) {
                    proxies.push(proxy);
                } else {
                    proxy = checkProxies[0];
                }

                proxy.connected = true;

                const config = {
                    mode: 'fixed_servers',
                    rules: {
                        singleProxy: {
                            scheme: proxy.scheme,
                            host: proxy.host,
                            port: parseInt(proxy.port),
                        },
                        bypassList: ['<local>', ...bypassList]
                    },
                };

                chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
                    chrome.storage.local.set({ proxies }, () => {
                        setBadgeText(' ');
                        sendResponse({ status: 'Proxy connected' });
                    });
                });

                break;
            
            case 'disconnect':
                proxies.forEach(proxy => proxy.connected = false);
                chrome.proxy.settings.clear({ scope: 'regular' }, () => {
                    chrome.storage.local.set({ proxies }, () => {
                        setBadgeText('');
                        sendResponse({ status: 'Proxy disconnected' })
                    });
                });
                break;

            case 'delete':
                proxies.splice(request.index, 1);
                chrome.storage.local.set({ proxies }, () => 
                    sendResponse({ status: 'Proxy deleted' }))
                break;
        }

        updateContextMenu();
    });

    return true;
});

chrome.contextMenus.onClicked.addListener(info => {
    chrome.storage.local.get(['proxies', 'bypassList'], data => {
        const proxies = data.proxies;
        const bypassList = data.bypassList.split(';').map(item => item.trim());

        proxies.forEach(proxy => proxy.connected = false);

        switch(info.menuItemId) {
            case 'connectProxy':
                const proxy = proxies[proxies.length - 1];
                proxy.connected = true;

                const config = {
                    mode: 'fixed_servers',
                    rules: {
                        singleProxy: {
                            scheme: proxy.scheme,
                            host: proxy.host,
                            port: parseInt(proxy.port),
                        },
                        bypassList: ['<local>', ...bypassList]
                    },
                };

                chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
                    chrome.storage.local.set({ proxies }, () => {
                        setBadgeText(' ');
                    });
                });
                break;

            case 'disconnectProxy':
                chrome.proxy.settings.clear({ scope: 'regular' }, () => {
                    chrome.storage.local.set({ proxies }, () => {
                        setBadgeText('');
                    });
                });
                break;
        }

        updateContextMenu();
    });
});

chrome.proxy.settings.onChange.addListener(() => {
    updateContextMenu();
});