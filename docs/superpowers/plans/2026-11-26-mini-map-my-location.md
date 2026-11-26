# จุดตำแหน่งฉันในมินิแผนที่ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แสดงจุดสีฟ้าตามตำแหน่ง GPS บนมินิแผนที่ถนนจริง พร้อมระยะถึงหม้อแปลงและเสาที่ใกล้ที่สุด

**Architecture:** เพิ่มฟังก์ชันฝั่งหน้าเว็บใน `patrol-google/Index.html` ใช้ `navigator.geolocation.watchPosition` และ Leaflet บน `miniSurveyMap` ที่มีอยู่ ตำแหน่งเสาและหม้อแปลงมาจาก `miniNodeCoordinate(node)`

**Tech Stack:** Apps Script HTML, Leaflet, Playwright สำหรับตรวจ

**Spec:** `docs/superpowers/specs/2026-11-26-mini-map-my-location-design.md`

## Global Constraints
- แก้เฉพาะ `patrol-google/Index.html`; ไม่ส่งตำแหน่งผู้ใช้ไปเซิร์ฟเวอร์
- ระยะเป็นเส้นตรง (haversine) หน่วยเมตร ปัดเป็นจำนวนเต็ม

## Review Focus
- GPS ถูกปฏิเสธหรือไม่รองรับ: แสดงข้อความ ไม่มี error
- หม้อแปลงไม่มีพิกัด: บอก "ยังไม่มีพิกัดหม้อแปลง" และยังบอกเสาใกล้สุด
- ไม่มีเสาที่มีพิกัดเลย: ยังแสดงจุดตัวเองได้
- ปิดมินิแผนที่หรือสลับเป็นแผนผัง: หยุด watchPosition (clearWatch)
- ผู้ใช้เลื่อนแผนที่เอง: ตำแหน่งใหม่ไม่ดึงแผนที่กลับ

### Task 1: จุดตำแหน่งฉัน

**Files:**
- Modify: `patrol-google/Index.html` (แถบ `.miniToolbar`, `closeMiniSurveyMap`, `setMiniSurveyView`)
- Test: `patrol-google/check-mini-my-location.cjs` (fixture เดียวกับ `check-mini-geographic.cjs`)

**Interfaces:**
- Produces: `toggleMiniMyLocation()`, `stopMiniMyLocation()`, `miniDistanceMeters(a:[lat,lng], b:[lat,lng]) -> number`, ปุ่ม `#miniMyLocation` (`aria-pressed`), สถานะ `#miniMyLocationStatus`

- [ ] เขียน `check-mini-my-location.cjs`: ปุ่มสลับเป็นแผนที่ถนน, จุดและวงความคลาดเคลื่อน, ข้อความระยะ TR และเสาใกล้สุด, ไม่ดึงกลับหลัง dragstart, กดซ้ำกลับมาที่ตัวเรา/หยุด, ไม่มีพิกัดหม้อแปลง, ปฏิเสธ GPS, clearWatch เมื่อปิดหรือสลับแผนผัง
- [ ] รันให้เห็นว่าล้ม
- [ ] เขียนโค้ดใน `Index.html`
- [ ] รันเทสต์ทั้งชุด (ล้มอยู่ก่อนแล้วบน main: `check-mini-survey-map.cjs`, `check-survey-popup.cjs`)
- [ ] commit, push, วางลง Apps Script
