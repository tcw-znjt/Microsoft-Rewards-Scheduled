# Microsoft-Rewards-Scheduled
[![version](https://img.shields.io/badge/python-3.4+-blue.svg)](https://www.python.org/download/releases/3.4.0/) 
[![status](https://img.shields.io/badge/status-stable-green.svg)](https://github.com/huaisha1224/Microsoft-Rewards)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![star, issue](https://img.shields.io/badge/star%2C%20issue-welcome-brightgreen.svg)](https://github.com/huaisha1224/Microsoft-Rewards)

赚取每日Microsoft Rewards积分的自动化解决方案

油猴脚本解决方案
- [Microsoft Bing Rewards每日任务脚本](https://greasyfork.org/zh-CN/scripts/477107)
- [移动端微软Rewards每日任务脚本](https://greasyfork.org/zh-CN/scripts/480355)


## 主要功能
-	通过Selenium 控制Chrome浏览器访问bing.com，完成每日的搜索任务，来获取Microsoft Rewards每日积分。
-	本项目直接操作Chrome浏览器，不需要用户提供Microsoft Rewards账户和密码，安全可靠。

## 基于原版 PCRewards.user.js (V5.1.0) 的定制版本：
-	新增每日定时任务系统（到点自动触发搜索，含开关/时间设置/状态查看菜单）
-	新增心跳守卫机制（2小时阈值，防任务中断残留永久卡死）
-	新增 visibilitychange 恢复兜底（页面从休眠/后台恢复时立即补检查）
-	兼容 rewards.microsoft.com 域名
-	搜索间隔调整为 5~6 分钟随机，最大搜索次数 45
-	停止搜索任务时同步清除心跳与搜索标记
-	移除每日活动/浏览卡片等自动跳转 rewards 页面的逻辑，仅保留搜索任务


## 运行环境

- [Python 3](https://www.python.org/)

## 第三方库
- [Selenium](https://www.selenium.dev/)

## 安装使用：

```
pip install -r requirements.txt
```

-	下载安装配置Chrome浏览器驱动

	在Chrome浏览器地址栏输入 'chrome://version/' 查看浏览器版本

-	下载对应版本的 ChromeDriver

	[Chromedriver](https://chromedriver.chromium.org/downloads)
