# 🏎️ AirConsole-Style Car Game

A real-time car game where your phone is the controller! 

Built with **Angular** (Screen & Controller) and **Node.js + Socket.IO** (Backend).

## 📋 Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

## 🛠️ Setup & Installation

You need to install dependencies for all 3 parts of the project.

**1. Backend Server**
```bash
cd car-console/server
npm install
```

**2. Screen App (The Main Game)**
```bash
cd car-console/screen-app
npm install
```

**3. Controller App (The Mobile Gamepad)**
```bash
cd car-console/controller-app
npm install
```

---

## 🚀 How to Run

To play the game, you need to run all 3 components simultaneously in separate terminal windows.

### 1️⃣ Start the Backend Server
This acts as the bridge between the screen and the controller.
```bash
cd car-console/server
node index.js
```
> Server runs on **http://localhost:3333**

### 2️⃣ Start the Screen App
This is the main game view that you show on your desktop/TV.
```bash
cd car-console/screen-app
npx ng serve --port 4200
```
> Open **http://localhost:4200** in your browser.

### 3️⃣ Start the Controller App
This is the interface for your phone.
```bash
cd car-console/controller-app
npx ng serve --port 4201 --host 0.0.0.0
```
> **On your Phone:** Ensure your phone is on the same Wi-Fi as your computer.
> Scan the **QR Code** displayed on the Screen App to join instantly!
> *Alternatively, go to `http://<YOUR_PC_IP>:4201` and enter the Room Code manually.*

---

## 🎮 How to Play

1. **Launch**: Open the Screen App on your computer.
2. **Connect**: Scan the QR Code with your phone to open the Controller App.
3. **Calibrate**: Allow Gyroscope permissions if asked (iOS).
4. **Drive**: Tilt your phone **Left** or **Right** to steer the car.
5. **Dodge**: Avoid the 3D rocks on the road!
6. **Restart**: If you crash, tap the **"RESTART GAME"** button on your phone to try again.

---

## 🔧 Troubleshooting

- **"Permission Denied" on Phone**: If tilting doesn't work on iOS, tap the "Enable Gyro" button and allow motion access.
- **Can't Connect**: Make sure both devices are on the same Wi-Fi network and your firewall accepts connections on port 4201.
