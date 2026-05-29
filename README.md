# VPN-AWAKE

โปรเจกต์นี้ทำงานอย่างเดียว: เรียก URL keep-alive วนซ้ำ เพื่อช่วยให้ session ไม่หลุด

Target URL:
- http://10.21.31.9:8095/#/dmse0019

## ใช้งาน
1. เปิด Chrome ไปที่ `chrome://extensions`
2. เปิด `Developer mode`
3. กด `Load unpacked`
4. เลือกโฟลเดอร์ `D:\Dev\VPN-AWAKE`
5. Extension จะเริ่ม ping URL อัตโนมัติทุก 60 วินาทีขณะ Chrome เปิดอยู่

กดไอคอน `VPN Awake` บน Chrome เพื่อเปิด/ปิด, ปรับ URL, ปรับ interval, หรือ ping ทันที

หมายเหตุ: URL ที่มี `#/dmse0019` เป็น route ฝั่ง browser เท่านั้น ตอน extension ping ระบบจะยิง network request ไปที่ host เดียวกันพร้อม query `_vpn_awake` เพื่อให้เกิด traffic จริง

## ปรับความถี่
กดไอคอน extension แล้วแก้ช่อง `Interval`

## Log
ดูสถานะล่าสุดได้จาก popup ของ extension

