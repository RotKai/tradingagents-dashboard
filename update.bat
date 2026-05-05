@echo off
cd /d D:\tradingagents-skill\reports
git add .
set /p msg=请输入本次更新说明（直接回车用默认）: 
if "%msg%"=="" set msg=update
git commit -m "%msg%"
git push
echo.
echo 完成！1分钟后刷新网页查看。
pause