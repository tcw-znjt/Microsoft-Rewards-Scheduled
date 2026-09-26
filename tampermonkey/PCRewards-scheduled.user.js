// ==UserScript==
// @name         Microsoft Bing Rewards每日任务脚本（定时版）
// @version      V6.1.0
// @description  每日定时自动执行搜索任务，获取抖音/微博/哔哩哔哩/百度/头条热门词,避免使用同样的搜索词被封号。
// @author       怀沙2049
// @match        *://cn.bing.com/*
// @match        *://www.bing.com/*
// @match        *://bing.com/*
// @match        *://rewards.bing.com/*
// @match        *://www.rewards.bing.com/*
// @match        *://rewards.microsoft.com/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @icon         https://www.bing.com/favicon.ico
// @connect      gumengya.com
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @license      GNU GPLv3
// @grant        GM_xmlhttpRequest
// @namespace    https://greasyfork.org/zh-CN/scripts/477107
// ==/UserScript==

(function() {
    'use strict';
    console.log('=== Microsoft Rewards 脚本开始运行 [版本 2026-09-26-定时版] ===');
    console.log('当前页面:', window.location.href);
    console.log('当前域名:', window.location.hostname);

    // ==================== 配置参数 ====================
    const MAX_SEARCH_REWARDS = 45; // 最大搜索次数
    //每执行5次搜索后插入暂停时间,解决账号被监控不增加积分的问题
    const PAUSE_TIME = GM_getValue('ms_rewards_pause_time', 6); // 建议暂停时长为16分钟,也就是960000(60000毫秒=1分钟)

    // API Key配置
    //从https://www.gmya.net/api 网站申请的热门词接口APIKEY
    let appkey = GM_getValue('ms_rewards_appkey', ''); // 这里输入你的API Key

    // ==================== 定时任务配置 ====================
    let schedule_enabled = GM_getValue('schedule_enabled', true); // 是否开启定时任务
    let schedule_time = GM_getValue('schedule_time', '00:30'); // 每日定时执行时间（HH:mm格式）
    const SCHEDULE_CHECK_INTERVAL = 2257037; // 定时检查间隔：约37.6分钟（毫秒）
    const SEARCH_TASK_TIMEOUT = 2 * 60 * 60 * 1000; // 任务进行中判定阈值：2小时内有心跳视为任务进行中

    // ==================== 搜索任务配置 ====================
    let search_words = [];
    const default_search_words = ["盛年不重来，一日难再晨", "千里之行，始于足下", "少年易学老难成，一寸光阴不可轻", "敏而好学，不耻下问", "海内存知已，天涯若比邻", "三人行，必有我师焉",
    "莫愁前路无知已，天下谁人不识君", "人生贵相知，何用金与钱", "天生我材必有用", "海纳百川有容乃大；壁立千仞无欲则刚", "穷则独善其身，达则兼济天下", "读书破万卷，下笔如有神",
    "学而不思则罔，思而不学则殆", "一年之计在于春，一日之计在于晨", "莫等闲，白了少年头，空悲切", "少壮不努力，老大徒伤悲", "一寸光阴一寸金，寸金难买寸光阴", "近朱者赤，近墨者黑",
    "吾生也有涯，而知也无涯", "纸上得来终觉浅，绝知此事要躬行", "学无止境", "己所不欲，勿施于人", "天将降大任于斯人也", "鞠躬尽瘁，死而后已", "书到用时方恨少", "天下兴亡，匹夫有责",
    "人无远虑，必有近忧", "为中华之崛起而读书", "一日无书，百事荒废", "岂能尽如人意，但求无愧我心", "人生自古谁无死，留取丹心照汗青", "吾生也有涯，而知也无涯", "生于忧患，死于安乐"]

    //{weibohot}微博热搜榜/{bilihot}哔哩热搜榜/{douyinhot}抖音热搜榜/{zhihuhot}知乎热搜榜/{baiduhot}百度热搜榜
    const keywords_source = ['ZhiHuHot', 'WeiBoHot', 'TouTiaoHot', 'DouYinHot', 'BaiduHot'];
    const random_keywords_source = keywords_source[Math.floor(Math.random() * keywords_source.length)];
    const Hot_words_apis = "https://api.gmya.net/Api/";

    // ==================== 获取热门搜索词 ====================
    function getHotWords() {
        let url = Hot_words_apis + random_keywords_source;
        if (appkey) {
            url += '?format=json&appkey=' + appkey;
        } else {
            url += '?format=json';
        }
        console.log('尝试获取热门搜索词，URL:', url);
        return new Promise((resolve, reject) => {
            fetch(url)
                .then(response => {
                    console.log('API响应状态:', response.status);
                    return response.json();
                })
                .then(data => {
                    console.log('API返回数据:', JSON.stringify(data));
                    if (data.data && data.data.some(item => item)) {
                        const names = data.data.map(item => item.title);
                        console.log('获取到的热门搜索词:', names);
                        resolve(names);
                    } else {
                        console.log('API返回数据格式不正确，使用默认搜索词');
                        resolve(default_search_words);
                    }
                })
                .catch(error => {
                    console.error('获取热门搜索词失败:', error);
                    resolve(default_search_words);
                });
        });
    }

    // ==================== 生成随机字符串 ====================
    function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    // ==================== 平滑滚动到页面底部 ====================
    function smoothScrollToBottom() {
        document.documentElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    // ==================== 搜索任务执行函数 ====================
    function executeSearchTask() {
        // 更新任务心跳，供定时任务判断任务是否真的在进行中
        GM_setValue('search_task_heartbeat', Date.now());
        let randomDelay = Math.floor(Math.random() * 60000) + 300000; // 每次搜索间隔 5~6 分钟随机
        let randomString = generateRandomString(4);
        let randomCvid = generateRandomString(32);

        if (GM_getValue('search_cnt') == null) {
            GM_setValue('search_cnt', 0);
        }

        let currentSearchCount = GM_getValue('search_cnt');

        if (currentSearchCount < MAX_SEARCH_REWARDS) {
            let tt = document.getElementsByTagName("title")[0];
            tt.innerHTML = "[" + (currentSearchCount + 1) + " / " + MAX_SEARCH_REWARDS + "] " + tt.innerHTML;
            smoothScrollToBottom();
            GM_setValue('search_cnt', currentSearchCount + 1);

            setTimeout(function() {
                let nowtxt = search_words[currentSearchCount % search_words.length];
                let searchUrl = "https://www.bing.com/search?q=" + encodeURI(nowtxt) + "&form=" + randomString + "&cvid=" + randomCvid;

                if ((currentSearchCount + 1) % 5 === 0) {
                    setTimeout(function() {
                        location.href = searchUrl;
                    }, PAUSE_TIME);
                } else {
                    location.href = searchUrl;
                }
            }, randomDelay);
        } else {
            console.log('✅ 搜索任务已完成');
            // 清除脚本搜索标记，就地结束
            sessionStorage.removeItem('ms_script_search');
            GM_setValue('search_cnt', 0);
            GM_setValue('search_completed', 'false');
        }
    }

    // ==================== Bing主页功能 ====================
    function handleBingHomePage() {
        console.log('⚠ 在bing.com主页');

        const urlParams = new URLSearchParams(window.location.search);
        const isStartSearch = urlParams.get('start_search') === 'true';

        // 如果是从菜单点击"开始搜索任务"或定时任务跳转过来的，则立即开始搜索
        if (isStartSearch) {
            console.log('🚀 检测到开始搜索任务指令，准备开始搜索...');
            setTimeout(() => {
                const randomString = generateRandomString(4);
                const randomCvid = generateRandomString(32);
                const firstSearchWord = search_words[0] || 'Microsoft Rewards';
                // 设置标记，表示这是脚本触发的搜索
                sessionStorage.setItem('ms_script_search', 'true');
                GM_setValue('search_task_heartbeat', Date.now()); // 设置心跳，避免定时检查误判
                location.href = `https://www.bing.com/search?q=${encodeURI(firstSearchWord)}&form=${randomString}&cvid=${randomCvid}`;
            }, 1000);
            return;
        }

        console.log('ℹ️ 普通访问，不执行任何操作');
    }

    // ==================== 搜索页面功能 ====================
    function handleSearchPage() {
        console.log('⚠ 在搜索页面');

        // 检查是否是脚本触发的搜索任务
        const isScriptSearch = sessionStorage.getItem('ms_script_search') === 'true';

        if (!isScriptSearch) {
            console.log('ℹ️ 这是用户手动搜索，不执行脚本搜索任务');
            return;
        }

        console.log('⚠ 执行主搜索任务');
        executeSearchTask();
    }

    // ==================== 定时任务功能 ====================
    function getTodayDateString() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function isScheduleTimeReached() {
        const parts = schedule_time.split(':');
        const targetHour = parseInt(parts[0], 10);
        const targetMinute = parseInt(parts[1], 10);
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const targetMinutes = targetHour * 60 + targetMinute;
        return nowMinutes >= targetMinutes;
    }

    // 判断搜索任务是否真的正在进行中（基于心跳，避免残留标记永久阻塞定时任务）
    function isTaskInProgress() {
        const heartbeat = GM_getValue('search_task_heartbeat', 0);
        const isFresh = heartbeat > 0 && (Date.now() - heartbeat) < SEARCH_TASK_TIMEOUT;

        if (isFresh) {
            return true; // 2小时内心跳仍在更新，任务确实在跑
        }

        // 心跳已过期：说明任务早已结束或中断，清除残留的"进行中"标记
        if (sessionStorage.getItem('ms_script_search') === 'true') {
            sessionStorage.removeItem('ms_script_search');
            console.log('🧹 定时任务：检测到过期的搜索标记，已自动清除（上次心跳:', heartbeat > 0 ? new Date(heartbeat).toLocaleString() : '无', '）');
        }
        return false;
    }

    function checkSchedule() {
        if (!schedule_enabled) return;

        // 正在执行搜索任务时不触发，避免打断进行中的任务
        if (isTaskInProgress()) {
            console.log('⏰ 定时检查：搜索任务正在进行中，跳过本次触发');
            return;
        }

        // 今天已经执行过定时任务则跳过
        const lastRunDate = GM_getValue('schedule_last_run_date', '');
        if (lastRunDate === getTodayDateString()) return;

        // 未到设定时间则跳过
        if (!isScheduleTimeReached()) {
            console.log('⏰ 定时任务未到执行时间，设定时间:', schedule_time);
            return;
        }

        // 到达时间，触发每日任务
        console.log('⏰ 定时任务触发，开始执行每日任务');
        GM_setValue('schedule_last_run_date', getTodayDateString());
        GM_setValue('search_cnt', 0);
        GM_setValue('search_completed', 'false');
        // 跳转到 Bing 首页，自动开始搜索任务
        location.href = "https://www.bing.com/?start_search=true";
    }

    // ==================== 主逻辑 ====================
    function main() {
        if (window.location.hostname === 'rewards.bing.com' || window.location.hostname === 'rewards.microsoft.com') {
            console.log('ℹ️ 已在 rewards 页面，本版本不执行任何操作');
        } else if (window.location.href.includes('/search') || window.location.href.includes('br_msg=Please-Wait')) {
            handleSearchPage();
        } else if (window.location.hostname === 'cn.bing.com' || window.location.hostname === 'www.bing.com' || window.location.hostname === 'bing.com') {
            handleBingHomePage();
        } else {
            console.log('⚠ 不在目标域名，脚本不执行');
        }
    }

    // ==================== 菜单命令 ====================
    GM_registerMenuCommand('开始搜索任务', function() {
        GM_setValue('search_cnt', 0);
        GM_setValue('search_completed', 'false');
        GM_setValue('search_task_heartbeat', Date.now()); // 设置心跳，避免定时检查误判任务中断
        // 跳转到 Bing 首页，然后会自动开始搜索任务
        location.href = "https://www.bing.com/?start_search=true";
        console.log('✅ 搜索任务已开始');
    }, 's');

    GM_registerMenuCommand('停止搜索任务', function() {
        GM_setValue('search_cnt', MAX_SEARCH_REWARDS + 10);
        // 同步清除心跳和搜索标记，避免残留心跳被判定为"任务进行中"而拦截定时触发
        GM_setValue('search_task_heartbeat', 0);
        sessionStorage.removeItem('ms_script_search');
        console.log('✅ 搜索任务已停止（心跳与搜索标记已清除）');
    }, 't');

    GM_registerMenuCommand('设置API Key', function() {
        const key = prompt('请输入API Key:', appkey);
        if (key !== null) {
            GM_setValue('ms_rewards_appkey', key);
            appkey = key;
            console.log('✅ API Key已设置');
        }
    }, 'k');

    GM_registerMenuCommand('申请API Key', function() {
        window.open('https://www.gmya.net/api', '_blank');
        console.log('✅ 已打开API申请页面');
    }, 'a');

    GM_registerMenuCommand('清除今日执行标记', function() {
        GM_setValue('search_completed', 'false');
        GM_setValue('search_cnt', 0);
        sessionStorage.removeItem('ms_script_search');
        console.log('✅ 已清除搜索执行标记，可以重新执行任务');
        alert('已清除搜索执行标记\n刷新页面后可以重新执行搜索任务');
    }, 'x');

    GM_registerMenuCommand('开启/关闭定时任务', function() {
        schedule_enabled = !schedule_enabled;
        GM_setValue('schedule_enabled', schedule_enabled);
        alert('定时任务已' + (schedule_enabled ? '开启 ✅\n每日执行时间: ' + schedule_time : '关闭 ❌'));
        console.log('定时任务状态:', schedule_enabled ? '开启' : '关闭');
    }, 'o');

    GM_registerMenuCommand('设置定时执行时间', function() {
        const t = prompt('请输入每日定时执行时间（24小时制 HH:mm，如 08:30）:', schedule_time);
        if (t === null) return;
        if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(t.trim())) {
            schedule_time = t.trim();
            GM_setValue('schedule_time', schedule_time);
            alert('✅ 定时执行时间已设置为 ' + schedule_time + '\n注意：需保持浏览器中有Bing页面（可以是后台标签页）才会触发');
            console.log('定时执行时间已更新:', schedule_time);
        } else {
            alert('❌ 时间格式不正确，请输入 HH:mm 格式，如 08:30');
        }
    }, 'm');

    GM_registerMenuCommand('查看定时任务状态', function() {
        const lastRun = GM_getValue('schedule_last_run_date', '从未执行');
        const heartbeat = GM_getValue('search_task_heartbeat', 0);
        let heartbeatText = '无';
        if (heartbeat > 0) {
            const elapsed = Date.now() - heartbeat;
            heartbeatText = new Date(heartbeat).toLocaleString() +
                '（' + Math.floor(elapsed / 60000) + '分钟前）' +
                (elapsed < SEARCH_TASK_TIMEOUT ? ' ✅ 任务进行中' : ' ⏹ 已过期（无任务进行）');
        }
        alert('定时任务状态：\n\n' +
              '开关：' + (schedule_enabled ? '开启 ✅' : '关闭 ❌') + '\n' +
              '每日执行时间：' + schedule_time + '\n' +
              '今日是否已执行：' + (lastRun === getTodayDateString() ? '是' : '否') + '\n' +
              '上次执行日期：' + lastRun + '\n' +
              '任务心跳：' + heartbeatText);
    }, 'v');

    // ==================== 初始化 ====================
    // 页面加载时立即检查一次定时任务（覆盖"浏览器晚于定时时间打开"的场景）
    checkSchedule();
    // 定时轮询检查（覆盖"页面一直保持打开"的场景）
    setInterval(checkSchedule, SCHEDULE_CHECK_INTERVAL);
    // 页面从后台休眠恢复/切回前台时立即检查（解决浏览器休眠标签页冻结定时器的问题）
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('👀 页面重新可见，立即检查定时任务');
            checkSchedule();
        }
    });

    getHotWords().then(names => {
        search_words = names;
        console.log('✅ 已获取搜索词，数量:', search_words.length);
        main();
    }).catch(error => {
        console.error('获取搜索词失败:', error);
        search_words = default_search_words;
        main();
    });

    console.log('=== 脚本初始化完成 ===');
})();
