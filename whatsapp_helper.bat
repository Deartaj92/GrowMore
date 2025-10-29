@echo off
echo ========================================
echo    Free WhatsApp Bulk Message Helper
echo ========================================
echo.

echo This script will help you send WhatsApp messages manually
echo using your downloaded CSV file.
echo.

echo Step 1: Open WhatsApp Web (web.whatsapp.com)
echo Step 2: Scan QR code with your phone
echo Step 3: Press any key when ready...
pause

echo.
echo Now you can manually send messages using the phone numbers
echo from your CSV file. Here's how:
echo.
echo 1. Open your CSV file (attendance_notifications_*.csv)
echo 2. Copy phone numbers from the "Phone" column
echo 3. Copy messages from the "Message" column
echo 4. In WhatsApp Web, click "New Chat"
echo 5. Paste phone number and send message
echo 6. Repeat for each student
echo.

echo Press any key to open your CSV file...
pause

echo Opening CSV file...
start "" "attendance_notifications_*.csv"

echo.
echo ========================================
echo           Manual Process Tips
echo ========================================
echo.
echo 1. Format phone numbers as: +91XXXXXXXXXX
echo 2. Send messages during school hours (9 AM - 5 PM)
echo 3. Add 2-3 second delays between messages
echo 4. Keep messages short and professional
echo.
echo Press any key to exit...
pause

