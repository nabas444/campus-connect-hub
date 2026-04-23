# Campus Connect Hub

[![Live Demo](https://img.shields.io/badge/Live-Demo-green?style=for-the-badge)](https://student-specs-fix.lovable.app/)

🌐 **Live Demo:** https://student-specs-fix.lovable.app/

A modern web platform designed to connect students, experts, and collaborators within a campus environment. The system enables users to discover experts, manage projects, communicate in real time, and handle support tickets — all in one unified interface.

---

## 🚀 Overview

Campus Connect Hub is a full-featured frontend application built with a modern tech stack. It focuses on improving collaboration, knowledge sharing, and productivity among students and professionals.

The platform provides:

* Expert discovery and reviews
* Real-time chat and communication
* Project and task management
* Ticketing/support system
* Notifications and activity tracking

---

## ✨ Key Features

### 👥 Expert System

* Browse and view expert profiles
* Ratings and reviews system
* Submit feedback via review forms

### 💬 Chat System

* Real-time messaging interface
* Chat panels for communication
* Designed for collaboration and quick discussions

### 📁 Project Management

* Create and manage projects
* Track project status using badges
* Organized project workflows

### 🎫 Ticketing System

* Submit and manage support tickets
* Status tracking for each ticket
* Structured issue handling

### 🔔 Notifications

* Notification bell component
* Real-time alerts for user activity

### 📊 Dashboard

* Sidebar navigation with modular pages
* Centralized user workspace
* Placeholder pages for future expansion

### 🎨 UI/UX

* Clean and responsive design
* Dark/Light mode support
* Built with reusable UI components

---

## 🛠️ Tech Stack

### Frontend

* React (TypeScript)
* Vite
* Tailwind CSS
* shadcn/ui + Radix UI

### State & Data

* React Query (@tanstack/react-query)
* React Hook Form + Zod (validation)

### Backend Integration

* Supabase (authentication, database, APIs)

### Additional Libraries

* React Router (routing)
* Recharts (data visualization)
* Lucide Icons

---

## 📂 Project Structure

```
src/
 ├── components/
 │   ├── chat/
 │   ├── dashboard/
 │   ├── experts/
 │   ├── landing/
 │   ├── notifications/
 │   ├── projects/
 │   ├── tickets/
 │   └── ui/
 │
 ├── App.tsx
 ├── main.tsx
 └── styles
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```
git clone <your-repo-url>
cd campus-connect-hub
```

### 2. Install dependencies

```
npm install
```

### 3. Configure environment variables

Create a `.env` file and add your Supabase credentials:

```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### 4. Run the development server

```
npm run dev
```

### 5. Build for production

```
npm run build
```

---

## 🧪 Testing

Run tests using:

```
npm run test
```

---

## 📌 Future Improvements

* Full backend logic integration
* Real-time updates using subscriptions
* Advanced search and filtering
* Role-based access control
* Mobile optimization

---

## 🤝 Contribution

Contributions are welcome. Feel free to fork the repository and submit pull requests.

---

## 📄 License

This project is for educational and development purposes.

---

## 💡 Summary

Campus Connect Hub is a scalable and modular platform that brings together communication, collaboration, and support tools into a single ecosystem — making it ideal for campus environments and student-driven projects.
