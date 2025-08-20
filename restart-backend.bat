@echo off
echo Stopping any running Spring Boot application...
taskkill /f /im java.exe 2>nul

echo.
echo Starting Spring Boot application...
echo.
mvn spring-boot:run

pause 