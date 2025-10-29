#!/usr/bin/env python3
"""
Free WhatsApp Bulk Message Sender
Uses WhatsApp Web automation with Selenium
Requires: pip install selenium webdriver-manager
"""

import csv
import time
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

class WhatsAppBulkSender:
    def __init__(self):
        self.driver = None
        self.wait = None
    
    def setup_driver(self):
        """Setup Chrome driver with WhatsApp Web"""
        options = webdriver.ChromeOptions()
        options.add_argument("--user-data-dir=./whatsapp_session")  # Save session
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.wait = WebDriverWait(self.driver, 20)
        
        # Open WhatsApp Web
        self.driver.get("https://web.whatsapp.com")
        print("Please scan QR code and press Enter when ready...")
        input()
    
    def send_message(self, phone_number, message):
        """Send message to a phone number"""
        try:
            # Format phone number (remove spaces, add country code if needed)
            phone = phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
            if len(phone) == 10:
                phone = "91" + phone  # Add India country code
            
            # Open chat with phone number
            chat_url = f"https://web.whatsapp.com/send?phone={phone}"
            self.driver.get(chat_url)
            
            # Wait for chat to load
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]')))
            
            # Type message
            message_box = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]')
            message_box.clear()
            message_box.send_keys(message)
            
            # Send message
            send_button = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="send"]')
            send_button.click()
            
            print(f"✅ Message sent to {phone}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send to {phone_number}: {str(e)}")
            return False
    
    def send_bulk_messages(self, csv_file_path, delay_min=2, delay_max=5):
        """Send messages from CSV file"""
        sent_count = 0
        failed_count = 0
        
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                phone = row['Phone']
                message = row['Message']
                
                # Send message
                if self.send_message(phone, message):
                    sent_count += 1
                else:
                    failed_count += 1
                
                # Random delay between messages
                delay = random.uniform(delay_min, delay_max)
                print(f"⏳ Waiting {delay:.1f} seconds...")
                time.sleep(delay)
        
        print(f"\n📊 Summary:")
        print(f"✅ Messages sent: {sent_count}")
        print(f"❌ Messages failed: {failed_count}")
    
    def close(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()

def main():
    print("🚀 Free WhatsApp Bulk Message Sender")
    print("=" * 40)
    
    # Get CSV file path
    csv_file = input("Enter path to your CSV file: ").strip()
    
    # Setup sender
    sender = WhatsAppBulkSender()
    
    try:
        # Setup driver and wait for QR scan
        sender.setup_driver()
        
        # Send messages
        sender.send_bulk_messages(csv_file)
        
    except KeyboardInterrupt:
        print("\n⏹️ Stopped by user")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    finally:
        sender.close()

if __name__ == "__main__":
    main()

