const translations = {
  // Navigation
  "Recent Logins": "最近登錄",
  "Network Usage": "網路流量",
  "Xray IP Stats": "Xray IP 統計",
  "App Config": "應用配置",
  "Analytics": "數據分析",

  // Network Usage
  "Network IP": "網路 IP",
  "User": "用戶",
  "Last Updated": "最後更新",
  "Total Sent": "總發送量",
  "Total Received": "總接收量",
  "Mobile Data": "行動數據",
  "WiFi Data": "WiFi 數據",
  "Details": "詳情",
  "View Stats": "查看統計",
  "View Details": "查看詳情",
  "App Usage Statistics": "應用使用統計",
  "Active Today": "今日活躍",
  "Total Users": "總用戶數",
  "Total Data Sent (All-Time):": "總數據發送 (歷史總計):",
  "Total Data Received (All-Time):": "總數據接收 (歷史總計):",
  "Top User (Data Volume):": "流量最高用戶:",
  "Preferred Network Type:": "首選網路類型:",
  "Users": "用戶",
  "All Pings": "所有 Ping",
  "By User (Current)": "按用戶查看 (最新)",
  "By Time (Historical)": "按時間查看 (歷史)",
  "View Raw DB Data": "查看原始數據",
  "Raw MongoDB Telemetries (Buckets)": "原始 MongoDB 遙測數據 (Buckets)",
  "Date": "日期",
  "Date/Time": "日期 / 時間",
  
  // Xray
  "Active Xray Proxy Servers": "活躍的 Xray 代理服務器",
  "Proxy IP": "代理 IP",
  "Active Users": "活躍用戶",
  "Total Sent (All-Time)": "總發送 (歷史總計)",
  "Total Received (All-Time)": "總接收 (歷史總計)",
  "Connected Users": "已連接用戶",
  "Xray IP": "Xray IP",
  "No Xray proxy data available yet.": "暫無 Xray 代理數據。",

  // Logins
  "Network IPs": "網路 IP",
  "Time": "時間",
  "Device": "設備",
  "VPN?": "是否使用 VPN?",
  "Emulator": "模擬器",
  "No logins recorded yet.": "暫無登錄記錄。",

  // Configs
  "App Version Configuration": "應用版本配置",
  "Version Code": "版本號 (Code)",
  "Version Name": "版本名 (Name)",
  "Download URL": "下載連結",
  "Changelog": "更新日誌",
  "Require Force Update": "要求強制更新",
  "Save Configuration": "保存配置",
  "Transit Node IPs": "中轉節點 IP",
  "Manage the list of transit node IPs served at": "管理中轉節點 IP 列表提供於",
  "+ Add IP Address": "+ 新增 IP 地址",
  "Remarks / Scratchpad": "備註 / 草稿本",
  "Save Transit IPs & Remarks": "保存中轉 IP 與備註",
  "Available Endpoints": "可用 API 端點",
  "Configuration saved successfully!": "配置保存成功！",
  "Failed to save configuration.": "配置保存失敗。",
  "Error loading configuration.": "加載配置出錯。",
  "Failed to load current version data.": "加載當前版本數據失敗。",
  "No transit IPs configured. Click \"+ Add IP Address\" to get started.": "尚未配置中轉 IP。點擊「+ 新增 IP 地址」開始配置。",
  "Failed to load transit IPs.": "加載中轉 IP 失敗。",
  "Error loading transit IPs.": "加載中轉 IP 出錯。",
  "Failed to save transit IPs.": "保存中轉 IP 失敗。",
  "Error saving transit IPs.": "保存中轉 IP 出錯。",

  // Analytics
  "TalkPro Telemetry - Analytics": "TalkPro 遙測 - 數據分析",
  "Network Statistics": "網路統計",
  "Daily Network Statistics": "每日網路統計",
  "Daily Active Users": "每日活躍用戶",
  "Daily New Users": "每日新增用戶",
  "Active Users (Period)": "活躍用戶 (所選期間)",
  "New Users (Period)": "新增用戶 (所選期間)",
  "Total Users (All-time)": "總用戶數 (歷史)",
  "Avg Total Upload / User": "平均用戶總發送流量",
  "Avg Total Download / User": "平均用戶總接收流量",
  "Avg Daily Upload / User": "平均用戶單日發送",
  "Avg Daily Download / User": "平均用戶單日接收",
  "Avg Upload / User (Period)": "平均用戶發送 (所選期間)",
  "Avg Download / User (Period)": "平均用戶接收 (所選期間)",
  "Top 20 Users by Traffic": "前 20 名流量用戶",
  "Traffic": "流量",
  "Usage Days": "使用天數",
  
  // Timeframes
  "Latest Ping": "最新 Ping",
  "Last 15 Mins": "過去 15 分鐘",
  "Last Hour": "過去一小時",
  "Today": "今天",
  "Yesterday": "昨天",
  "This Week": "本週",
  "All Time": "歷史總計",
  
  // General / Misc
  "Loading...": "加載中...",
  "Unknown": "未知"
};

const lang = localStorage.getItem('lang') || 'en';

window.t = function(text) {
    if (lang === 'zh') {
        return translations[text] || text;
    }
    return text;
};

document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('nav');
    if (nav) {
        const btn = document.createElement('button');
        btn.id = 'langBtn';
        btn.style = 'padding: 4px 10px; background: #f39c12; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap;';
        btn.innerText = lang === 'en' ? '中文' : 'English';
        btn.onclick = () => {
            localStorage.setItem('lang', lang === 'en' ? 'zh' : 'en');
            window.location.reload();
        };
        nav.appendChild(btn);
    }

    if (lang === 'zh') {
        translateDOM(document.body);
        
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) translateDOM(node);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
});

function translateDOM(node) {
    if (lang === 'en') return;
    
    // Quick text translation for elements with data-i18n specifically 
    // to handle static divs that don't have text directly inside but we want to translate their textContent
    const i18nNodes = node.querySelectorAll ? node.querySelectorAll('[data-i18n]') : [];
    i18nNodes.forEach(n => {
        const txt = n.innerText.trim();
        if (translations[txt]) {
            n.innerText = translations[txt];
            n.removeAttribute('data-i18n'); // prevent re-translation
        }
    });

    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    let n;
    while (n = walker.nextNode()) {
        const trimmed = n.nodeValue.trim();
        if (trimmed && translations[trimmed]) {
            n.nodeValue = n.nodeValue.replace(trimmed, translations[trimmed]);
        }
    }
    
    if (node.querySelectorAll) {
        const inputs = node.querySelectorAll('input[placeholder], textarea[placeholder]');
        inputs.forEach(input => {
            const ph = input.getAttribute('placeholder');
            if (translations[ph]) {
                input.setAttribute('placeholder', translations[ph]);
            }
        });
    }
}
